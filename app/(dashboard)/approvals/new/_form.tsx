"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, AlertCircle, Save } from "lucide-react";
import { createApprovalAction, type CreateApprovalInput } from "../actions";

const KIND_OPTIONS = [
  { value: "expense", label: "지출" },
  { value: "purchase", label: "구매" },
  { value: "business_trip", label: "출장" },
  { value: "general", label: "일반" },
] as const;

export function ApprovalForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<CreateApprovalInput["kind"]>("expense");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [steps, setSteps] = useState<
    { approver_email: string; approver_role: string }[]
  >([{ approver_email: "", approver_role: "팀장" }]);

  function addStep() {
    if (steps.length >= 5) return;
    setSteps([...steps, { approver_email: "", approver_role: "" }]);
  }
  function removeStep(idx: number) {
    if (steps.length === 1) return;
    setSteps(steps.filter((_, i) => i !== idx));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }
    if (steps.some((s) => !s.approver_email.trim())) {
      setError("모든 결재자 이메일을 입력하세요.");
      return;
    }
    startTransition(async () => {
      const result = await createApprovalAction({
        kind,
        title: title.trim(),
        description: description.trim() || undefined,
        amount: kind === "expense" || kind === "purchase" ? amount : undefined,
        steps: steps.map((s) => ({
          approver_email: s.approver_email.trim(),
          approver_role: s.approver_role.trim() || undefined,
        })),
      });
      if (result.ok) {
        router.push(`/approvals/${result.id}` as never);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="glass-panel rounded-xl p-6 space-y-4">
        <h2 className="text-headline-md font-semibold text-on-surface">
          기본 정보
        </h2>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface-variant">
            결재 유형 *
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            {KIND_OPTIONS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                aria-pressed={kind === k.value}
                className={
                  "rounded-md px-3 py-1.5 text-data-tabular transition-colors " +
                  (kind === k.value
                    ? "bg-primary-electric text-on-primary"
                    : "border border-outline-variant/40 bg-surface-container-low text-on-surface hover:bg-surface-container-high")
                }
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface-variant">
            제목 *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 4월 협력사 미팅 출장비"
            className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
          />
        </div>

        {(kind === "expense" || kind === "purchase") && (
          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              금액 (원)
            </label>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-data-tabular tabular-nums text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>
        )}

        <div>
          <label className="block text-label-sm font-semibold text-on-surface-variant">
            상세 사유
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="발의 사유와 근거를 자세히 기재하세요."
            className="mt-1 w-full resize-y rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
          />
        </div>
      </section>

      <section className="glass-panel rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-md font-semibold text-on-surface">
            결재선
          </h2>
          <button
            type="button"
            onClick={addStep}
            disabled={steps.length >= 5}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-1.5 text-label-sm text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
          >
            <Plus aria-hidden className="h-4 w-4" />
            단계 추가
          </button>
        </div>
        <p className="text-label-sm text-on-surface-variant">
          최대 5단계. 위에서 아래 순으로 결재됩니다.
        </p>

        <ul className="space-y-3">
          {steps.map((s, idx) => (
            <li
              key={idx}
              className="flex items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3"
            >
              <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-electric/15 text-label-sm font-bold text-primary-electric">
                {idx + 1}
              </span>
              <input
                type="email"
                value={s.approver_email}
                onChange={(e) => {
                  const next = [...steps];
                  next[idx].approver_email = e.target.value;
                  setSteps(next);
                }}
                placeholder="결재자 이메일"
                className="flex-1 min-h-11 rounded-lg border border-outline-variant/40 bg-surface-container px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
              />
              <input
                value={s.approver_role}
                onChange={(e) => {
                  const next = [...steps];
                  next[idx].approver_role = e.target.value;
                  setSteps(next);
                }}
                placeholder="역할 (예: 팀장)"
                className="w-32 min-h-11 rounded-lg border border-outline-variant/40 bg-surface-container px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
              />
              <button
                type="button"
                onClick={() => removeStep(idx)}
                disabled={steps.length === 1}
                aria-label="단계 삭제"
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-error-soft/10 hover:text-error-soft disabled:opacity-30"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div aria-live="polite" className="flex-1">
          {error ? (
            <p className="inline-flex items-center gap-1 text-body-md text-error-soft">
              <AlertCircle aria-hidden className="h-4 w-4" />
              {error}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-5 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden className="h-4 w-4" />
          )}
          발의
        </button>
      </div>
    </form>
  );
}
