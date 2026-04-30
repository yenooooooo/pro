"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Upload,
} from "lucide-react";
import { importEmployeesXlsxAction, type ImportSummary } from "@/lib/employees/import";

export function EmployeeImportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSummary(null);
    startTransition(async () => {
      const result = await importEmployeesXlsxAction(fd);
      setSummary(result);
      if (!result.fatal && result.inserted > 0) {
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className="space-y-stack-lg">
      <section className="glass-panel rounded-xl p-6">
        <header className="mb-4">
          <h3 className="text-headline-md font-semibold text-on-surface">엑셀 형식</h3>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            첫 행은 헤더. 컬럼 순서는 자유. 부서·직급은 이미 등록된 이름과 정확히 일치해야 합니다.
          </p>
        </header>
        <div className="space-y-3">
          <ul className="space-y-1 text-label-sm text-on-surface-variant">
            <li>· <strong>필수</strong>: 사번, 이름, 부서, 직급, 입사일(YYYY-MM-DD), 기본급</li>
            <li>· <strong>선택</strong>: 부양가족(1~11, 기본 1), 생년월일, 전화, 이메일, 은행, 계좌</li>
            <li>· 동일 사번이 이미 있으면 해당 행은 <strong>건너뜀</strong>(덮어쓰지 않음).</li>
            <li>· 최대 10MB.</li>
          </ul>
          <a
            href="/templates/employees-template.xlsx"
            download
            className="inline-flex min-h-11 items-center gap-2 rounded border border-primary-container/40 bg-primary-container/20 px-4 text-label-sm font-medium text-primary transition-colors hover:bg-primary-container/30"
          >
            <Download aria-hidden className="h-4 w-4" />
            양식 다운로드 (.xlsx)
          </a>
        </div>
      </section>

      <form ref={formRef} onSubmit={onSubmit} className="glass-panel space-y-4 rounded-xl p-6">
        <div>
          <label className="block text-label-sm font-medium text-on-surface-variant">
            엑셀 파일
          </label>
          <input
            type="file"
            name="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            className="mt-2 block w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-on-surface file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-on-primary"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              가져오는 중…
            </>
          ) : (
            <>
              <Upload aria-hidden className="h-4 w-4" />
              가져오기
            </>
          )}
        </button>
      </form>

      {summary?.fatal && (
        <div className="glass-panel flex items-start gap-3 rounded-xl border border-destructive/40 p-4">
          <AlertCircle aria-hidden className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
          <div>
            <p className="text-body-md font-semibold text-destructive">가져오기 실패</p>
            <p className="mt-1 text-body-md text-on-surface-variant">{summary.fatal}</p>
          </div>
        </div>
      )}

      {summary && !summary.fatal && (
        <div className="glass-panel rounded-xl p-6">
          <header className="mb-4 flex items-center gap-2">
            <CheckCircle2 aria-hidden className="h-5 w-5 text-emerald-400" />
            <h3 className="text-headline-md font-semibold text-on-surface">결과</h3>
          </header>
          <div className="grid grid-cols-3 gap-4 text-data-tabular">
            <Stat label="총 행" value={summary.totalRows} />
            <Stat label="등록됨" value={summary.inserted} tone="success" />
            <Stat label="건너뜀" value={summary.skipped.length} tone="warn" />
          </div>
          {summary.skipped.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-outline-variant/30">
              <table className="w-full text-data-tabular">
                <thead className="sticky top-0 bg-surface-container-high">
                  <tr className="text-left text-label-sm uppercase tracking-widest text-on-surface-variant">
                    <th className="px-3 py-2">행</th>
                    <th className="px-3 py-2">사유</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.skipped.map((s, i) => (
                    <tr key={i} className="border-b border-outline-variant/20">
                      <td className="px-3 py-1.5 text-on-surface-variant">
                        {s.row > 0 ? s.row : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-on-surface">{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warn" }) {
  const valueClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-on-surface";
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-3">
      <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className={`mt-1 text-display-xl tabular-nums ${valueClass}`}>{value.toLocaleString("ko-KR")}</p>
    </div>
  );
}

