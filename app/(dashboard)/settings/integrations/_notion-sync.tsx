"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Check, AlertCircle } from "lucide-react";

export function NotionSyncButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { ok: true; synced: number; failed: number; total: number }
    | { ok: false; error: string }
    | null
  >(null);

  function sync() {
    if (
      !confirm(
        "Notion 데이터베이스로 직원 명부를 동기화하시겠습니까? 직원 수만큼 행이 추가됩니다 (중복 검사 미지원, 수동 정리 필요).",
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/integrations/notion/sync-employees", {
          method: "POST",
        });
        const json = await res.json();
        if (json.ok) {
          setResult({
            ok: true,
            synced: json.synced,
            failed: json.failed,
            total: json.total,
          });
        } else {
          setResult({ ok: false, error: json.error ?? "동기화 실패" });
        }
      } catch (err) {
        setResult({
          ok: false,
          error: err instanceof Error ? err.message : "네트워크 오류",
        });
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-5 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw aria-hidden className="h-4 w-4" />
        )}
        지금 동기화
      </button>

      {result?.ok ? (
        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-label-sm text-emerald-300">
          <Check aria-hidden className="h-4 w-4" />
          {result.synced} / {result.total}명 동기화 완료
          {result.failed > 0 ? ` (${result.failed}건 실패)` : ""}
        </div>
      ) : null}

      {result?.ok === false ? (
        <div className="inline-flex items-center gap-2 rounded-lg border border-error-soft/30 bg-error-soft/5 px-3 py-2 text-label-sm text-error-soft">
          <AlertCircle aria-hidden className="h-4 w-4" />
          {result.error}
        </div>
      ) : null}
    </div>
  );
}
