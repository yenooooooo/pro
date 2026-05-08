"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Coins, Loader2, XCircle, Trash2 } from "lucide-react";
import {
  settleTripAction,
  reimburseTripAction,
  cancelTripAction,
  deleteTripAction,
} from "../actions";

type Props = {
  tripId: string;
  status: string;
  budget: number;
  totalSettled: number;
  isOwnerOrAdmin?: boolean;
  isAdmin?: boolean;
};

export function TripActions({
  tripId,
  status,
  totalSettled,
  isOwnerOrAdmin = true,
  isAdmin = true,
}: Props) {
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

  function cancel() {
    if (!confirm("이 출장을 취소하시겠습니까? 영수증은 그대로 유지됩니다.")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelTripAction(tripId);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function remove() {
    if (
      !confirm(
        "정말 영구 삭제하시겠습니까? 영수증·정산 정보 모두 사라집니다. (감사 로그는 보존)",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteTripAction(tripId);
      if (result.ok) {
        router.push("/business-trips");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const cancellable =
    status === "requested" ||
    status === "approved" ||
    status === "in_progress";

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

      {/* 취소·삭제 버튼 */}
      {isOwnerOrAdmin && (
        <div className="flex flex-wrap gap-2">
          {cancellable ? (
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-label-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle aria-hidden className="h-4 w-4" />
              )}
              출장 취소
            </button>
          ) : null}

          {isAdmin ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-error-soft/40 bg-error-soft/10 px-3 py-1.5 text-label-sm font-semibold text-error-soft transition-colors hover:bg-error-soft/20 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 aria-hidden className="h-4 w-4" />
              )}
              영구 삭제
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="text-label-sm text-error-soft">{error}</p>
      ) : null}
    </div>
  );
}
