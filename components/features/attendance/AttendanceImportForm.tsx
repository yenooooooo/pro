"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import {
  importAttendanceCSVAction,
  type ImportSummary,
} from "@/lib/attendance/actions";
import { ATTENDANCE_CSV_TEMPLATE } from "@/lib/attendance/csv-import";

export function AttendanceImportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSummary(null);
    startTransition(async () => {
      const result = await importAttendanceCSVAction(fd);
      setSummary(result);
      if (!result.fatal) {
        formRef.current?.reset();
      }
    });
  }

  // 양식 다운로드용 data URI (BOM 추가 — Excel 한글 깨짐 방지)
  const templateDataUri =
    "data:text/csv;charset=utf-8," +
    encodeURIComponent("﻿" + ATTENDANCE_CSV_TEMPLATE);

  return (
    <div className="space-y-stack-lg">
      <section className="glass-panel rounded-xl p-6">
        <header className="mb-4">
          <h3 className="text-headline-md font-semibold text-on-surface">CSV 형식</h3>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            첫 행은 헤더 (UTF-8 / Excel BOM 허용). 정상/연장 시간은 출퇴근 시각으로 자동 계산됩니다.
          </p>
        </header>
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-outline-variant/30 bg-surface-container-lowest">
            <pre className="px-4 py-3 text-data-tabular text-on-surface">
{`사번,일자,출근,퇴근,야간,휴일,비고
DEV-1042,2026-04-01,09:00,18:00,0,0,
DEV-1042,2026-04-02,09:00,20:00,2,0,거래처 미팅`}
            </pre>
          </div>
          <ul className="text-label-sm text-on-surface-variant">
            <li>· 필수: 사번, 일자(YYYY-MM-DD), 출근(HH:MM), 퇴근(HH:MM)</li>
            <li>· 선택: 야간, 휴일 (시간, 비우면 0), 비고</li>
            <li>· 동일 (사번, 일자) 행이 이미 있으면 <strong>덮어씁니다</strong>.</li>
          </ul>
          <a
            href={templateDataUri}
            download="attendance-template.csv"
            className="inline-flex min-h-11 items-center gap-2 rounded border border-primary-container/40 bg-primary-container/20 px-4 text-label-sm font-medium text-primary-electric transition-colors hover:bg-primary-container/30"
          >
            <FileSpreadsheet aria-hidden className="h-4 w-4" />
            양식 다운로드
          </a>
        </div>
      </section>

      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="glass-panel space-y-4 rounded-xl p-6"
      >
        <div>
          <label className="block text-label-sm font-medium text-on-surface-variant">
            CSV 파일 <span className="ml-0.5 text-error-soft">*</span>
          </label>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="mt-2 block w-full text-body-md text-on-surface file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-lg file:border-0 file:bg-surface-container-high file:px-4 file:text-label-sm file:font-semibold file:text-on-surface hover:file:bg-surface-container-highest"
          />
          <p className="mt-1 text-label-sm text-outline">최대 5MB</p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/attendance"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-high px-6 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-6 text-label-sm font-semibold text-on-primary shadow-[0_0_20px_rgba(192,193,255,0.25)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                처리 중…
              </>
            ) : (
              <>
                <Upload aria-hidden className="h-4 w-4" />
                업로드 & 처리
              </>
            )}
          </button>
        </div>
      </form>

      {summary ? <SummaryPanel summary={summary} /> : null}
    </div>
  );
}

function SummaryPanel({ summary }: { summary: ImportSummary }) {
  if (summary.fatal) {
    return (
      <div
        role="alert"
        className="glass-panel flex items-start gap-3 rounded-xl border border-error-container/50 bg-error-soft/10 p-6"
      >
        <AlertCircle
          aria-hidden
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-error-soft"
        />
        <div>
          <h3 className="text-body-lg font-semibold text-error-soft">처리 중단</h3>
          <p className="mt-1 text-label-sm text-on-surface-variant">{summary.fatal}</p>
        </div>
      </div>
    );
  }

  const totalErrors = summary.parseErrors.length + summary.rowErrors.length;

  return (
    <section className="glass-panel rounded-xl p-6">
      <header className="mb-4 flex items-center gap-2">
        {totalErrors === 0 ? (
          <CheckCircle2 aria-hidden className="h-5 w-5 text-tertiary-sky" />
        ) : (
          <AlertCircle aria-hidden className="h-5 w-5 text-error-soft" />
        )}
        <h3 className="text-headline-md font-semibold text-on-surface">처리 결과</h3>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="파싱된 행"
          value={summary.totalParsed}
          tone="default"
        />
        <Stat
          label="등록/갱신"
          value={summary.upserted}
          tone={summary.upserted > 0 ? "tertiary" : "default"}
        />
        <Stat
          label="파싱 에러"
          value={summary.parseErrors.length}
          tone={summary.parseErrors.length > 0 ? "error" : "default"}
        />
        <Stat
          label="행 처리 에러"
          value={summary.rowErrors.length}
          tone={summary.rowErrors.length > 0 ? "error" : "default"}
        />
      </dl>

      {summary.parseErrors.length > 0 ? (
        <ErrorList
          title="파싱 에러"
          items={summary.parseErrors.map((e) => ({
            primary: `행 ${e.lineNumber}`,
            secondary: e.error,
          }))}
        />
      ) : null}

      {summary.rowErrors.length > 0 ? (
        <ErrorList
          title="처리 실패"
          items={summary.rowErrors.map((e) => ({
            primary: `행 ${e.lineNumber} · ${e.employeeNo ?? "?"} · ${e.workDate ?? "?"}`,
            secondary: e.error,
          }))}
        />
      ) : null}

      <div className="mt-6 flex justify-end">
        <Link
          href="/attendance"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-high px-6 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
        >
          근태 목록으로
        </Link>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "tertiary" | "error";
}) {
  const valueClass =
    tone === "tertiary"
      ? "text-tertiary-sky"
      : tone === "error"
        ? "text-error-soft"
        : "text-on-surface";
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-outline-variant/30 bg-surface-container-low/60 p-3">
      <dt className="text-label-sm text-outline">{label}</dt>
      <dd className={`text-headline-md font-semibold tabular-nums ${valueClass}`}>
        {value}
      </dd>
    </div>
  );
}

function ErrorList({
  title,
  items,
}: {
  title: string;
  items: { primary: string; secondary: string }[];
}) {
  return (
    <div className="mt-6">
      <h4 className="mb-2 text-label-sm font-semibold text-on-surface-variant">
        {title}
      </h4>
      <ul className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-3">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="rounded border border-error-container/30 bg-error-soft/5 px-3 py-2"
          >
            <div className="text-label-sm font-medium text-on-surface">
              {item.primary}
            </div>
            <div className="text-label-sm text-error-soft">{item.secondary}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
