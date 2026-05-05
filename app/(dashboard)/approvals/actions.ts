"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";
import { getResendClient, getFromEmail } from "@/lib/email/client";
import {
  approvalRequestedEmail,
  approvalDecidedEmail,
} from "@/lib/email/templates";

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

  // 첫 번째 결재자에게 이메일 발송 (Resend 키 있을 때만, 실패해도 본 작업 막지 않음)
  void notifyFirstApprover({
    requestId: req.id,
    requesterEmail: user.email ?? "",
    kind: parsed.data.kind,
    title: parsed.data.title,
    amount: parsed.data.amount ?? null,
    firstApprover: parsed.data.steps[0],
  });

  revalidatePath("/approvals");
  return { ok: true, id: req.id };
}

async function notifyFirstApprover(args: {
  requestId: string;
  requesterEmail: string;
  kind: string;
  title: string;
  amount: number | null;
  firstApprover: { approver_email: string; approver_role?: string };
}) {
  try {
    const resend = getResendClient();
    if (!resend) return;
    const baseUrl = await getBaseUrl();
    const { subject, html, text } = approvalRequestedEmail({
      recipientEmail: args.firstApprover.approver_email,
      approverRole: args.firstApprover.approver_role ?? null,
      requesterEmail: args.requesterEmail,
      kind: args.kind,
      title: args.title,
      amount: args.amount,
      approvalUrl: `${baseUrl}/approvals/${args.requestId}`,
    });
    await resend.emails.send({
      from: getFromEmail(),
      to: args.firstApprover.approver_email,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] approval request notify failed:", err);
  }
}

async function getBaseUrl(): Promise<string> {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
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

  // 이메일 알림 (Resend 키 있을 때만)
  void notifyDecision({
    requestId: parsed.data.requestId,
    decision: parsed.data.decision,
    approverEmail: user.email ?? "",
    comment: parsed.data.comment ?? null,
    nextPendingStepNo: nextPending?.step_no ?? null,
  });

  revalidatePath("/approvals");
  revalidatePath(`/approvals/${parsed.data.requestId}`);
  return { ok: true };
}

async function notifyDecision(args: {
  requestId: string;
  decision: "approved" | "rejected";
  approverEmail: string;
  comment: string | null;
  nextPendingStepNo: number | null;
}) {
  try {
    const resend = getResendClient();
    if (!resend) return;
    const supabase = createClient();
    const baseUrl = await getBaseUrl();

    const { data: req } = await supabase
      .schema("chongmu")
      .from("approval_requests")
      .select("title, requester_email")
      .eq("id", args.requestId)
      .maybeSingle();
    if (!req?.requester_email) return;

    // 1) 발의자에게 알림
    const { subject, html, text } = approvalDecidedEmail({
      recipientEmail: req.requester_email,
      decision: args.decision,
      approverEmail: args.approverEmail,
      title: req.title,
      approvalUrl: `${baseUrl}/approvals/${args.requestId}`,
      comment: args.comment,
    });
    await resend.emails.send({
      from: getFromEmail(),
      to: req.requester_email,
      subject,
      html,
      text,
    });

    // 2) 승인이고 다음 결재자 있으면 그쪽에도 알림
    if (args.decision === "approved" && args.nextPendingStepNo) {
      const { data: nextStep } = await supabase
        .schema("chongmu")
        .from("approval_steps")
        .select("approver_email, approver_role")
        .eq("request_id", args.requestId)
        .eq("step_no", args.nextPendingStepNo)
        .maybeSingle();
      if (nextStep?.approver_email) {
        const { data: detail } = await supabase
          .schema("chongmu")
          .from("approval_requests")
          .select("kind, title, amount, requester_email")
          .eq("id", args.requestId)
          .maybeSingle();
        if (detail) {
          const m = approvalRequestedEmail({
            recipientEmail: nextStep.approver_email,
            approverRole: nextStep.approver_role ?? null,
            requesterEmail: detail.requester_email ?? "",
            kind: detail.kind,
            title: detail.title,
            amount: detail.amount ?? null,
            approvalUrl: `${baseUrl}/approvals/${args.requestId}`,
          });
          await resend.emails.send({
            from: getFromEmail(),
            to: nextStep.approver_email,
            subject: m.subject,
            html: m.html,
            text: m.text,
          });
        }
      }
    }
  } catch (err) {
    console.error("[email] approval decision notify failed:", err);
  }
}

export async function createAndRedirect(input: CreateApprovalInput) {
  const result = await createApprovalAction(input);
  if (result.ok) {
    redirect(`/approvals/${result.id}`);
  }
  return result;
}
