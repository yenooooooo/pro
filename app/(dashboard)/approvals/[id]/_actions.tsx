"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, XCircle, Loader2 } from "lucide-react";
import {
  cancelApprovalAction,
  deleteApprovalAction,
} from "../actions";

type Props = {
  requestId: string;
  status: string;
  isOwnerOrAdmin: boolean;
  isAdmin: boolean;
};

export function ApprovalDangerActions({
  requestId,
  status,
  isOwnerOrAdmin,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cancellable = status === "draft" || status === "pending";

  function cancel() {
    if (!confirm("이 결재를 취소하시겠습니까? 이력은 보존됩니다.")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelApprovalAction(requestId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function remove() {
    if (
      !confirm(
        "정말 영구 삭제하시겠습니까? 결재선과 결재 이력 모두 사라집니다. (감사 로그는 보존)",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteApprovalAction(requestId);
      if (result.ok) {
        router.push("/approvals");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!isOwnerOrAdmin) return null;

  return (
    <div className="flex flex-col items-end gap-2">
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
            결재 취소
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
            영구 삭제 (admin)
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-label-sm text-error-soft">{error}</p>
      ) : null}
    </div>
  );
}
