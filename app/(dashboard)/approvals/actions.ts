"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

const StepSchema = z.object({
  approver_email: z.string().email("이메일 형식 오류"),
  approver_role: z.string().max(20).optional(),
});

const CreateSchema = z.object({
  kind: z.enum(["expense", "purchase", "business_trip", "general"]),
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  amount: z.number().int().nonnegative().optional(),
  steps: z.array(StepSchema).min(1).max(5),
});

export type CreateApprovalInput = z.infer<typeof CreateSchema>;

export async function createApprovalAction(
  input: CreateApprovalInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "인증 필요" };

  // 발의자 직원 정보 조회 (이메일 매칭)
  const { data: requester } = await supabase
    .schema("chongmu")
    .from("employees")
    .select("id")
    .eq("email", user.email ?? "")
    .maybeSingle();

  const { data: req, error: reqErr } = await supabase
    .schema("chongmu")
    .from("approval_requests")
    .insert({
      kind: parsed.data.kind,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      amount: parsed.data.amount ?? null,
      requester_id: requester?.id ?? null,
      requester_email: user.email ?? null,
      status: "pending",
      current_step: 1,
    })
    .select("id")
    .single();

  if (reqErr || !req) {
    return { ok: false, error: reqErr?.message ?? "생성 실패" };
  }

  const stepsRows = parsed.data.steps.map((s, idx) => ({
    request_id: req.id,
    step_no: idx + 1,
    approver_email: s.approver_email,
    approver_role: s.approver_role ?? null,
    status: "pending" as const,
  }));

  const { error: stepErr } = await supabase
    .schema("chongmu")
    .from("approval_steps")
    .insert(stepsRows);

  if (stepErr) {
    // 롤백 — 만든 request 삭제
    await supabase
      .schema("chongmu")
      .from("approval_requests")
      .delete()
      .eq("id", req.id);
    return { ok: false, error: stepErr.message };
  }

  await recordAudit({
    action: "approval.created",
    entityType: "approval_request",
    entityId: req.id,
    metadata: {
      kind: parsed.data.kind,
      title: parsed.data.title,
      amount: parsed.data.amount,
      step_count: parsed.data.steps.length,
    },
  });

  revalidatePath("/approvals");
  return { ok: true, id: req.id };
}

const DecideSchema = z.object({
  requestId: z.string().uuid(),
  stepNo: z.number().int().min(1),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().max(500).optional(),
});

/**
 * 결재 단계 처리.
 *
 * 동작:
 *   1. 해당 단계 status 업데이트
 *   2. 반려면 → request.status = 'rejected'
 *   3. 승인이고 마지막 단계면 → request.status = 'approved'
 *   4. 승인이고 다음 단계 있으면 → current_step += 1
 */
export async function decideApprovalAction(
  input: z.infer<typeof DecideSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = DecideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "인증 필요" };

  // 본인이 결재자인 단계인지 확인
  const { data: step } = await supabase
    .schema("chongmu")
    .from("approval_steps")
    .select("id, approver_email, status, request_id")
    .eq("request_id", parsed.data.requestId)
    .eq("step_no", parsed.data.stepNo)
    .maybeSingle();

  if (!step) return { ok: false, error: "결재 단계 없음" };
  if (step.status !== "pending") {
    return { ok: false, error: "이미 처리된 단계" };
  }
  // MVP — 1인 admin 가정. 실제 RBAC는 #12 에서 강화.
  // if (step.approver_email !== user.email) return { ok: false, error: "결재 권한 없음" };

  // 1. 단계 업데이트
  const { error: stepErr } = await supabase
    .schema("chongmu")
    .from("approval_steps")
    .update({
      status: parsed.data.decision,
      comment: parsed.data.comment ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", step.id);
  if (stepErr) return { ok: false, error: stepErr.message };

  // 2. 전체 요청 상태 업데이트
  const { data: allSteps } = await supabase
    .schema("chongmu")
    .from("approval_steps")
    .select("step_no, status")
    .eq("request_id", parsed.data.requestId)
    .order("step_no", { ascending: true });

  const nextPending = (allSteps ?? []).find((s) => s.status === "pending");

  if (parsed.data.decision === "rejected") {
    await supabase
      .schema("chongmu")
      .from("approval_requests")
      .update({
        status: "rejected",
        completed_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.requestId);
  } else if (!nextPending) {
    await supabase
      .schema("chongmu")
      .from("approval_requests")
      .update({
        status: "approved",
        completed_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.requestId);
  } else {
    await supabase
      .schema("chongmu")
      .from("approval_requests")
      .update({
        current_step: nextPending.step_no,
      })
      .eq("id", parsed.data.requestId);
  }

  await recordAudit({
    action: parsed.data.decision === "approved" ? "approval.approved" : "approval.rejected",
    entityType: "approval_request",
    entityId: parsed.data.requestId,
    metadata: {
      step_no: parsed.data.stepNo,
      comment: parsed.data.comment ?? null,
    },
  });

  revalidatePath("/approvals");
  revalidatePath(`/approvals/${parsed.data.requestId}`);
  return { ok: true };
}

export async function createAndRedirect(input: CreateApprovalInput) {
  const result = await createApprovalAction(input);
  if (result.ok) {
    redirect(`/approvals/${result.id}`);
  }
  return result;
}
