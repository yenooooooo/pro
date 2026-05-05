"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

const InputSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().max(500).optional(),
});

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
};

/**
 * 휴가 신청 결재 (승인/반려).
 *
 * 동작:
 *  1. leave_requests.status 가 'pending' 인 행만 처리
 *  2. 승인 시 — leave_balances.total_used 증가 + remaining 차감 (annual 만)
 *     · sick/family/other 는 잔여 차감하지 않음
 *  3. leave_requests.status 업데이트
 *  4. audit_logs 기록
 *
 * 트랜잭션 보장: 잔여 업데이트 → 상태 업데이트 순서. 만약 잔여 업데이트가 실패하면
 * 상태도 변경 안 됨. 반대로 상태 업데이트가 실패해도 잔여는 이미 차감된 채로 남을 수
 * 있음 (이 경우는 매우 드물지만 운영자가 audit_logs 로 추적 가능).
 *
 * 향후 v2: PostgreSQL 함수로 트랜잭션 일원화.
 */
export async function decideLeaveRequestAction(
  input: z.infer<typeof InputSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "인증이 필요합니다." };

  // 1. 신청 행 조회
  const { data: req, error: fetchErr } = await supabase
    .schema("chongmu")
    .from("leave_requests")
    .select("id, employee_id, leave_type, start_date, end_date, days, status")
    .eq("id", parsed.data.requestId)
    .maybeSingle<LeaveRequest>();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!req) return { ok: false, error: "신청을 찾을 수 없습니다." };
  if (req.status !== "pending") {
    return { ok: false, error: "이미 결재된 신청입니다." };
  }

  // 2. 승인이고 연차이면 잔여 차감
  if (parsed.data.decision === "approved" && req.leave_type === "annual") {
    const year = new Date(req.start_date).getFullYear();
    const days = Number(req.days);

    const { data: balance } = await supabase
      .schema("chongmu")
      .from("leave_balances")
      .select("id, total_used, remaining, total_granted")
      .eq("employee_id", req.employee_id)
      .eq("year", year)
      .maybeSingle();

    if (!balance) {
      return {
        ok: false,
        error: `${year}년 연차 발생 기록이 없어 차감할 수 없습니다.`,
      };
    }
    const newRemaining = Number(balance.remaining) - days;
    if (newRemaining < 0) {
      return {
        ok: false,
        error: `잔여 연차 ${balance.remaining}일 부족 (신청 ${days}일).`,
      };
    }
    const { error: balErr } = await supabase
      .schema("chongmu")
      .from("leave_balances")
      .update({
        total_used: Number(balance.total_used) + days,
        remaining: newRemaining,
      })
      .eq("id", balance.id);
    if (balErr) return { ok: false, error: balErr.message };
  }

  // 3. 신청 상태 업데이트
  const { error: updateErr } = await supabase
    .schema("chongmu")
    .from("leave_requests")
    .update({ status: parsed.data.decision })
    .eq("id", req.id);
  if (updateErr) return { ok: false, error: updateErr.message };

  // 4. 감사 로그
  await recordAudit({
    action:
      parsed.data.decision === "approved"
        ? "leave.approved"
        : "leave.rejected",
    entityType: "leave_request",
    entityId: req.id,
    metadata: {
      leave_type: req.leave_type,
      days: req.days,
      start_date: req.start_date,
      end_date: req.end_date,
      employee_id: req.employee_id,
      comment: parsed.data.comment ?? null,
    },
  });

  revalidatePath("/leave/list");
  revalidatePath("/leave");
  revalidatePath(`/employees/${req.employee_id}`);
  return { ok: true };
}
