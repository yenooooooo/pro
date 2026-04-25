"use client";

import { useTransition } from "react";
import { Loader2, UserMinus } from "lucide-react";
import { resignEmployeeAction } from "@/lib/employees/actions";

export function ResignButton({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [pending, start] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      `${employeeName} 직원을 퇴사 처리하시겠습니까?\n\n` +
        `급여·근태 기록은 보존되며 직원 디렉토리에서만 제외됩니다.\n` +
        `이 작업은 즉시 반영됩니다.`,
    );
    if (!confirmed) return;
    start(async () => {
      await resignEmployeeAction(employeeId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-error-container/40 bg-error-soft/10 px-4 text-label-sm text-error-soft transition-colors hover:bg-error-soft/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          처리 중…
        </>
      ) : (
        <>
          <UserMinus aria-hidden className="h-4 w-4" />
          퇴사 처리
        </>
      )}
    </button>
  );
}
