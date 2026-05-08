import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import benchmarks from "@/data/salary-benchmarks-2026.json";

type Props = {
  employeeName: string;
  baseSalary: number;
  department: string | null;
  position: string | null;
};

export function MarketComparison({
  employeeName,
  baseSalary,
  department,
  position,
}: Props) {
  if (!department || !position) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <h3 className="mb-2 text-headline-md font-semibold text-on-surface">
          시장 비교
        </h3>
        <p className="text-body-md text-on-surface-variant">
          부서·직급 정보가 입력되어야 시장 비교가 가능합니다.
        </p>
      </div>
    );
  }

  const deptKey = department as keyof typeof benchmarks.departments;
  const deptData = benchmarks.departments[deptKey];
  if (!deptData) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <p className="text-body-md text-on-surface-variant">
          {department} 부서의 시장 데이터가 없습니다.
        </p>
      </div>
    );
  }

  const posKey = position as keyof typeof deptData;
  const range = deptData[posKey];
  if (!range) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <p className="text-body-md text-on-surface-variant">
          {department} {position} 직급의 시장 데이터가 없습니다.
        </p>
      </div>
    );
  }

  const { p25, p50, p75 } = range;
  const diff = baseSalary - p50;
  const diffPct = (diff / p50) * 100;
  // 위치 (0 = p25, 50 = p50, 100 = p75)
  const position_in_range =
    baseSalary < p25
      ? Math.max(-25, ((baseSalary - p25) / p25) * 50)
      : baseSalary > p75
        ? Math.min(125, 100 + ((baseSalary - p75) / p75) * 50)
        : ((baseSalary - p25) / (p75 - p25)) * 100;

  const tone =
    diffPct >= 10
      ? "text-emerald-300"
      : diffPct >= -10
        ? "text-on-surface"
        : "text-amber-300";

  const Icon = diffPct >= 5 ? TrendingUp : diffPct <= -5 ? TrendingDown : Minus;

  const insight =
    diffPct >= 15
      ? `시장 중간값보다 ${diffPct.toFixed(0)}% 높습니다. 핵심 인재 보존 신호로 해석 가능.`
      : diffPct >= 0
        ? `시장 중간값 수준. 안정적 위치.`
        : diffPct >= -10
          ? `시장 중간값보다 약간 낮습니다. 다음 인상 검토 시 우선순위 권장.`
          : `시장 중간값보다 ${Math.abs(diffPct).toFixed(0)}% 낮습니다. 이직 위험 ↑ — 조정 권장.`;

  return (
    <div className="glass-panel rounded-xl p-6">
      <header className="mb-4 flex items-center gap-2">
        <h3 className="text-headline-md font-semibold text-on-surface">
          시장 비교
        </h3>
        <span className="ml-auto rounded bg-primary-electric/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-electric">
          {benchmarks.metadata.year} 기준
        </span>
      </header>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-label-sm text-on-surface-variant">
            {employeeName} ({department} {position})
          </span>
          <span className="text-data-tabular tabular-nums text-on-surface">
            {baseSalary.toLocaleString("ko-KR")}원
          </span>
        </div>

        {/* 시장 분포 막대 */}
        <div>
          <div className="relative h-3 w-full rounded-full bg-surface-container-high">
            {/* p25~p75 구간 */}
            <div
              className="absolute h-full rounded-full bg-primary-electric/30"
              style={{ left: "0%", right: "0%" }}
            />
            {/* p50 마커 */}
            <div
              className="absolute top-0 h-full w-0.5 bg-primary-electric"
              style={{ left: "50%" }}
            />
            {/* 본인 위치 */}
            <div
              className="absolute -top-1 h-5 w-5 rounded-full border-2 border-on-surface bg-primary-electric"
              style={{
                left: `calc(${Math.max(0, Math.min(100, position_in_range))}% - 10px)`,
              }}
              title={`본인 위치`}
            />
          </div>
          <div className="mt-1 flex justify-between text-label-sm tabular-nums text-on-surface-variant">
            <span>P25 {(p25 / 10000).toFixed(0)}만</span>
            <span className="font-semibold text-primary-electric">
              중간값 {(p50 / 10000).toFixed(0)}만
            </span>
            <span>P75 {(p75 / 10000).toFixed(0)}만</span>
          </div>
        </div>

        <div className={`flex items-center gap-2 ${tone}`}>
          <Icon aria-hidden className="h-4 w-4" />
          <span className="text-body-md font-semibold">
            중간값 대비 {diff >= 0 ? "+" : ""}
            {diff.toLocaleString("ko-KR")}원 ({diffPct.toFixed(1)}%)
          </span>
        </div>

        <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-3">
          <p className="text-label-sm text-on-surface-variant">💡 {insight}</p>
        </div>

        <p className="text-label-sm text-on-surface-variant/60">
          출처: {benchmarks.metadata.source}
        </p>
      </div>
    </div>
  );
}
