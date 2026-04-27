"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockOpen } from "lucide-react";
import { toast } from "sonner";

type Props = {
  year: number;
  month: number;
  /** 확정 가능한 draft 행이 1건 이상이어야 활성. */
  draftCount: number;
};

type ConfirmResponse = {
  confirmed: number;
  error?: string;
};

export function ConfirmBatchButton({ year, month, draftCount }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  async function confirm() {
    if (pending) return;
    if (draftCount === 0) {
      toast.info("확정할 초안이 없습니다.");
      return;
    }
    if (
      !window.confirm(
        `${year}년 ${month}월 급여 ${draftCount}건을 확정합니다. 확정 후에는 자유롭게 재계산되지 않을 수 있습니다. 진행할까요?`,
      )
    ) {
      return;
    }
    setPending(true);
    const t = toast.loading(`${year}년 ${month}월 급여 확정 중…`);
    try {
      const res = await fetch("/api/payroll/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });
      const json = (await res.json()) as ConfirmResponse;
      if (!res.ok) {
        toast.error(`확정 실패: ${json.error ?? "알 수 없는 오류"}`, { id: t });
        return;
      }
      toast.success(`${json.confirmed}건 확정 완료`, { id: t });
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(`확정 실패: ${err instanceof Error ? err.message : String(err)}`, {
        id: t,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={confirm}
      disabled={pending || draftCount === 0}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-electric px-4 py-2 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LockOpen aria-hidden className="h-[18px] w-[18px]" />
      {pending ? "확정 중…" : `배치 확정${draftCount > 0 ? ` (${draftCount})` : ""}`}
    </button>
  );
}
