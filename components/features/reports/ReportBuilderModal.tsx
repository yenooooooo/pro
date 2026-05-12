"use client";

import { useEffect, useState } from "react";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ReportKind =
  | "payroll"
  | "attendance"
  | "leave"
  | "employees"
  | "expenses"
  | "assets"
  | "retirement"
  | "insurance_edi"
  | "closing_pdf"
  | "annual_pdf";

type ReportDef = {
  kind: ReportKind;
  title: string;
  description: string;
  format: "xlsx" | "pdf";
  /** "month" — 연/월, "year" — 연도만, "none" — 기간 없음 */
  period: "month" | "year" | "none";
  eyebrow: string;
};

const REPORTS: ReportDef[] = [
  {
    kind: "payroll",
    title: "월별 급여 원장",
    description: "직원별 지급·공제 항목 전체",
    format: "xlsx",
    period: "month",
    eyebrow: "Payroll",
  },
  {
    kind: "attendance",
    title: "월별 근태",
    description: "직원별 합계 + 일별 상세 2시트",
    format: "xlsx",
    period: "month",
    eyebrow: "Attendance",
  },
  {
    kind: "leave",
    title: "연차 현황",
    description: "직원별 잔여 + 신청 이력 2시트",
    format: "xlsx",
    period: "year",
    eyebrow: "Leave",
  },
  {
    kind: "expenses",
    title: "월별 지출 내역",
    description: "카테고리·거래처·VAT 포함",
    format: "xlsx",
    period: "month",
    eyebrow: "Expenses",
  },
  {
    kind: "employees",
    title: "직원 전체 명부",
    description: "사번·부서·직급·계약 정보",
    format: "xlsx",
    period: "none",
    eyebrow: "Employees",
  },
  {
    kind: "assets",
    title: "자산 현황",
    description: "취득가·잔존가·만료예정일",
    format: "xlsx",
    period: "none",
    eyebrow: "Assets",
  },
  {
    kind: "retirement",
    title: "퇴직급여 충당부채",
    description: "직원별 누적 충당금",
    format: "xlsx",
    period: "none",
    eyebrow: "Retirement",
  },
  {
    kind: "insurance_edi",
    title: "4대보험 EDI 신고용",
    description: "직원별 보수월액·공제·회사부담",
    format: "xlsx",
    period: "month",
    eyebrow: "Insurance · EDI",
  },
  {
    kind: "annual_pdf",
    title: "연간 운영 리포트",
    description: "1년 KPI 추세 + 입퇴사 + 결산 완료율",
    format: "pdf",
    period: "year",
    eyebrow: "Annual · PDF",
  },
  {
    kind: "closing_pdf",
    title: "월말결산 종합 리포트",
    description: "체크리스트 + KPI 한 장 요약",
    format: "pdf",
    period: "month",
    eyebrow: "Closing · PDF",
  },
];

export function ReportBuilderModal({ open, onClose }: Props) {
  useBodyScrollLock(open);
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
      case "attendance":
        return `/api/attendance/export?year=${year}&month=${month}`;
      case "leave":
        return `/api/leave/export?year=${year}`;
      case "expenses":
        return `/api/expenses/export?year=${year}&month=${month}`;
      case "employees":
        return `/api/employees/export`;
      case "assets":
        return `/api/assets/export`;
      case "retirement":
        return `/api/retirement/export`;
      case "insurance_edi":
        return `/api/filing/insurance-edi?year=${year}&month=${month}`;
      case "closing_pdf":
        return `/closing/print?year=${year}&month=${month}`;
      case "annual_pdf":
        return `/reports/annual?year=${year}`;
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
      className="fixed inset-0 z-[100] flex items-start justify-center bg-bg/[0.78] px-6 pt-24 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[860px] border border-line-2 bg-bg-1 shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-modal-in"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 border border-gold/15" />

        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center border border-line text-text-3 hover:border-line-2 hover:text-text-1"
        >
          ✕
        </button>

        {/* Header */}
        <div className="border-b border-line px-6 py-5">
          <div className="eyebrow">
            <b>·</b>Reports · Builder
          </div>
          <h2 className="mt-2 font-serif text-[28px] italic text-text-1">
            Report <em className="text-gold">Builder.</em>
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            Select kind · Pick period · Download or preview
          </p>
        </div>

        {/* Body */}
        <div className="grid max-h-[68vh] grid-cols-1 gap-0 overflow-y-auto md:grid-cols-[1fr_320px]">
          {/* Reports list */}
          <ul className="space-y-2 p-6">
            {REPORTS.map((r) => {
              const active = selected === r.kind;
              return (
                <li key={r.kind}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.kind)}
                    aria-pressed={active}
                    className={
                      "block w-full border p-4 text-left transition-colors " +
                      (active
                        ? "border-gold bg-gold/[0.06]"
                        : "border-line bg-bg hover:border-gold-soft")
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
                        <span className={active ? "mr-3 text-gold" : "mr-3 text-text-3"}>
                          ·
                        </span>
                        {r.eyebrow}
                      </div>
                      <span className="chip">{r.format}</span>
                    </div>
                    <div className="mt-2 font-serif text-[18px] italic text-text-1">
                      {r.title}
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                      {r.description}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Right pane — selector + execute */}
          <div className="space-y-5 border-t border-line bg-bg p-6 md:border-l md:border-t-0">
            <div>
              <div className="eyebrow">
                <b>·</b>Selected
              </div>
              <h3 className="mt-2 font-serif text-[20px] italic text-text-1">
                {def.title}
              </h3>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
                Format: {def.format.toUpperCase()}
              </p>
            </div>

            {def.period !== "none" ? (
              <div className="space-y-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
                    연도 · Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="mt-1.5 h-9 w-full border border-line bg-bg px-3 font-mono text-[12px] text-text-1 focus:border-gold focus:outline-none"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}년
                      </option>
                    ))}
                  </select>
                </div>
                {def.period === "month" ? (
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
                      월 · Month
                    </label>
                    <select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="mt-1.5 h-9 w-full border border-line bg-bg px-3 font-mono text-[12px] text-text-1 focus:border-gold focus:outline-none"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {m}월
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="border border-line bg-bg-1 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
                기간 선택 없이 현재 시점 전체 데이터로 생성.
              </p>
            )}

            <button
              type="button"
              onClick={execute}
              className="btn btn-primary w-full justify-center"
            >
              <span>✦</span>
              {def.format === "pdf" ? "미리보기 PDF" : "다운로드 XLSX"}
            </button>

            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
              생성 이력은{" "}
              <span className="text-gold">감사 로그</span>에 자동 기록.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
