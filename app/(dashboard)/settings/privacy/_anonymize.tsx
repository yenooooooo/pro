"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileX, Loader2 } from "lucide-react";
import { anonymizeEmployeeAction } from "./actions";

type Props = {
  employeeId: string;
  employeeName: string;
};

export function AnonymizeButton({ employeeId, employeeName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !confirm(
        `${employeeName} 직원의 개인정보를 익명화 처리하시겠습니까?\n\n` +
          `이름·이메일·전화·계좌가 마스킹되며 audit log 만 보존됩니다.\n` +
          `이 작업은 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await anonymizeEmployeeAction({ employeeId });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-error-soft/40 bg-error-soft/10 px-3 py-1.5 text-label-sm font-semibold text-error-soft transition-colors hover:bg-error-soft/20 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <FileX aria-hidden className="h-4 w-4" />
        )}
        익명화
      </button>
      {error ? (
        <p className="text-label-sm text-error-soft">{error}</p>
      ) : null}
    </div>
  );
}
