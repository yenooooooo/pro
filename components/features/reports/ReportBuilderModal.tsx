"use client";

import { useEffect, useState } from "react";
import {
  X,
  FileSpreadsheet,
  Users,
  Coins,
  Receipt,
  Package,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ReportKind =
  | "payroll"
  | "employees"
  | "expenses"
  | "assets"
  | "closing_pdf";

type ReportDef = {
  kind: ReportKind;
  title: string;
  description: string;
  format: "xlsx" | "pdf";
  needsPeriod: boolean;
  icon: typeof Coins;
};

const REPORTS: ReportDef[] = [
  {
    kind: "payroll",
    title: "월별 급여 원장",
    description: "직원별 지급·공제 항목 전체 (xlsx)",
    format: "xlsx",
    needsPeriod: true,
    icon: Coins,
  },
  {
    kind: "expenses",
    title: "월별 지출 내역",
    description: "카테고리·거래처·VAT 포함 (xlsx)",
    format: "xlsx",
    needsPeriod: true,
    icon: Receipt,
  },
  {
    kind: "employees",
    title: "직원 전체 명부",
    description: "사번·부서·직급·계약 정보 (xlsx)",
    format: "xlsx",
    needsPeriod: false,
    icon: Users,
  },
  {
    kind: "assets",
    title: "자산 현황",
    description: "취득가·잔존가·만료예정일 (xlsx)",
    format: "xlsx",
    needsPeriod: false,
    icon: Package,
  },
  {
    kind: "closing_pdf",
    title: "월말결산 종합 리포트",
    description: "체크리스트 + KPI 한 장 요약 (PDF)",
    format: "pdf",
    needsPeriod: true,
    icon: FileText,
  },
];

export function ReportBuilderModal({ open, onClose }: Props) {
  const today = new Date();
  const [selected, setSelected] = useState<ReportKind>("payroll");
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const def = REPORTS.find((r) => r.kind === selected) ?? REPORTS[0];
  const yearOptions = Array.from(
    { length: 5 },
    (_, i) => today.getFullYear() - 2 + i,
  );

  function buildHref(): string {
    switch (def.kind) {
      case "payroll":
        return `/api/payroll/export?year=${year}&month=${month}`;
      case "expenses":
        return `/api/expenses/export?year=${year}&month=${month}`;
      case "employees":
        return `/api/employees/export`;
      case "assets":
        return `/api/assets/export`;
      case "closing_pdf":
        return `/closing/print?year=${year}&month=${month}`;
    }
  }

  function execute() {
    const href = buildHref();
    if (def.format === "pdf") {
      window.open(href, "_blank", "noopener");
    } else {
      const a = document.createElement("a");
      a.href = href;
      a.rel = "noopener";
      a.click();
    }
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="리포트 생성"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-5 py-4">
          <div>
            <h2 className="text-headline-md font-semibold text-on-surface">
              리포트 생성
            </h2>
            <p className="mt-0.5 text-label-sm text-on-surface-variant">
              종류와 기간을 선택하면 즉시 다운로드(또는 PDF 미리보기) 됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[70vh] grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
          <ul className="space-y-2">
            {REPORTS.map((r) => {
              const Icon = r.icon;
              const active = selected === r.kind;
              return (
                <li key={r.kind}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.kind)}
                    aria-pressed={active}
                    className={
                      "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors " +
                      (active
                        ? "border-primary-electric bg-primary-electric/10"
                        : "border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high")
                    }
                  >
                    <Icon
                      aria-hidden
                      className={
                        "mt-0.5 h-5 w-5 flex-shrink-0 " +
                        (active ? "text-primary-electric" : "text-on-surface-variant")
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-body-md font-semibold text-on-surface">
                          {r.title}
                        </p>
                        <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          {r.format}
                        </span>
                      </div>
                      <p className="mt-0.5 text-label-sm text-on-surface-variant">
                        {r.description}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-4 rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
            <div className="flex items-center gap-2">
              {def.format === "pdf" ? (
                <FileText
                  aria-hidden
                  className="h-5 w-5 text-primary-electric"
                />
              ) : (
                <FileSpreadsheet
                  aria-hidden
                  className="h-5 w-5 text-primary-electric"
                />
              )}
              <p className="text-body-md font-semibold text-on-surface">
                {def.title}
              </p>
            </div>

            {def.needsPeriod ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-label-sm font-semibold text-on-surface-variant">
                    연도
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}년
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-label-sm font-semibold text-on-surface-variant">
                    월
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}월
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="rounded border border-outline-variant/20 bg-surface-container px-3 py-2 text-label-sm text-on-surface-variant">
                기간 선택 없이 현재 시점 전체 데이터로 생성됩니다.
              </p>
            )}

            <button
              type="button"
              onClick={execute}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              {def.format === "pdf" ? (
                <ExternalLink aria-hidden className="h-4 w-4" />
              ) : (
                <Download aria-hidden className="h-4 w-4" />
              )}
              {def.format === "pdf" ? "미리보기 (PDF)" : "다운로드 (XLSX)"}
            </button>

            <p className="text-label-sm text-on-surface-variant">
              생성 이력은 <strong className="text-on-surface">감사 로그</strong>에
              자동 기록됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
