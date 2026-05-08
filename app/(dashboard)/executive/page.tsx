import { Suspense } from "react";
import {
  Crown,
  TrendingUp,
  Users,
  Coins,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
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

  return (
    <div className="space-y-stack-lg">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
            <Crown aria-hidden className="h-4 w-4" />
            Executive Dashboard
          </p>
          <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            {t("title")}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {year}년 {month}월 핵심 경영 지표 · 부서별 ROI · 현금흐름 예측 ·
            리스크 알림.
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <select
            name="year"
            defaultValue={year}
            className="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface"
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
            className="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-11 rounded-lg bg-primary px-4 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            {tCommon("apply")}
          </button>
        </form>
      </header>

      {/* 핵심 KPI 5종 */}
      <section className="grid grid-cols-2 gap-gutter md:grid-cols-3 lg:grid-cols-5">
        <MegaKpi
          icon={Coins}
          label="매출"
          value={`${ratios.revenue.toLocaleString("ko-KR")}원`}
          delta={revenueDelta}
          tone="primary"
        />
        <MegaKpi
          icon={TrendingUp}
          label="순이익"
          value={`${ratios.net_profit.toLocaleString("ko-KR")}원`}
          delta={profitDelta}
          tone={ratios.net_profit >= 0 ? "success" : "error"}
        />
        <MegaKpi
          icon={Coins}
          label="총 비용"
          value={`${ratios.total_costs.toLocaleString("ko-KR")}원`}
          tone="default"
        />
        <MegaKpi
          icon={Users}
          label="활성 직원"
          value={`${activeEmployees ?? 0}명`}
          tone="default"
        />
        <MegaKpi
          icon={AlertTriangle}
          label="법적 리스크"
          value={`${dangerCount + warnCount}건`}
          subValue={`긴급 ${dangerCount} / 경고 ${warnCount}`}
          tone={dangerCount > 0 ? "error" : warnCount > 0 ? "warn" : "success"}
        />
      </section>

      {/* 재무지표 */}
      <section className="glass-panel rounded-xl p-6">
        <h2 className="mb-4 text-headline-md font-semibold text-on-surface">
          재무지표 ({year}.{month})
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
            inverse
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
          <p className="mt-4 text-label-sm text-on-surface-variant/70">
            ⚠ 일부 지표는 financial_facts 테이블에 자산/부채 입력이 필요합니다.
            현재 기본값은 매출·비용 기반 영업이익률만 자동 계산.
          </p>
        )}
      </section>

      {/* 부서별 ROI */}
      <section className="glass-panel rounded-xl p-6">
        <h2 className="mb-4 text-headline-md font-semibold text-on-surface">
          부서별 인건비 ROI
        </h2>
        {deptRoi.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">
            매출/인건비 데이터 없음.{" "}
            <a href="/revenue" className="text-primary-electric hover:underline">
              매출 입력
            </a>
            부터 시작하세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-data-tabular">
              <thead>
                <tr className="border-b border-outline-variant/30 text-label-sm uppercase tracking-widest text-on-surface-variant">
                  <th className="px-3 py-2 text-left">부서</th>
                  <th className="px-3 py-2 text-right">매출</th>
                  <th className="px-3 py-2 text-right">인건비</th>
                  <th className="px-3 py-2 text-right">매출/인건비</th>
                  <th className="px-3 py-2 text-right">ROI (%)</th>
                </tr>
              </thead>
              <tbody>
                {deptRoi.map((d) => (
                  <tr key={d.department} className="border-b border-outline-variant/15 last:border-0">
                    <td className="px-3 py-2 font-medium text-on-surface">
                      {d.department}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-on-surface">
                      {d.revenue.toLocaleString("ko-KR")}원
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                      {d.payroll.toLocaleString("ko-KR")}원
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-on-surface">
                      {d.ratio !== null ? `${d.ratio.toFixed(2)}배` : "—"}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right tabular-nums font-semibold " +
                        (d.roi === null
                          ? "text-on-surface-variant/40"
                          : d.roi >= 50
                            ? "text-emerald-300"
                            : d.roi >= 0
                              ? "text-on-surface"
                              : "text-error-soft")
                      }
                    >
                      {d.roi !== null ? `${d.roi >= 0 ? "+" : ""}${d.roi.toFixed(1)}%` : "—"}
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

function MegaKpi({
  icon: Icon,
  label,
  value,
  delta,
  subValue,
  tone,
}: {
  icon: typeof Crown;
  label: string;
  value: string;
  delta?: number | null;
  subValue?: string;
  tone: "primary" | "success" | "error" | "warn" | "default";
}) {
  const colorMap = {
    primary: "text-primary-electric",
    success: "text-emerald-300",
    error: "text-error-soft",
    warn: "text-amber-300",
    default: "text-on-surface",
  };
  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
        <Icon aria-hidden className={`h-4 w-4 ${colorMap[tone]} opacity-60`} />
      </div>
      <p className={`text-headline-md font-bold tabular-nums ${colorMap[tone]}`}>
        {value}
      </p>
      {delta !== undefined && delta !== null ? (
        <p
          className={
            "mt-1 inline-flex items-center gap-0.5 text-label-sm tabular-nums " +
            (delta > 0
              ? "text-emerald-300"
              : delta < 0
                ? "text-error-soft"
                : "text-on-surface-variant")
          }
        >
          {delta > 0 ? (
            <ArrowUp aria-hidden className="h-3 w-3" />
          ) : delta < 0 ? (
            <ArrowDown aria-hidden className="h-3 w-3" />
          ) : (
            <Minus aria-hidden className="h-3 w-3" />
          )}
          {Math.abs(delta).toFixed(1)}% 전월
        </p>
      ) : null}
      {subValue ? (
        <p className="mt-1 text-label-sm text-on-surface-variant">{subValue}</p>
      ) : null}
    </div>
  );
}

function RatioCard({
  label,
  value,
  unit,
  healthy,
  warning,
  inverse = false,
  note,
}: {
  label: string;
  value: number | null;
  unit: string;
  healthy: (v: number) => boolean;
  warning: (v: number) => boolean;
  inverse?: boolean;
  note?: string;
}) {
  let tone = "text-on-surface";
  if (value !== null) {
    if (healthy(value)) tone = inverse ? "text-emerald-300" : "text-emerald-300";
    else if (warning(value)) tone = "text-amber-300";
    else tone = "text-error-soft";
  }
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
      <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p className={`mt-1 text-headline-md font-bold tabular-nums ${tone}`}>
        {value !== null ? `${value.toFixed(1)}${unit}` : "—"}
      </p>
      {note ? (
        <p className="mt-1 text-label-sm text-on-surface-variant/60">{note}</p>
      ) : null}
    </div>
  );
}
