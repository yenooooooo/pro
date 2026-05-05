"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { decideApprovalAction } from "../actions";

type Props = {
  requestId: string;
  stepNo: number;
};

export function DecideButtons({ requestId, stepNo }: Props) {
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  function start(d: "approved" | "rejected") {
    setDecision(d);
    setShowCommentBox(true);
  }

  function commitDecision() {
    if (!decision) return;
    if (
      !window.confirm(
        decision === "approved" ? "승인하시겠습니까?" : "반려하시겠습니까?",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await decideApprovalAction({
        requestId,
        stepNo,
        decision,
        comment: comment.trim() || undefined,
      });
      if (!result.ok) {
        alert(`처리 실패: ${result.error}`);
      }
      setShowCommentBox(false);
      setDecision(null);
      setComment("");
    });
  }

  if (showCommentBox && decision) {
    return (
      <div className="flex flex-col items-end gap-2">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="결재 의견 (선택)"
          rows={2}
          className="w-64 resize-none rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-label-sm text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowCommentBox(false);
              setDecision(null);
            }}
            className="text-label-sm text-on-surface-variant hover:text-on-surface"
          >
            취소
          </button>
          <button
            type="button"
            onClick={commitDecision}
            disabled={pending}
            className={
              "inline-flex min-h-9 items-center gap-1 rounded-lg px-3 py-1.5 text-label-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 " +
              (decision === "approved"
                ? "bg-emerald-500 text-white"
                : "bg-error-soft text-on-primary")
            }
          >
            {pending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : decision === "approved" ? (
              <Check aria-hidden className="h-4 w-4" />
            ) : (
              <X aria-hidden className="h-4 w-4" />
            )}
            {decision === "approved" ? "승인 확정" : "반려 확정"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-shrink-0 gap-2">
      <button
        type="button"
        onClick={() => start("approved")}
        aria-label="승인"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 transition-colors hover:bg-emerald-500/20"
      >
        <Check aria-hidden className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => start("rejected")}
        aria-label="반려"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-error-soft/40 bg-error-soft/10 text-error-soft transition-colors hover:bg-error-soft/20"
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}
