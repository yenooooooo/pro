"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { decideLeaveRequestAction } from "../actions";

type Props = {
  requestId: string;
};

export function LeaveActions({ requestId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "approved" | "rejected") {
    if (!confirm(decision === "approved" ? "이 신청을 승인하시겠습니까?" : "이 신청을 반려하시겠습니까?")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await decideLeaveRequestAction({
        requestId,
        decision,
      });
      if (!result.ok) {
        setError(result.error);
        alert(`처리 실패: ${result.error}`);
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-1">
      {pending ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin text-on-surface-variant" />
      ) : (
        <>
          <button
            type="button"
            onClick={() => decide("approved")}
            aria-label="승인"
            disabled={pending}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
          >
            <Check aria-hidden className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => decide("rejected")}
            aria-label="반려"
            disabled={pending}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-error-soft/40 bg-error-soft/10 text-error-soft transition-colors hover:bg-error-soft/20 disabled:opacity-40"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </>
      )}
      {error ? (
        <span className="ml-2 hidden text-label-sm text-error-soft md:inline">
          {error}
        </span>
      ) : null}
    </div>
  );
}
