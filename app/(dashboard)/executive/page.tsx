import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";
import {
  calculateFinancialRatios,
  calculateDepartmentROI,
} from "@/lib/financials/analytics";
import { getComplianceRisks } from "@/lib/compliance/checks";
import {
  CashFlowSection,
  CashFlowSectionSkeleton,
} from "./_cash-flow-section";

export const dynamic = "force-dynamic";

const DEFAULT_YEAR = new Date().getFullYear();
const DEFAULT_MONTH = new Date().getMonth() + 1;

export default async function ExecutivePage({
  searchParams,
}: {
  searchParams?: { year?: string; month?: string };
}) {
  const year = Number(searchParams?.year) || DEFAULT_YEAR;
  const month = Number(searchParams?.month) || DEFAULT_MONTH;

  const t = await getTranslations("executive");
  const tCommon = await getTranslations("common");

  const supabase = createClient();

  // 전월 대비용
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  // ★ 모든 fetch 단일 라운드 — 직렬 4단계 → 1단계
  // (현금흐름 + Gemini 예측은 Suspense 로 분리됨)
  const [
    ratios,
    deptRoi,
    risks,
    activeEmployeesResult,
    prevRatios,
  ] = await Promise.all([
    calculateFinancialRatios(year, month),
    calculateDepartmentROI(year, month),
    getComplianceRisks(),
    supabase
      .schema("chongmu")
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),
    calculateFinancialRatios(prevYear, prevMonth),
  ]);
  const activeEmployees = activeEmployeesResult.count;

  // 리스크 카운트
  const dangerCount = risks.filter((r) => r.severity === "danger").length;
  const warnCount = risks.filter((r) => r.severity === "warn").length;

  const revenueDelta =
    prevRatios.revenue > 0
      ? ((ratios.revenue - prevRatios.revenue) / prevRatios.revenue) * 100
      : null;
  const profitDelta =
    prevRatios.net_profit !== 0
      ? ((ratios.net_profit - prevRatios.net_profit) /
          Math.abs(prevRatios.net_profit)) *
        100
      : null;

  const totalRisk = dangerCount + warnCount;
  const riskTone: KpiTone =
    dangerCount > 0 ? "danger" : warnCount > 0 ? "warn" : "default";
  const profitTone: KpiTone = ratios.net_profit >= 0 ? "default" : "danger";

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M01</b>Operations · Executive
          </div>
          <h1 className="page-h">
            임원 <em>지표.</em>
          </h1>
          <p className="page-sub">
            {year}년 {month}월 핵심 경영 지표 · 부서별 ROI · 현금흐름 예측 ·
            리스크 알림.
          </p>
        </div>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select
            name="year"
            defaultValue={year}
            className="h-9 border border-line-2 bg-bg px-3 font-mono text-[12px] text-text-1 focus:border-gold focus:outline-none"
          >
            {Array.from({ length: 5 }, (_, i) => DEFAULT_YEAR - 2 + i).map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            name="month"
            defaultValue={month}
            className="h-9 border border-line-2 bg-bg px-3 font-mono text-[12px] text-text-1 focus:border-gold focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            {tCommon("apply")}
          </button>
        </form>
      </header>

      {/* ===== KPI grid (5) ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KPI
          label="매출"
          value={ratios.revenue.toLocaleString("ko-KR")}
          prefix="₩"
          delta={revenueDelta}
        />
        <KPI
          label="순이익"
          value={ratios.net_profit.toLocaleString("ko-KR")}
          prefix="₩"
          delta={profitDelta}
          tone={profitTone}
        />
        <KPI
          label="총 비용"
          value={ratios.total_costs.toLocaleString("ko-KR")}
          prefix="₩"
        />
        <KPI
          label="활성 직원"
          value={String(activeEmployees ?? 0)}
          suffix="명"
        />
        <KPI
          label="법적 리스크"
          value={String(totalRisk)}
          suffix="건"
          subtext={`긴급 ${dangerCount} / 경고 ${warnCount}`}
          tone={riskTone}
        />
      </div>

      {/* ===== 재무지표 ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            재무 <em>지표</em>
          </div>
          <div className="meta">
            {year}.{String(month).padStart(2, "0")}
          </div>
        </div>
        <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          <RatioCard
            label={t("kpi_current_ratio")}
            value={ratios.current_ratio}
            unit="%"
            healthy={(v) => v >= 200}
            warning={(v) => v >= 150}
            note="200% 이상 우수"
          />
          <RatioCard
            label={t("kpi_debt_ratio")}
            value={ratios.debt_ratio}
            unit="%"
            healthy={(v) => v <= 100}
            warning={(v) => v <= 200}
            note="100% 이하 안전"
          />
          <RatioCard
            label={t("kpi_quick_ratio")}
            value={ratios.cash_ratio}
            unit="%"
            healthy={(v) => v >= 100}
            warning={(v) => v >= 80}
            note="100% 이상"
          />
          <RatioCard
            label={t("kpi_operating_margin")}
            value={ratios.operating_margin}
            unit="%"
            healthy={(v) => v >= 10}
            warning={(v) => v >= 0}
            note="10% 이상 우수"
          />
        </div>
        {(ratios.current_ratio === null || ratios.debt_ratio === null) && (
          <p className="mt-4 font-mono text-[11px] leading-[1.6] tracking-[0.02em] text-text-3">
            일부 지표는 financial_facts 테이블에 자산/부채 입력이 필요합니다.
            현재 기본값은 매출·비용 기반 영업이익률만 자동 계산.
          </p>
        )}
      </section>

      {/* ===== 부서별 ROI ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            부서별 <em>인건비 ROI</em>
          </div>
          <div className="meta">{deptRoi.length}개 부서</div>
        </div>
        {deptRoi.length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-8 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            매출/인건비 데이터 없음 · 매출 입력부터 시작하세요
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl min-w-[640px]">
              <thead>
                <tr>
                  <th>부서</th>
                  <th className="text-right">매출</th>
                  <th className="text-right">인건비</th>
                  <th className="text-right">매출/인건비</th>
                  <th className="text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {deptRoi.map((d) => (
                  <tr key={d.department}>
                    <td>
                      <span className="text-text-1">{d.department}</span>
                    </td>
                    <td className="n">
                      ₩{d.revenue.toLocaleString("ko-KR")}
                    </td>
                    <td className="n">
                      ₩{d.payroll.toLocaleString("ko-KR")}
                    </td>
                    <td className="n">
                      {d.ratio !== null ? `${d.ratio.toFixed(2)}배` : "—"}
                    </td>
                    <td
                      className={cn(
                        "n",
                        d.roi === null
                          ? "text-text-3"
                          : d.roi >= 50
                            ? "text-gold"
                            : d.roi >= 0
                              ? "text-text-1"
                              : "text-[#E06B5F]",
                      )}
                    >
                      {d.roi !== null
                        ? `${d.roi >= 0 ? "+" : ""}${d.roi.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 현금흐름 + Gemini 예측 — Suspense streaming (느린 LLM 호출 분리) */}
      <Suspense fallback={<CashFlowSectionSkeleton />}>
        <CashFlowSection />
      </Suspense>
    </div>
  );
}

/* ============================================================
 * UI primitives
 * ============================================================ */

type KpiTone = "default" | "warn" | "danger";

function KPI({
  label,
  value,
  prefix,
  suffix,
  delta,
  subtext,
  tone = "default",
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  delta?: number | null;
  subtext?: string;
  tone?: KpiTone;
}) {
  const toneClass =
    tone === "danger"
      ? "warn danger"
      : tone === "warn"
        ? "warn"
        : "";

  return (
    <div className="kpi-card">
      <div className="kpi-l">{label}</div>
      <div className={cn("kpi-v", toneClass)}>
        {prefix ? <span className="cur">{prefix}</span> : null}
        {value}
        {suffix ? (
          <span className="ml-2 text-[16px] text-text-3">{suffix}</span>
        ) : null}
      </div>
      <div className="kpi-meta">
        {delta !== undefined && delta !== null ? (
          <DeltaBadge delta={delta} />
        ) : subtext ? (
          <span>{subtext}</span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.05) {
    return <span className="text-text-3">— 전월</span>;
  }
  const isUp = delta > 0;
  const arrow = isUp ? "▲" : "▼";
  return (
    <span className={isUp ? "text-[#6BCB8A]" : "text-[#E06B5F]"}>
      {arrow} {Math.abs(delta).toFixed(1)}% 전월
    </span>
  );
}

function RatioCard({
  label,
  value,
  unit,
  healthy,
  warning,
  note,
}: {
  label: string;
  value: number | null;
  unit: string;
  healthy: (v: number) => boolean;
  warning: (v: number) => boolean;
  note?: string;
}) {
  let toneClass = "";
  if (value !== null) {
    if (healthy(value)) toneClass = "";
    else if (warning(value)) toneClass = "warn";
    else toneClass = "warn danger";
  }
  return (
    <div className="kpi-card">
      <div className="kpi-l">{label}</div>
      <div className={cn("kpi-v", toneClass)}>
        {value !== null ? `${value.toFixed(1)}` : "—"}
        {value !== null ? (
          <span className="ml-1 text-[16px] text-text-3">{unit}</span>
        ) : null}
      </div>
      {note ? (
        <div className="kpi-meta">
          <span>{note}</span>
        </div>
      ) : null}
    </div>
  );
}
