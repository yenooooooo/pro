import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Download,
  LockOpen,
  MoreVertical,
  Play,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils/cn";
import { formatKRW } from "@/lib/utils/format";

type RowStatus = "confirmed" | "draft" | "review";

type PayrollRow = {
  id: string;
  name: string;
  employeeNo: string;
  base: number;
  allowance: number;
  deduction: number | null;
  netPay: number | null;
  status: RowStatus;
  tone: "primary" | "secondary" | "error";
  alertMessage?: string;
};

// Phase 4에서 Supabase 쿼리로 교체.
const ROWS: PayrollRow[] = [
  {
    id: "1",
    name: "김영호",
    employeeNo: "DEV-1042",
    base: 5_500_000,
    allowance: 450_000,
    deduction: 680_000,
    netPay: 5_270_000,
    status: "confirmed",
    tone: "primary",
  },
  {
    id: "2",
    name: "이서연",
    employeeNo: "MKT-2291",
    base: 4_200_000,
    allowance: 200_000,
    deduction: 520_000,
    netPay: 3_880_000,
    status: "draft",
    tone: "secondary",
  },
  {
    id: "3",
    name: "박민수",
    employeeNo: "SAL-3188",
    base: 6_000_000,
    allowance: 0,
    deduction: null,
    netPay: null,
    status: "review",
    tone: "error",
    alertMessage: "세금번호 누락",
  },
  {
    id: "4",
    name: "정지훈",
    employeeNo: "DEV-1088",
    base: 4_800_000,
    allowance: 350_000,
    deduction: 600_000,
    netPay: 4_550_000,
    status: "confirmed",
    tone: "primary",
  },
  {
    id: "5",
    name: "최예진",
    employeeNo: "SAL-3012",
    base: 3_500_000,
    allowance: 1_200_000,
    deduction: 480_000,
    netPay: 4_220_000,
    status: "draft",
    tone: "secondary",
  },
];

const TOTAL_EMPLOYEES = 50;
const CALCULATED = 46;
const PROGRESS_PCT = Math.round((CALCULATED / TOTAL_EMPLOYEES) * 100);
const REVIEW_COUNT = ROWS.filter((r) => r.status === "review").length;
const CONFIRMED_COUNT = ROWS.filter((r) => r.status === "confirmed").length;

const AGG_TOTAL_GROSS = 214_580_000;
const AGG_TOTAL_DEDUCT = 57_600_000;
const AGG_NET = AGG_TOTAL_GROSS - AGG_TOTAL_DEDUCT;

export default function PayrollPage() {
  return (
    <div className="space-y-stack-lg">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            급여 관리
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            월별 급여 계산·검토·확정 · 정밀한 급여 실행 콘솔
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container px-4 py-2 text-label-sm text-on-surface-variant opacity-60"
          >
            <Download aria-hidden className="h-[18px] w-[18px]" />
            원장 내보내기
          </button>
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-lg bg-primary-electric px-4 py-2 text-label-sm font-semibold text-on-primary opacity-60"
          >
            <LockOpen aria-hidden className="h-[18px] w-[18px]" />
            배치 확정
          </button>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KPICard
          label="대상 직원"
          value={String(TOTAL_EMPLOYEES)}
          unit="명"
          icon={Wallet}
          iconTone="text-primary-electric"
          barTone="bg-primary-electric"
          barWidth="100%"
        />
        <KPICard
          label="계산 진행률"
          value={`${PROGRESS_PCT}`}
          unit="%"
          icon={CheckCircle2}
          iconTone="text-tertiary-sky"
          barTone="bg-tertiary-sky"
          barWidth={`${PROGRESS_PCT}%`}
          subtext={`${CALCULATED}/${TOTAL_EMPLOYEES}`}
        />
        <KPICard
          label="검토 필요"
          labelTone={REVIEW_COUNT > 0 ? "text-error-soft" : undefined}
          value={String(REVIEW_COUNT)}
          unit="건"
          valueTone={REVIEW_COUNT > 0 ? "text-error-soft" : undefined}
          icon={AlertTriangle}
          iconTone={REVIEW_COUNT > 0 ? "text-error-soft" : "text-on-surface-variant"}
          barTone={REVIEW_COUNT > 0 ? "bg-error-soft animate-pulse" : "bg-outline"}
          barWidth={REVIEW_COUNT > 0 ? "20%" : "0%"}
          glowText={REVIEW_COUNT > 0}
        />
      </div>

      {/* Bento */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* LEFT 8col */}
        <div className="col-span-12 flex flex-col gap-stack-md xl:col-span-8">
          {/* Filter bar */}
          <div className="glass-panel flex flex-col items-start justify-between gap-3 rounded-xl p-stack-md sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-3">
              <FilterSelect
                label="2026년 4월"
                options={["2026년 4월", "2026년 3월", "2026년 2월"]}
              />
              <FilterSelect
                label="전체 부서"
                options={["전체 부서", "개발", "경영지원", "영업"]}
              />
              <FilterSelect
                label="상태: 전체"
                options={["상태: 전체", "확정", "초안", "검토필요"]}
              />
            </div>
            <div className="text-label-sm text-on-surface-variant">
              {ROWS.length}건 표시 · 확정 {CONFIRMED_COUNT}건
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel overflow-x-auto rounded-xl">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead className="border-b border-outline-variant/20 bg-surface-container/30 text-label-sm text-on-surface-variant">
                <tr>
                  <th className="min-w-[200px] px-6 py-4 font-semibold">직원</th>
                  <th className="whitespace-nowrap px-6 py-4 text-right font-semibold">기본급</th>
                  <th className="whitespace-nowrap px-6 py-4 text-right font-semibold">수당</th>
                  <th className="whitespace-nowrap px-6 py-4 text-right font-semibold">공제</th>
                  <th className="whitespace-nowrap px-6 py-4 text-right font-semibold">실지급</th>
                  <th className="whitespace-nowrap px-6 py-4 text-center font-semibold">상태</th>
                  <th className="w-10 px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-data-tabular text-on-surface">
                {ROWS.map((row) => (
                  <PayrollTableRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT 4col */}
        <div className="col-span-12 flex flex-col gap-stack-lg xl:col-span-4">
          {/* Batch Calculation */}
          <div className="glass-panel rounded-xl p-stack-md">
            <div className="mb-stack-md flex items-center gap-2">
              <CalendarRange aria-hidden className="h-5 w-5 text-primary-electric" />
              <h3 className="text-headline-md font-semibold text-on-surface">배치 계산</h3>
            </div>

            <div className="mb-2 flex items-end justify-between">
              <div>
                <div className="mb-1 text-label-sm text-on-surface-variant">대상 기간</div>
                <div className="text-headline-md font-semibold text-primary-electric">
                  2026년 4월
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-tertiary-sky/30 bg-tertiary-sky/10 px-2 py-1 text-label-sm text-tertiary-sky">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary-sky"
                />
                처리 중
              </span>
            </div>

            <div className="mb-stack-md mt-stack-md">
              <div className="mb-2 flex justify-between text-label-sm">
                <span className="text-on-surface-variant">
                  완료 {CALCULATED}/{TOTAL_EMPLOYEES}
                </span>
                <span className="font-bold text-primary-electric">{PROGRESS_PCT}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-highest">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-primary-container to-primary-electric shadow-[0_0_10px_rgba(192,193,255,0.5)]"
                  style={{ width: `${PROGRESS_PCT}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled
                className="group flex min-h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container py-2.5 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-bright disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  aria-hidden
                  className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180"
                />
                재계산
              </button>
              <button
                type="button"
                disabled
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary-electric/40 bg-primary-electric/10 py-2.5 text-label-sm font-semibold text-primary-electric transition-colors hover:bg-primary-electric/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play aria-hidden className="h-4 w-4" />
                실행
              </button>
            </div>
          </div>

          {/* Financial Aggregates */}
          <div className="glass-panel rounded-xl p-stack-md">
            <h3 className="mb-stack-md flex items-center gap-2 text-headline-md font-semibold text-on-surface">
              <Wallet aria-hidden className="h-5 w-5 text-tertiary-sky" />
              재무 집계
            </h3>
            <div className="space-y-4">
              <AggregateRow label="총 지급액" value={formatKRW(AGG_TOTAL_GROSS)} />
              <AggregateRow
                label="총 공제액"
                value={`-${formatKRW(AGG_TOTAL_DEDUCT)}`}
                tone="error"
              />
              <div className="my-2 h-px bg-outline-variant/30" />
              <div>
                <div className="mb-1 text-label-sm text-on-surface-variant">
                  실지급 총액
                </div>
                <div className="text-3xl font-bold tracking-tighter tabular-nums text-on-surface">
                  {formatKRW(AGG_NET)}
                </div>
                <div className="mt-1 text-label-sm text-on-surface-variant">
                  2026년 4월 마감 예정
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PayrollTableRow({ row }: { row: PayrollRow }) {
  const isException = row.status === "review";
  return (
    <tr
      className={cn(
        "group transition-colors hover:bg-surface-container/40",
        isException && "relative bg-error-soft/5 hover:bg-error-soft/10",
      )}
    >
      <td
        className={cn(
          "min-w-[200px] whitespace-nowrap px-6 py-3",
          isException && "relative pl-7",
        )}
      >
        {isException ? (
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-1 bg-error-soft opacity-70"
          />
        ) : null}
        <div className="flex items-center gap-3">
          <InitialsAvatar name={row.name} size="sm" tone={row.tone} />
          <div className="min-w-0">
            <div className="truncate font-medium text-on-surface">{row.name}</div>
            <div
              className={cn(
                "truncate text-xs",
                isException ? "text-error-soft" : "text-on-surface-variant",
              )}
            >
              {isException ? row.alertMessage : row.employeeNo}
            </div>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums">
        {formatKRW(row.base)}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-tertiary-sky">
        {row.allowance > 0 ? `+${formatKRW(row.allowance)}` : formatKRW(0)}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums">
        {row.deduction !== null ? (
          <span className="text-error-soft">-{formatKRW(row.deduction)}</span>
        ) : (
          <span className="text-outline-variant">--</span>
        )}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right font-semibold tabular-nums">
        {row.netPay !== null ? (
          <span className="text-on-surface">{formatKRW(row.netPay)}</span>
        ) : (
          <span className="text-outline-variant">미정</span>
        )}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-center">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-4 py-3 text-right opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label="행 메뉴"
          className="text-outline hover:text-primary-electric"
        >
          <MoreVertical className="h-[18px] w-[18px]" />
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  const map: Record<RowStatus, { label: string; className: string }> = {
    confirmed: {
      label: "확정",
      className: "border-tertiary-sky/30 bg-tertiary-sky/10 text-tertiary-sky",
    },
    draft: {
      label: "초안",
      className:
        "border-outline-variant/40 bg-surface-container text-on-surface-variant",
    },
    review: {
      label: "검토필요",
      className: "border-error-soft/30 bg-error-soft/10 text-error-soft",
    },
  };
  const { label, className } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        className="min-h-11 appearance-none rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 pr-8 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-outline"
      />
    </div>
  );
}

function AggregateRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "error";
}) {
  return (
    <div>
      <div className="mb-1 text-label-sm text-on-surface-variant">{label}</div>
      <div
        className={cn(
          "text-[22px] font-semibold tabular-nums",
          tone === "error" ? "text-error-soft" : "text-on-surface",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function KPICard({
  label,
  labelTone,
  value,
  valueTone,
  unit,
  icon: Icon,
  iconTone,
  barTone,
  barWidth,
  glowText,
  subtext,
}: {
  label: string;
  labelTone?: string;
  value: string;
  valueTone?: string;
  unit?: string;
  icon: typeof Wallet;
  iconTone: string;
  barTone: string;
  barWidth: string;
  glowText?: boolean;
  subtext?: string;
}) {
  return (
    <div className="glass-panel relative flex h-32 flex-col justify-between overflow-hidden rounded-lg p-stack-md">
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "text-label-sm uppercase tracking-wider",
            labelTone ?? "text-on-surface-variant",
          )}
        >
          {label}
        </span>
        <Icon aria-hidden className={cn("h-5 w-5 opacity-70", iconTone)} />
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-display-xl font-bold tracking-tighter tabular-nums",
            valueTone ?? "text-on-surface",
            glowText && "drop-shadow-[0_0_10px_rgba(255,180,171,0.5)]",
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-data-tabular text-on-surface-variant">{unit}</span>
        ) : null}
        {subtext ? (
          <span className="ml-auto text-data-tabular text-on-surface-variant">
            {subtext}
          </span>
        ) : null}
      </div>
      <div
        aria-hidden
        className={cn("absolute bottom-0 left-0 h-1", barTone)}
        style={{ width: barWidth }}
      />
    </div>
  );
}
