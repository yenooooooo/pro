"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Props = {
  year: number;
  month: number;
  /** 이미 계산된 행이 있으면 "재계산"으로 보조 라벨 변경. */
  hasExisting: boolean;
};

type CalculateResponse = {
  processed: number;
  skipped: number;
  error?: string;
};

export function BatchRunButtons({ year, month, hasExisting }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<"run" | "rerun" | null>(null);
  const [, startTransition] = useTransition();

  async function trigger(kind: "run" | "rerun") {
    setPending(kind);
    const verb = kind === "run" ? "계산" : "재계산";
    const t = toast.loading(`${year}년 ${month}월 급여 ${verb} 중…`);
    try {
      const res = await fetch("/api/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });
      const json = (await res.json()) as CalculateResponse;
      if (!res.ok) {
        toast.error(`${verb} 실패: ${json.error ?? "알 수 없는 오류"}`, { id: t });
        return;
      }
      const skip = json.skipped > 0 ? ` · 검토필요 ${json.skipped}건` : "";
      toast.success(`${verb} 완료 — ${json.processed}건${skip}`, { id: t });
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(`${verb} 실패: ${err instanceof Error ? err.message : String(err)}`, {
        id: t,
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => trigger("rerun")}
        disabled={pending !== null || !hasExisting}
        className="group flex min-h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container py-2.5 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-bright disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          aria-hidden
          className={
            "h-4 w-4 transition-transform duration-500 " +
            (pending === "rerun" ? "animate-spin" : "group-hover:rotate-180")
          }
        />
        재계산
      </button>
      <button
        type="button"
        onClick={() => trigger("run")}
        disabled={pending !== null}
        className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary-electric/40 bg-primary-electric/10 py-2.5 text-label-sm font-semibold text-primary-electric transition-colors hover:bg-primary-electric/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Play aria-hidden className="h-4 w-4" />
        {pending === "run" ? "실행 중…" : "실행"}
      </button>
    </div>
  );
}
