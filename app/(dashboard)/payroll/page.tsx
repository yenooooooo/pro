import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Download,
  LockOpen,
  MoreVertical,
  RefreshCw,
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

// Phase 4에서 Supabase 쿼리로 교체. 현재는 stitch 02 레이아웃 데모용.
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

const AGG_TOTAL_GROSS = 214_580_000;
const AGG_TOTAL_DEDUCT = 57_600_000;
const AGG_NET = AGG_TOTAL_GROSS - AGG_TOTAL_DEDUCT;

export default function PayrollPage() {
  return (
    <div className="space-y-stack-lg">
      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="mb-2 text-headline-lg font-semibold tracking-tight text-on-surface">
            Payroll Execution Matrix
          </h2>
          <p className="text-body-md text-on-surface-variant">
            월별 급여 계산·검토·확정까지, 정밀한 급여 실행 콘솔
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded border border-outline-variant/50 bg-surface-container-high px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            <Download aria-hidden className="h-[18px] w-[18px]" />
            원장 내보내기
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded bg-gradient-to-b from-primary-electric to-inverse-primary px-6 py-2 text-label-sm font-semibold text-on-primary shadow-[0_0_15px_rgba(192,193,255,0.3)] transition-opacity hover:opacity-90"
          >
            <LockOpen aria-hidden className="h-[18px] w-[18px]" />
            배치 확정
          </button>
        </div>
      </div>

      {/* 12-col Bento */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* LEFT (8 cols): 필터 + 테이블 */}
        <div className="col-span-12 flex flex-col gap-stack-md xl:col-span-8">
          {/* 필터 바 */}
          <div className="glass-panel flex flex-col items-start justify-between gap-3 rounded-lg bg-surface-container-low p-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-3">
              <FilterSelect label="전체 부서" options={["전체 부서", "개발", "경영", "영업", "마케팅"]} />
              <FilterSelect label="상태: 전체" options={["상태: 전체", "확정", "초안", "검토필요"]} />
            </div>
            <div className="text-label-sm text-outline-variant">
              {TOTAL_EMPLOYEES}건 중 1–{ROWS.length}건 표시
            </div>
          </div>

          {/* 테이블 */}
          <div className="glass-panel overflow-x-auto rounded-lg bg-surface-container-lowest">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="border-b border-outline-variant/30 bg-surface-container-low text-label-sm uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4 font-semibold">직원</th>
                  <th className="px-6 py-4 text-right font-semibold">기본급</th>
                  <th className="px-6 py-4 text-right font-semibold">수당</th>
                  <th className="px-6 py-4 text-right font-semibold">공제</th>
                  <th className="px-6 py-4 text-right font-semibold">실지급</th>
                  <th className="px-6 py-4 text-center font-semibold">상태</th>
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

        {/* RIGHT (4 cols): 배치 계산 + Aggregates */}
        <div className="col-span-12 flex flex-col gap-stack-lg xl:col-span-4">
          {/* Batch Calculation */}
          <div className="glass-panel relative overflow-hidden rounded-xl bg-surface-container p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-electric/20 blur-2xl"
            />
            <div className="mb-6 flex items-center gap-2">
              <CalendarDays aria-hidden className="h-5 w-5 text-primary-electric" />
              <h3 className="text-[18px] font-semibold text-white">Batch Calculation</h3>
            </div>
            <div className="mb-2 flex items-end justify-between">
              <div>
                <div className="mb-1 text-label-sm uppercase tracking-wider text-on-surface-variant">
                  대상 기간
                </div>
                <div className="text-headline-md font-semibold text-primary-electric">
                  2026년 4월
                </div>
              </div>
              <div className="text-right">
                <div className="mb-1 text-label-sm uppercase tracking-wider text-on-surface-variant">
                  상태
                </div>
                <div className="text-data-tabular text-tertiary-sky">처리 중</div>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-8 mt-6">
              <div className="mb-2 flex justify-between text-xs text-on-surface-variant">
                <span>
                  계산 완료: {CALCULATED}/{TOTAL_EMPLOYEES}
                </span>
                <span className="text-primary-electric">{PROGRESS_PCT}%</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-highest shadow-inner">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-primary-container to-primary-electric shadow-[0_0_10px_rgba(192,193,255,0.5)]"
                  style={{ width: `${PROGRESS_PCT}%` }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              className="group flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface py-3 text-label-sm text-on-surface shadow-sm transition-colors hover:bg-surface-container-high"
            >
              <RefreshCw
                aria-hidden
                className="h-[18px] w-[18px] transition-transform duration-500 group-hover:rotate-180"
              />
              초안 재계산
            </button>
          </div>

          {/* Financial Aggregates */}
          <div className="glass-panel rounded-xl bg-surface-container p-6">
            <h3 className="mb-6 text-[18px] font-semibold text-white">Financial Aggregates</h3>
            <div className="space-y-4">
              <AggregateRow label="총 지급액" value={formatKRW(AGG_TOTAL_GROSS)} />
              <AggregateRow
                label="총 공제액"
                value={`-${formatKRW(AGG_TOTAL_DEDUCT)}`}
                tone="error"
              />
              <div className="my-2 h-px bg-outline-variant/30" />
              <div>
                <div className="mb-1 text-label-sm uppercase tracking-wider text-on-surface-variant">
                  실지급 총액
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tighter tabular-nums text-white">
                    {formatKRW(AGG_NET)}
                  </span>
                </div>
                <div className="mt-1 text-label-sm uppercase tracking-widest text-on-surface-variant">
                  2026년 4월 마감
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
        "group transition-colors hover:bg-primary-electric/5",
        isException && "border-l-2 border-l-error-soft bg-error-soft/5",
      )}
    >
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          <InitialsAvatar name={row.name} size="sm" tone={row.tone} />
          <div>
            <div className="font-medium text-on-surface">{row.name}</div>
            <div
              className={cn(
                "text-xs",
                isException ? "text-error-soft" : "text-on-surface-variant",
              )}
            >
              {isException ? row.alertMessage : row.employeeNo}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-3 text-right tabular-nums">{formatKRW(row.base)}</td>
      <td className="px-6 py-3 text-right tabular-nums text-tertiary-sky">
        {row.allowance > 0 ? `+${formatKRW(row.allowance)}` : formatKRW(0)}
      </td>
      <td className="px-6 py-3 text-right tabular-nums">
        {row.deduction !== null ? (
          <span className="text-error-soft">-{formatKRW(row.deduction)}</span>
        ) : (
          <span className="text-outline-variant">--</span>
        )}
      </td>
      <td className="px-6 py-3 text-right font-semibold tabular-nums">
        {row.netPay !== null ? (
          <span className="text-white">{formatKRW(row.netPay)}</span>
        ) : (
          <span className="text-outline-variant">미정</span>
        )}
      </td>
      <td className="px-6 py-3 text-center">
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
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary-container/50 bg-primary-container/20 px-2.5 py-1 text-[11px] font-semibold text-primary-container">
        <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-container" />
        확정
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-outline-variant/50 bg-surface-variant px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
        <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-on-surface-variant" />
        초안
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-error-container/50 bg-error-container/20 px-2.5 py-1 text-[11px] font-semibold text-error-soft">
      <AlertTriangle aria-hidden className="h-3 w-3 flex-shrink-0" />
      검토필요
    </span>
  );
}

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        className="min-h-11 appearance-none rounded border border-outline-variant/40 bg-surface px-3 pr-8 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
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
      <div className="mb-1 text-label-sm uppercase tracking-wider text-on-surface-variant">
        {label}
      </div>
      <div
        className={cn(
          "text-[22px] font-semibold tabular-nums",
          tone === "error" ? "text-error-soft" : "text-white",
        )}
      >
        {value}
      </div>
    </div>
  );
}
