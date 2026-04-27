import Link from "next/link";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Wallet,
} from "lucide-react";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils/cn";
import { formatKRW } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/server";
import { BatchRunButtons } from "./_components/batch-run-buttons";
import { ConfirmBatchButton } from "./_components/confirm-batch-button";
import { PeriodFilter } from "./_components/period-filter";

type RowStatus = "confirmed" | "draft" | "review";

type PayrollRow = {
  id: string;
  employeeId: string;
  name: string;
  employeeNo: string;
  base: number;
  allowance: number;
  deduction: number;
  netPay: number;
  status: RowStatus;
  tone: "primary" | "secondary" | "error";
  alertMessage?: string;
};

type PayrollDbRow = {
  id: string;
  employee_id: string;
  base_salary: number;
  overtime_pay: number;
  night_pay: number;
  holiday_pay: number;
  meal_allowance: number;
  position_allowance: number;
  other_allowance: number;
  gross_pay: number;
  income_tax: number;
  total_deduction: number;
  net_pay: number;
  status: string;
  employees: { name: string; employee_no: string } | null;
};

type EmployeeCountRow = { id: string };

const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 4;

export default async function PayrollPage({
  searchParams,
}: {
  searchParams?: { year?: string; month?: string };
}) {
  const year = parseIntInRange(searchParams?.year, 2000, 2100, DEFAULT_YEAR);
  const month = parseIntInRange(searchParams?.month, 1, 12, DEFAULT_MONTH);

  const supabase = createClient();

  const [{ data: empCount }, { data: payrollRows }] = await Promise.all([
    supabase
      .from("employees")
      .select("id")
      .is("deleted_at", null)
      .eq("status", "active")
      .returns<EmployeeCountRow[]>(),
    supabase
      .from("payroll")
      .select(
        "id, employee_id, base_salary, overtime_pay, night_pay, holiday_pay, meal_allowance, position_allowance, other_allowance, gross_pay, income_tax, total_deduction, net_pay, status, employees(name, employee_no)",
      )
      .eq("pay_year", year)
      .eq("pay_month", month)
      .returns<PayrollDbRow[]>(),
  ]);

  const totalEmployees = empCount?.length ?? 0;
  const dbRows = payrollRows ?? [];
  const rows = dbRows
    .map(toPayrollRow)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const calculated = rows.length;
  const progressPct = totalEmployees > 0 ? Math.round((calculated / totalEmployees) * 100) : 0;
  const reviewCount = rows.filter((r) => r.status === "review").length;
  const confirmedCount = rows.filter((r) => r.status === "confirmed").length;
  // DB 기준 'draft'만 확정 대상 (UI상 'review'로 보여도 DB가 draft이면 확정 가능).
  const draftDbCount = dbRows.filter((r) => r.status === "draft").length;

  const aggTotalGross = rows.reduce((s, r) => s + r.base + r.allowance, 0);
  const aggTotalDeduct = rows.reduce((s, r) => s + r.deduction, 0);
  const aggNet = aggTotalGross - aggTotalDeduct;

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
          <ConfirmBatchButton year={year} month={month} draftCount={draftDbCount} />
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KPICard
          label="대상 직원"
          value={String(totalEmployees)}
          unit="명"
          icon={Wallet}
          iconTone="text-primary-electric"
          barTone="bg-primary-electric"
          barWidth="100%"
        />
        <KPICard
          label="계산 진행률"
          value={`${progressPct}`}
          unit="%"
          icon={CheckCircle2}
          iconTone="text-tertiary-sky"
          barTone="bg-tertiary-sky"
          barWidth={`${progressPct}%`}
          subtext={`${calculated}/${totalEmployees}`}
        />
        <KPICard
          label="검토 필요"
          labelTone={reviewCount > 0 ? "text-error-soft" : undefined}
          value={String(reviewCount)}
          unit="건"
          valueTone={reviewCount > 0 ? "text-error-soft" : undefined}
          icon={AlertTriangle}
          iconTone={reviewCount > 0 ? "text-error-soft" : "text-on-surface-variant"}
          barTone={reviewCount > 0 ? "bg-error-soft animate-pulse" : "bg-outline"}
          barWidth={reviewCount > 0 ? "20%" : "0%"}
          glowText={reviewCount > 0}
        />
      </div>

      {/* Bento */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* LEFT 8col */}
        <div className="col-span-12 flex flex-col gap-stack-md xl:col-span-8">
          {/* Filter bar */}
          <div className="glass-panel flex flex-col items-start justify-between gap-3 rounded-xl p-stack-md sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-3">
              <PeriodFilter year={year} month={month} />
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
              {rows.length}건 표시 · 확정 {confirmedCount}건
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel overflow-x-auto rounded-xl">
            {rows.length === 0 ? (
              <EmptyState year={year} month={month} totalEmployees={totalEmployees} />
            ) : (
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
                  {rows.map((row) => (
                    <PayrollTableRow key={row.id} row={row} year={year} month={month} />
                  ))}
                </tbody>
              </table>
            )}
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
                  {year}년 {month}월
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-label-sm",
                  progressPct === 100
                    ? "border-tertiary-sky/30 bg-tertiary-sky/10 text-tertiary-sky"
                    : progressPct > 0
                      ? "border-primary-electric/30 bg-primary-electric/10 text-primary-electric"
                      : "border-outline-variant/40 bg-surface-container text-on-surface-variant",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    progressPct === 100
                      ? "bg-tertiary-sky"
                      : progressPct > 0
                        ? "animate-pulse bg-primary-electric"
                        : "bg-outline",
                  )}
                />
                {progressPct === 100 ? "완료" : progressPct > 0 ? "처리 중" : "대기"}
              </span>
            </div>

            <div className="mb-stack-md mt-stack-md">
              <div className="mb-2 flex justify-between text-label-sm">
                <span className="text-on-surface-variant">
                  완료 {calculated}/{totalEmployees}
                </span>
                <span className="font-bold text-primary-electric">{progressPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-highest">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-primary-container to-primary-electric shadow-[0_0_10px_rgba(192,193,255,0.5)]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <BatchRunButtons year={year} month={month} hasExisting={calculated > 0} />
          </div>

          {/* Financial Aggregates */}
          <div className="glass-panel rounded-xl p-stack-md">
            <h3 className="mb-stack-md flex items-center gap-2 text-headline-md font-semibold text-on-surface">
              <Wallet aria-hidden className="h-5 w-5 text-tertiary-sky" />
              재무 집계
            </h3>
            <div className="space-y-4">
              <AggregateRow label="총 지급액" value={formatKRW(aggTotalGross)} />
              <AggregateRow
                label="총 공제액"
                value={`-${formatKRW(aggTotalDeduct)}`}
                tone="error"
              />
              <div className="my-2 h-px bg-outline-variant/30" />
              <div>
                <div className="mb-1 text-label-sm text-on-surface-variant">
                  실지급 총액
                </div>
                <div className="text-3xl font-bold tracking-tighter tabular-nums text-on-surface">
                  {formatKRW(aggNet)}
                </div>
                <div className="mt-1 text-label-sm text-on-surface-variant">
                  {year}년 {month}월 마감 예정
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function toPayrollRow(r: PayrollDbRow): PayrollRow {
  const allowance =
    r.overtime_pay +
    r.night_pay +
    r.holiday_pay +
    r.meal_allowance +
    r.position_allowance +
    r.other_allowance;

  // DB status('draft'|'confirmed'|'paid') → UI 3분류로 매핑.
  // net_pay 음수 또는 income_tax=0 + 큰 과세소득은 '검토필요'.
  const taxable = r.gross_pay - r.meal_allowance; // 과세소득 근사 (식대만 비과세 처리 가정)
  const suspectTax = r.income_tax === 0 && taxable >= 1_000_000;
  let status: RowStatus;
  let tone: "primary" | "secondary" | "error";
  let alertMessage: string | undefined;
  if (r.net_pay < 0) {
    status = "review";
    tone = "error";
    alertMessage = "실지급 음수";
  } else if (suspectTax) {
    status = "review";
    tone = "error";
    alertMessage = "세액 미산정";
  } else if (r.status === "confirmed" || r.status === "paid") {
    status = "confirmed";
    tone = "primary";
  } else {
    status = "draft";
    tone = "secondary";
  }

  return {
    id: r.id,
    employeeId: r.employee_id,
    name: r.employees?.name ?? "(이름 없음)",
    employeeNo: r.employees?.employee_no ?? "—",
    base: r.base_salary,
    allowance,
    deduction: r.total_deduction,
    netPay: r.net_pay,
    status,
    tone,
    alertMessage,
  };
}

function parseIntInRange(
  v: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

function EmptyState({
  year,
  month,
  totalEmployees,
}: {
  year: number;
  month: number;
  totalEmployees: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <CalendarRange aria-hidden className="h-10 w-10 text-outline-variant" />
      <div className="text-headline-md font-semibold text-on-surface">
        {year}년 {month}월 급여 미계산
      </div>
      <div className="max-w-sm text-body-md text-on-surface-variant">
        활성 직원 {totalEmployees}명에 대한 이번 달 급여가 아직 계산되지 않았습니다.
        우측 「실행」 버튼을 눌러 일괄 계산하세요.
      </div>
    </div>
  );
}

function PayrollTableRow({
  row,
  year,
  month,
}: {
  row: PayrollRow;
  year: number;
  month: number;
}) {
  const isException = row.status === "review";
  const payslipHref = `/payroll/${row.employeeId}?year=${year}&month=${month}`;
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
        <Link
          href={payslipHref}
          className="flex items-center gap-3 outline-none transition-colors hover:text-primary-electric focus-visible:text-primary-electric"
        >
          <InitialsAvatar name={row.name} size="sm" tone={row.tone} />
          <div className="min-w-0">
            <div className="truncate font-medium text-on-surface group-hover:text-primary-electric">
              {row.name}
            </div>
            <div
              className={cn(
                "truncate text-xs",
                isException ? "text-error-soft" : "text-on-surface-variant",
              )}
            >
              {isException ? row.alertMessage : row.employeeNo}
            </div>
          </div>
        </Link>
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums">
        {formatKRW(row.base)}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-tertiary-sky">
        {row.allowance > 0 ? `+${formatKRW(row.allowance)}` : formatKRW(0)}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums">
        {row.deduction > 0 ? (
          <span className="text-error-soft">-{formatKRW(row.deduction)}</span>
        ) : (
          <span className="text-outline-variant">--</span>
        )}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right font-semibold tabular-nums">
        <span className={row.netPay < 0 ? "text-error-soft" : "text-on-surface"}>
          {formatKRW(row.netPay)}
        </span>
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-center">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={payslipHref}
          aria-label={`${row.name} 명세서 보기`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-outline opacity-0 transition-all hover:bg-primary-electric/10 hover:text-primary-electric focus-visible:opacity-100 group-hover:opacity-100"
        >
          <FileText className="h-[18px] w-[18px]" />
        </Link>
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
