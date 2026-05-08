"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Coins, Loader2 } from "lucide-react";
import { settleTripAction, reimburseTripAction } from "../actions";

type Props = {
  tripId: string;
  status: string;
  budget: number;
  totalSettled: number;
};

export function TripActions({ tripId, status, totalSettled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function settle() {
    if (totalSettled === 0) {
      setError("영수증이 등록되지 않았습니다.");
      return;
    }
    if (!confirm("정산을 완료하시겠습니까? 이후 영수증 추가/수정 불가.")) return;
    setError(null);
    startTransition(async () => {
      const result = await settleTripAction({ trip_id: tripId });
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function reimburse() {
    if (!confirm("환급 완료 처리하시겠습니까? 출장이 종료됩니다.")) return;
    setError(null);
    startTransition(async () => {
      const result = await reimburseTripAction(tripId);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {(status === "requested" ||
        status === "approved" ||
        status === "in_progress") && (
        <button
          type="button"
          onClick={settle}
          disabled={pending}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-3 py-1.5 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden className="h-4 w-4" />
          )}
          정산 완료
        </button>
      )}

      {status === "settled" && (
        <button
          type="button"
          onClick={reimburse}
          disabled={pending}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-label-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Coins aria-hidden className="h-4 w-4" />
          )}
          환급 완료 처리
        </button>
      )}

      {error ? (
        <p className="text-label-sm text-error-soft">{error}</p>
      ) : null}
    </div>
  );
}
