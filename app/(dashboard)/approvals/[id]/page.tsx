import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X, Clock, FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DecideButtons } from "./_decide";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  expense: "지출",
  purchase: "구매",
  business_trip: "출장",
  general: "일반",
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  draft: { label: "작성중", tone: "border-outline-variant/40 bg-surface-container-high text-on-surface-variant" },
  pending: { label: "결재중", tone: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  approved: { label: "승인", tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  rejected: { label: "반려", tone: "border-error-soft/40 bg-error-soft/10 text-error-soft" },
  cancelled: { label: "취소", tone: "border-outline-variant/40 bg-surface-container-high text-on-surface-variant" },
};

type Request = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  amount: number | null;
  requester_email: string | null;
  status: string;
  current_step: number;
  created_at: string;
  completed_at: string | null;
};

type Step = {
  id: string;
  step_no: number;
  approver_email: string;
  approver_role: string | null;
  status: string;
  comment: string | null;
  decided_at: string | null;
};

export default async function ApprovalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: req } = await supabase
    .schema("chongmu")
    .from("approval_requests")
    .select(
      "id, kind, title, description, amount, requester_email, status, current_step, created_at, completed_at",
    )
    .eq("id", params.id)
    .maybeSingle<Request>();

  if (!req) notFound();

  const { data: steps } = await supabase
    .schema("chongmu")
    .from("approval_steps")
    .select("id, step_no, approver_email, approver_role, status, comment, decided_at")
    .eq("request_id", params.id)
    .order("step_no", { ascending: true })
    .returns<Step[]>();

  const status = STATUS_LABEL[req.status] ?? STATUS_LABEL.draft;

  return (
    <div className="space-y-stack-lg">
      <Link
        href="/approvals"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        결재 목록
      </Link>

      <header className="glass-panel rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                {KIND_LABEL[req.kind] ?? req.kind}
              </span>
              <span
                className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${status.tone}`}
              >
                {status.label}
              </span>
            </div>
            <h1 className="text-headline-lg font-semibold text-on-surface">
              {req.title}
            </h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              발의자: <span className="text-on-surface">{req.requester_email ?? "—"}</span>
              {" · "}
              발의일: <span className="tabular-nums">{req.created_at.slice(0, 10)}</span>
              {req.completed_at ? (
                <>
                  {" · "}완료일:{" "}
                  <span className="tabular-nums">{req.completed_at.slice(0, 10)}</span>
                </>
              ) : null}
            </p>
          </div>
          {req.amount ? (
            <div className="text-right">
              <p className="text-label-sm text-on-surface-variant">금액</p>
              <p className="text-headline-md font-bold tabular-nums text-on-surface">
                {req.amount.toLocaleString("ko-KR")}원
              </p>
            </div>
          ) : null}
        </div>

        {req.description ? (
          <div className="mt-4 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
            <p className="mb-1 text-label-sm uppercase tracking-widest text-on-surface-variant">
              상세 사유
            </p>
            <p className="whitespace-pre-wrap text-body-md text-on-surface">
              {req.description}
            </p>
          </div>
        ) : null}
      </header>

      <section className="glass-panel rounded-xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-headline-md font-semibold text-on-surface">
          <FileSignature aria-hidden className="h-5 w-5 text-primary-electric" />
          결재선 진행
        </h2>
        <ol className="space-y-3">
          {(steps ?? []).map((s) => {
            const isPending = s.status === "pending";
            const isCurrentStep = isPending && s.step_no === req.current_step && req.status === "pending";
            return (
              <li
                key={s.id}
                className={
                  "rounded-lg border p-4 " +
                  (isCurrentStep
                    ? "border-primary-electric/50 bg-primary-electric/5"
                    : s.status === "approved"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : s.status === "rejected"
                        ? "border-error-soft/30 bg-error-soft/5"
                        : "border-outline-variant/30 bg-surface-container-low")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={
                        "inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-bold " +
                        (s.status === "approved"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : s.status === "rejected"
                            ? "bg-error-soft/20 text-error-soft"
                            : isCurrentStep
                              ? "bg-primary-electric text-on-primary"
                              : "bg-surface-container-high text-on-surface-variant")
                      }
                    >
                      {s.status === "approved" ? (
                        <Check aria-hidden className="h-5 w-5" />
                      ) : s.status === "rejected" ? (
                        <X aria-hidden className="h-5 w-5" />
                      ) : isCurrentStep ? (
                        <Clock aria-hidden className="h-5 w-5" />
                      ) : (
                        s.step_no
                      )}
                    </span>
                    <div>
                      <p className="font-medium text-on-surface">
                        {s.approver_role ?? `${s.step_no}단계`}
                      </p>
                      <p className="text-label-sm text-on-surface-variant">
                        {s.approver_email}
                      </p>
                      {s.comment ? (
                        <p className="mt-2 rounded border border-outline-variant/20 bg-surface-container px-3 py-1.5 text-label-sm text-on-surface-variant">
                          💬 {s.comment}
                        </p>
                      ) : null}
                      {s.decided_at ? (
                        <p className="mt-1 text-label-sm text-on-surface-variant/70 tabular-nums">
                          {s.decided_at.slice(0, 16).replace("T", " ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {isCurrentStep ? (
                    <DecideButtons
                      requestId={req.id}
                      stepNo={s.step_no}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
