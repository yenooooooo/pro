"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[dashboard error]", error);
    }
  }, [error]);

  return (
    <div className="glass-panel mx-auto mt-12 max-w-xl p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle aria-hidden className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-headline-md text-on-surface">문제가 발생했어요</h2>
      <p className="mt-2 text-body-md text-on-surface-variant">
        잠시 후 다시 시도해 주세요. 문제가 반복되면 관리자에게 문의해 주세요.
      </p>
      {error.digest && (
        <p className="mt-3 text-label-sm uppercase tracking-widest text-on-surface-variant/60">
          ref · {error.digest}
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-body-md font-semibold text-on-primary transition-all duration-200 hover:opacity-90"
      >
        다시 시도
      </button>
    </div>
  );
}
