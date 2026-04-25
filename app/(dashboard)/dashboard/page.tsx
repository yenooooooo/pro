import {
  AlertTriangle,
  CalendarX,
  ClipboardCheck,
  FileWarning,
  Minus,
  Package,
  RefreshCw,
  Timer,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatDelta, formatKRWCompact } from "@/lib/utils/format";

// Phase 6에서 실제 집계 쿼리로 교체. 현재는 stitch 시안 수치로 데모.
type CurrencyKPI = {
  label: string;
  kind: "currency";
  amount: number;
  delta: number | null;
  deltaLabel: string;
  icon: typeof Wallet;
};
type PercentKPI = {
  label: string;
  kind: "percent";
  percent: number;
  icon: typeof Wallet;
  barColor: string;
};
type KPI = CurrencyKPI | PercentKPI;

const KPIS: KPI[] = [
  {
    label: "이번달 총급여",
    kind: "currency",
    amount: 42_500_000,
    delta: 0.024,
    deltaLabel: "전월 대비",
    icon: Wallet,
  },
  {
    label: "이번달 총지출",
    kind: "currency",
    amount: 12_800_000,
    delta: null,
    deltaLabel: "안정적 추세",
    icon: ClipboardCheck,
  },
  {
    label: "연차 사용률",
    kind: "percent",
    percent: 64,
    icon: CalendarX,
    barColor: "bg-primary-electric",
  },
  {
    label: "월말결산 진행률",
    kind: "percent",
    percent: 85,
    icon: ClipboardCheck,
    barColor: "bg-tertiary-sky",
  },
];

const ALERTS = [
  {
    title: "계약 만료 임박 거래처 3건",
    description: "즉시 갱신 검토가 필요합니다.",
    severity: "error" as const,
    icon: FileWarning,
  },
  {
    title: "주 52시간 초과 직원 5명",
    description: "개발팀에서 규정 준수 플래그가 발생했습니다.",
    severity: "warn" as const,
    icon: Timer,
  },
  {
    title: "자산 실사 대상 12건",
    description: "분기별 하드웨어 검증이 예정되어 있습니다.",
    severity: "info" as const,
    icon: Package,
  },
];

const DEPT = [
  { label: "R&D", ratio: 0.45, color: "bg-primary-electric" },
  { label: "영업", ratio: 0.3, color: "bg-tertiary-sky" },
];
const HEADCOUNT = 142;

export default function DashboardPage() {
  return (
    <>
      {/* Page header */}
      <div className="mb-stack-lg flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            Strategic Dashboard
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            실시간으로 집계되는 주요 경영 지표
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-2 text-data-tabular text-on-surface-variant">
          <RefreshCw aria-hidden className="h-[18px] w-[18px] text-primary-electric" />
          마지막 업데이트: 방금 전
        </div>
      </div>

      {/* KPI Row */}
      <div className="mb-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="glass-panel group relative overflow-hidden rounded-xl p-6 transition-colors duration-300 hover:bg-surface-container-high"
          >
            {/* blur glow orb (우상단) */}
            <div
              aria-hidden
              className="absolute right-0 top-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-primary-electric/5 blur-2xl transition-colors group-hover:bg-primary-electric/10"
            />
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-label-sm font-medium text-on-surface-variant">
                  {kpi.label}
                </span>
                <kpi.icon
                  aria-hidden
                  className="h-9 w-9 rounded-lg bg-primary-electric/10 p-2 text-primary-electric"
                />
              </div>

              {kpi.kind === "currency" ? (
                <>
                  <KPICurrency amount={kpi.amount} />
                  <div className="mt-2 flex items-center gap-2 text-data-tabular">
                    {kpi.delta !== null ? (
                      <>
                        <TrendingUp aria-hidden className="h-4 w-4 text-tertiary-sky" />
                        <span className="text-tertiary-sky">
                          {kpi.deltaLabel} {formatDelta(kpi.delta)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Minus aria-hidden className="h-4 w-4 text-on-surface-variant" />
                        <span className="text-on-surface-variant">{kpi.deltaLabel}</span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <KPIPercent value={kpi.percent} barColor={kpi.barColor} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bento grid — chart 2col + right stack */}
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        {/* 왼쪽: 6개월 급여·지출 추세 차트 */}
        <div className="glass-panel flex h-[500px] flex-col rounded-xl p-6 lg:col-span-2">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-headline-md font-semibold text-on-surface">
                6-Month Payroll &amp; Expense Trends
              </h3>
              <p className="mt-1 text-body-md text-on-surface-variant">
                최근 6개월 누적 재무 추이
              </p>
            </div>
            <div className="hidden gap-4 sm:flex">
              <span className="flex items-center gap-2 text-label-sm text-on-surface-variant">
                <span aria-hidden className="h-3 w-3 rounded-full bg-primary-electric" />
                급여
              </span>
              <span className="flex items-center gap-2 text-label-sm text-on-surface-variant">
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full border border-outline-variant bg-surface-variant"
                />
                지출
              </span>
            </div>
          </div>

          <div className="relative mt-4 flex w-full flex-1 items-end pb-8">
            {/* Y축 가로선 */}
            <div aria-hidden className="absolute inset-0 flex flex-col justify-between pb-8">
              <div className="h-px w-full bg-outline-variant/10" />
              <div className="h-px w-full bg-outline-variant/10" />
              <div className="h-px w-full bg-outline-variant/10" />
              <div className="h-px w-full bg-outline-variant/10" />
              <div className="h-px w-full bg-outline-variant/30" />
            </div>

            {/* SVG 라인 차트 (Phase 6에서 Recharts로 교체) */}
            <svg
              role="img"
              aria-label="6개월 급여·지출 추세"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
              className="absolute inset-0 h-full w-full pb-8"
            >
              <path
                d="M0,80 L20,75 L40,82 L60,70 L80,78 L100,65"
                fill="none"
                stroke="#464554"
                strokeDasharray="4,4"
                strokeWidth="1.5"
              />
              <defs>
                <linearGradient id="payrollGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#c0c1ff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#c0c1ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,60 L20,50 L40,55 L60,35 L80,40 L100,20 L100,100 L0,100 Z"
                fill="url(#payrollGrad)"
              />
              <path
                d="M0,60 L20,50 L40,55 L60,35 L80,40 L100,20"
                fill="none"
                stroke="#c0c1ff"
                strokeWidth="3"
                style={{ filter: "drop-shadow(0px 4px 6px rgba(192, 193, 255, 0.4))" }}
              />
              {[
                { cx: 20, cy: 50 },
                { cx: 40, cy: 55 },
                { cx: 60, cy: 35 },
                { cx: 80, cy: 40 },
                { cx: 100, cy: 20 },
              ].map((p) => (
                <circle
                  key={p.cx}
                  cx={p.cx}
                  cy={p.cy}
                  r={1.5}
                  fill="#0b1326"
                  stroke="#c0c1ff"
                  strokeWidth="1"
                />
              ))}
            </svg>

            <div
              aria-hidden
              className="absolute bottom-0 left-0 flex w-full justify-between pt-2 text-data-tabular text-on-surface-variant/60"
            >
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>
        </div>

        {/* 오른쪽 스택 */}
        <div className="flex h-auto flex-col gap-gutter lg:h-[500px]">
          {/* 실시간 알림 */}
          <div className="glass-panel flex flex-1 flex-col rounded-xl p-6">
            <div className="mb-4 flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <h3 className="flex items-center gap-2 text-headline-md font-semibold text-on-surface">
                <AlertTriangle aria-hidden className="h-5 w-5 text-error-soft" />
                실시간 알림
              </h3>
              <button
                type="button"
                className="text-label-sm font-medium text-primary-electric transition-colors hover:text-primary-container"
              >
                전체보기
              </button>
            </div>
            <ul className="space-y-3 overflow-y-auto pr-2">
              {ALERTS.map((a) => {
                const bgMap = {
                  error: "bg-error-soft/10",
                  warn: "bg-tertiary-sky/10",
                  info: "bg-outline-variant/20",
                };
                const iconMap = {
                  error: "text-error-soft",
                  warn: "text-tertiary-sky",
                  info: "text-on-surface-variant",
                };
                return (
                  <li
                    key={a.title}
                    className="flex cursor-pointer gap-3 rounded-lg border border-outline-variant/20 bg-surface-container/50 p-3 transition-colors hover:bg-surface-container"
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${bgMap[a.severity]}`}
                      aria-hidden
                    >
                      <a.icon className={`h-4 w-4 ${iconMap[a.severity]}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-md font-medium leading-tight text-on-surface">
                        {a.title}
                      </p>
                      <p className="mt-1 text-label-sm text-on-surface-variant">
                        {a.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 부서별 분포 도넛 */}
          <div className="glass-panel flex h-48 items-center justify-between rounded-xl p-6">
            <div>
              <h3 className="mb-1 text-headline-md font-semibold text-on-surface">
                부서별 분포
              </h3>
              <p className="text-label-sm text-on-surface-variant">인력 구성 비율</p>
              <ul className="mt-4 space-y-2">
                {DEPT.map((d) => (
                  <li
                    key={d.label}
                    className="flex items-center gap-2 text-data-tabular text-on-surface-variant"
                  >
                    <span aria-hidden className={`h-2 w-2 rounded-full ${d.color}`} />
                    {d.label} ({Math.round(d.ratio * 100)}%)
                  </li>
                ))}
              </ul>
            </div>

            <div
              aria-hidden
              className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, #c0c1ff 0% 45%, #7bd0ff 45% 75%, #39485a 75% 100%)",
              }}
            >
              <div className="absolute inset-0 rounded-full border border-surface/50" />
              <div className="z-10 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low shadow-inner">
                <span className="text-label-sm font-bold tabular-nums text-on-surface">
                  {HEADCOUNT}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function KPICurrency({ amount }: { amount: number }) {
  const { value, unit } = formatKRWCompact(amount);
  return (
    <div className="mb-2 flex items-baseline text-on-surface">
      <span className="mr-1 text-headline-md text-on-surface-variant">₩</span>
      <span className="text-4xl font-bold tracking-tighter tabular-nums lg:text-[42px]">
        {value}
      </span>
      <span className="ml-1 text-headline-md text-on-surface-variant">{unit}</span>
    </div>
  );
}

function KPIPercent({
  value,
  barColor = "bg-primary-electric",
}: {
  value: number;
  barColor?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline text-on-surface">
        <span className="text-4xl font-bold tracking-tighter tabular-nums lg:text-[42px]">
          {value}
        </span>
        <span className="ml-1 text-headline-md text-on-surface-variant">%</span>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
        <div
          className={`h-1.5 rounded-full ${barColor}`}
          style={{ width: `${value}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
