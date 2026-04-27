import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Coins,
  Package,
  Radar,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatKRW } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/server";
import { aggregateAttendance, WEEK52_THRESHOLD } from "@/lib/attendance/aggregate";
import {
  calculateDepreciation,
  classifyLifecycle,
} from "@/lib/assets/depreciation";
import { differenceInDays } from "date-fns";
import { DepartmentCostChart } from "./_components/department-cost-chart";
import { ExpenseCategoryChart } from "./_components/expense-category-chart";
import { TrendChart } from "./_components/trend-chart";

const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 4;
const TREND_MONTHS = 6;

type PayrollWithDept = {
  pay_year: number;
  pay_month: number;
  gross_pay: number;
  employees: { department: { name: string } | null } | null;
};

type ExpenseWithCategory = {
  expense_date: string;
  amount: number;
  category: { name: string } | null;
};

type LeaveBalanceRow = {
  total_granted: number;
  total_used: number;
  employee_id: string;
};

type ClosingHistoryRow = { is_done: boolean };
type ClosingTaskRow = { id: string };

type VendorAlertRow = {
  id: string;
  name: string;
  contract_end: string | null;
};

type AssetAlertRow = {
  id: string;
  name: string;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  useful_life: number | null;
};

type AttendanceForAggRow = {
  employee_id: string;
  work_date: string;
  regular_hours: number;
  overtime_hours: number;
  night_hours: number;
  holiday_hours: number;
};

type EmployeeMinRow = { id: string; employee_no: string; name: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { year?: string; month?: string };
}) {
  const year = parseIntInRange(searchParams?.year, 2000, 2100, DEFAULT_YEAR);
  const month = parseIntInRange(searchParams?.month, 1, 12, DEFAULT_MONTH);
  const { year: prevYear, month: prevMonth } = previousMonth(year, month);

  const supabase = createClient();
  const today = new Date();
  const currentMonthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const currentMonthEnd = lastDayOfMonth(year, month);
  const trendStart = nMonthsAgoStart(year, month, TREND_MONTHS - 1);

  const [
    { data: payrollCurr },
    { data: payrollPrev },
    { data: expensesCurr },
    { data: expensesPrev },
    { data: leaveBalances },
    { data: closingTasks },
    { data: closingHistory },
    { data: vendorsAll },
    { data: assetsAll },
    { data: payrollTrend },
    { data: expensesTrend },
    { data: attendanceCurr },
    { data: employeesCurr },
  ] = await Promise.all([
    supabase
      .from("payroll")
      .select(
        "pay_year, pay_month, gross_pay, employees(department:departments(name))",
      )
      .eq("pay_year", year)
      .eq("pay_month", month)
      .returns<PayrollWithDept[]>(),
    supabase
      .from("payroll")
      .select("gross_pay")
      .eq("pay_year", prevYear)
      .eq("pay_month", prevMonth)
      .returns<{ gross_pay: number }[]>(),
    supabase
      .from("expenses")
      .select("expense_date, amount, category:expense_categories(name)")
      .gte("expense_date", currentMonthStart)
      .lte("expense_date", currentMonthEnd)
      .returns<ExpenseWithCategory[]>(),
    supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`)
      .lte("expense_date", lastDayOfMonth(prevYear, prevMonth))
      .returns<{ amount: number }[]>(),
    supabase
      .from("leave_balances")
      .select("employee_id, total_granted, total_used")
      .eq("year", year)
      .returns<LeaveBalanceRow[]>(),
    supabase
      .from("closing_tasks")
      .select("id")
      .returns<ClosingTaskRow[]>(),
    supabase
      .from("closing_history")
      .select("is_done")
      .eq("year", year)
      .eq("month", month)
      .returns<ClosingHistoryRow[]>(),
    supabase
      .from("vendors")
      .select("id, name, contract_end")
      .not("contract_end", "is", null)
      .returns<VendorAlertRow[]>(),
    supabase
      .from("assets")
      .select("id, name, acquisition_date, acquisition_cost, useful_life")
      .returns<AssetAlertRow[]>(),
    supabase
      .from("payroll")
      .select("pay_year, pay_month, gross_pay")
      .gte("pay_year", trendStart.year)
      .or(
        `and(pay_year.eq.${trendStart.year},pay_month.gte.${trendStart.month}),pay_year.gt.${trendStart.year}`,
      )
      .returns<{ pay_year: number; pay_month: number; gross_pay: number }[]>(),
    supabase
      .from("expenses")
      .select("expense_date, amount")
      .gte(
        "expense_date",
        `${trendStart.year}-${String(trendStart.month).padStart(2, "0")}-01`,
      )
      .lte("expense_date", currentMonthEnd)
      .returns<{ expense_date: string; amount: number }[]>(),
    supabase
      .from("attendance")
      .select(
        "employee_id, work_date, regular_hours, overtime_hours, night_hours, holiday_hours",
      )
      .gte("work_date", currentMonthStart)
      .lte("work_date", currentMonthEnd)
      .returns<AttendanceForAggRow[]>(),
    supabase
      .from("employees")
      .select("id, employee_no, name")
      .is("deleted_at", null)
      .eq("status", "active")
      .returns<EmployeeMinRow[]>(),
  ]);

  // ============ KPIs ============
  const totalPayroll = (payrollCurr ?? []).reduce((s, r) => s + r.gross_pay, 0);
  const prevPayroll = (payrollPrev ?? []).reduce((s, r) => s + r.gross_pay, 0);
  const payrollDelta = ratioDelta(totalPayroll, prevPayroll);

  const totalExpense = (expensesCurr ?? []).reduce((s, r) => s + r.amount, 0);
  const prevExpense = (expensesPrev ?? []).reduce((s, r) => s + r.amount, 0);
  const expenseDelta = ratioDelta(totalExpense, prevExpense);

  // 연차 촉진 대상자: 사용률 < 80%
  const promotionTargets = (leaveBalances ?? []).filter(
    (b) => b.total_granted > 0 && b.total_used / b.total_granted < 0.8,
  );

  // 결산 진행률
  const totalTasks = (closingTasks ?? []).length;
  const doneTasks = (closingHistory ?? []).filter((h) => h.is_done).length;
  const closingPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // ============ Charts ============
  // 부서별 인건비
  const deptMap = new Map<string, number>();
  for (const r of payrollCurr ?? []) {
    const name = r.employees?.department?.name ?? "(미배치)";
    deptMap.set(name, (deptMap.get(name) ?? 0) + r.gross_pay);
  }
  const departmentChart = [...deptMap.entries()]
    .map(([name, cost]) => ({ name, cost }))
    .sort((a, b) => b.cost - a.cost);

  // 카테고리별 지출
  const catMap = new Map<string, number>();
  for (const r of expensesCurr ?? []) {
    const name = r.category?.name ?? "(미분류)";
    catMap.set(name, (catMap.get(name) ?? 0) + r.amount);
  }
  const categoryChart = [...catMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // 6개월 추세
  const trendData = build6MonthTrend(
    year,
    month,
    payrollTrend ?? [],
    expensesTrend ?? [],
  );

  // ============ Alerts ============
  // 계약 만료 임박 거래처 (30일 내)
  const expiringVendors = (vendorsAll ?? [])
    .map((v) => ({
      id: v.id,
      name: v.name,
      daysToExpiry: v.contract_end
        ? differenceInDays(new Date(v.contract_end), today)
        : null,
    }))
    .filter((v) => v.daysToExpiry !== null && v.daysToExpiry <= 30)
    .sort((a, b) => (a.daysToExpiry ?? 0) - (b.daysToExpiry ?? 0))
    .slice(0, 5);

  // 내용연수 만료 자산 (만료 임박 6개월 또는 만료)
  const expiringAssets = (assetsAll ?? [])
    .map((a) => {
      const dep =
        a.acquisition_date && a.acquisition_cost && a.useful_life
          ? calculateDepreciation(
              {
                acquisitionDate: new Date(a.acquisition_date),
                acquisitionCost: a.acquisition_cost,
                usefulLifeYears: a.useful_life,
              },
              today,
            )
          : null;
      return {
        id: a.id,
        name: a.name,
        lifecycle: classifyLifecycle(dep?.remainingYears ?? null),
        remainingYears: dep?.remainingYears ?? null,
      };
    })
    .filter((a) => a.lifecycle === "expiring" || a.lifecycle === "expired")
    .slice(0, 5);

  // 주 52h 초과 직원
  const empMap = new Map((employeesCurr ?? []).map((e) => [e.id, e]));
  const aggregates = aggregateAttendance(
    (attendanceCurr ?? []).map((a) => {
      const emp = empMap.get(a.employee_id);
      return {
        employeeId: a.employee_id,
        employeeNo: emp?.employee_no ?? "—",
        name: emp?.name ?? "(이름 없음)",
        workDate: a.work_date,
        regularHours: Number(a.regular_hours),
        overtimeHours: Number(a.overtime_hours),
        nightHours: Number(a.night_hours),
        holidayHours: Number(a.holiday_hours),
      };
    }),
  );
  const overworkedEmployees = aggregates
    .filter((a) => a.exceededWeeks > 0)
    .slice(0, 5);

  const syncTime = today.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div className="hologram-grid relative -mx-4 -my-6 min-h-[calc(100vh-4rem)] overflow-hidden sm:-mx-6 lg:-mx-container-padding lg:-my-8 print:hidden">
      {/* Ambient indigo glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-1/2 z-0 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[120px]"
      />

      <div className="relative z-10 mx-auto max-w-[1600px] space-y-stack-lg px-4 py-6 sm:px-6 lg:px-container-padding lg:py-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-indigo-400">
            <Radar aria-hidden className="h-4 w-4" />
            System Status: Nominal · {year}년 {month}월
          </p>
          <h1 className="text-headline-lg font-bold tracking-tight text-on-surface sm:text-display-xl">
            Strategic Dashboard
          </h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Nexus ERP · 실시간 경영 지표 · 전월 대비 변화
          </p>
        </div>
        <div className="hidden items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-high/50 px-4 py-2 backdrop-blur-md lg:flex">
          <span className="text-data-tabular text-slate-400">SYNC:</span>
          <span className="text-data-tabular font-bold tabular-nums text-tertiary-sky">
            {syncTime} KST
          </span>
          <span
            aria-hidden
            className="ml-2 h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
          />
        </div>
      </div>

      {/* KPI 4종 */}
      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="이번달 총 급여"
          value={formatKRW(totalPayroll)}
          delta={payrollDelta}
          icon={Coins}
          tone="primary"
        />
        <KPICard
          label="이번달 총 지출"
          value={formatKRW(totalExpense)}
          delta={expenseDelta}
          icon={TrendingUp}
          tone="tertiary"
          deltaInversed
        />
        <KPICard
          label="연차 촉진 대상자"
          value={`${promotionTargets.length}명`}
          subtext="사용률 80% 미만"
          icon={Users}
          tone="secondary"
        />
        <KPICard
          label="월말결산 진행률"
          value={`${closingPct}%`}
          subtext={`${doneTasks}/${totalTasks} 완료`}
          icon={CalendarClock}
          tone="primary"
          progressValue={closingPct}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
        <Panel title="부서별 인건비" subtitle={`${year}년 ${month}월`}>
          <DepartmentCostChart data={departmentChart} />
        </Panel>
        <Panel title="카테고리별 지출" subtitle={`${year}년 ${month}월 · 상위 5`}>
          <ExpenseCategoryChart data={categoryChart} />
        </Panel>
      </div>

      {/* 6mo trend */}
      <Panel title="최근 6개월 급여·지출 추세">
        <TrendChart data={trendData} />
      </Panel>

      {/* Alerts */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <AlertPanel
          title="계약 만료 임박 거래처"
          icon={Building2}
          empty="만료 임박 거래처 없음"
          href="/vendors"
        >
          {expiringVendors.map((v) => (
            <AlertItem
              key={v.id}
              title={v.name}
              meta={
                v.daysToExpiry !== null && v.daysToExpiry < 0
                  ? `만료 ${-v.daysToExpiry}일 경과`
                  : `D-${v.daysToExpiry}`
              }
              tone={
                v.daysToExpiry !== null && v.daysToExpiry < 0 ? "error" : "warn"
              }
              href={`/vendors/${v.id}/edit`}
            />
          ))}
        </AlertPanel>

        <AlertPanel
          title="내용연수 만료 자산"
          icon={Package}
          empty="만료 임박 자산 없음"
          href="/assets"
        >
          {expiringAssets.map((a) => (
            <AlertItem
              key={a.id}
              title={a.name}
              meta={
                a.lifecycle === "expired"
                  ? "내용연수 만료"
                  : `잔여 ${(a.remainingYears ?? 0).toFixed(1)}년`
              }
              tone={a.lifecycle === "expired" ? "error" : "warn"}
              href={`/assets/${a.id}/edit`}
            />
          ))}
        </AlertPanel>

        <AlertPanel
          title="주 52h 초과 직원"
          icon={AlertTriangle}
          empty="52시간 초과 직원 없음"
          href="/attendance"
        >
          {overworkedEmployees.map((e) => (
            <AlertItem
              key={e.id}
              title={e.name}
              meta={`최대 ${e.maxWeeklyHours}h · ${e.exceededWeeks}주 초과 (한도 ${WEEK52_THRESHOLD}h)`}
              tone="error"
            />
          ))}
        </AlertPanel>
      </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */

type Delta = { dir: "up" | "down" | "flat"; pct: number };

function ratioDelta(current: number, previous: number): Delta | null {
  if (previous <= 0) return null;
  const pct = (current - previous) / previous;
  if (Math.abs(pct) < 0.0005) return { dir: "flat", pct: 0 };
  return { dir: pct > 0 ? "up" : "down", pct };
}

function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function nMonthsAgoStart(year: number, month: number, monthsBack: number) {
  let y = year;
  let m = month - monthsBack;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { year: y, month: m };
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
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

function build6MonthTrend(
  year: number,
  month: number,
  payrolls: Array<{ pay_year: number; pay_month: number; gross_pay: number }>,
  expenses: Array<{ expense_date: string; amount: number }>,
): Array<{ period: string; payroll: number; expense: number }> {
  const periods: Array<{ year: number; month: number }> = [];
  let y = year;
  let m = month;
  for (let i = 0; i < TREND_MONTHS; i++) {
    periods.unshift({ year: y, month: m });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }

  const payrollMap = new Map<string, number>();
  for (const p of payrolls) {
    const k = `${p.pay_year}-${p.pay_month}`;
    payrollMap.set(k, (payrollMap.get(k) ?? 0) + p.gross_pay);
  }
  const expenseMap = new Map<string, number>();
  for (const e of expenses) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.expense_date)) continue;
    const ey = Number(e.expense_date.slice(0, 4));
    const em = Number(e.expense_date.slice(5, 7));
    const k = `${ey}-${em}`;
    expenseMap.set(k, (expenseMap.get(k) ?? 0) + e.amount);
  }

  return periods.map((p) => {
    const k = `${p.year}-${p.month}`;
    return {
      period: `${p.month}월`,
      payroll: payrollMap.get(k) ?? 0,
      expense: expenseMap.get(k) ?? 0,
    };
  });
}

/* ============================================================
 * UI primitives
 * ============================================================ */

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-xl p-stack-md">
      <div className="mb-stack-md flex items-baseline justify-between">
        <h3 className="text-headline-md font-semibold text-on-surface">{title}</h3>
        {subtitle ? (
          <span className="text-label-sm text-on-surface-variant">{subtitle}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function KPICard({
  label,
  value,
  delta,
  subtext,
  icon: Icon,
  tone,
  deltaInversed,
  progressValue,
}: {
  label: string;
  value: string;
  delta?: Delta | null;
  subtext?: string;
  icon: typeof Coins;
  tone: "primary" | "tertiary" | "secondary";
  deltaInversed?: boolean;
  progressValue?: number;
}) {
  const toneClass = {
    primary: "text-primary-electric",
    tertiary: "text-tertiary-sky",
    secondary: "text-secondary-slate",
  }[tone];
  const barClass = {
    primary: "bg-primary-electric",
    tertiary: "bg-tertiary-sky",
    secondary: "bg-secondary-slate",
  }[tone];
  const barGlow = {
    primary: "rgba(192,193,255,0.7)",
    tertiary: "rgba(123,208,255,0.7)",
    secondary: "rgba(185,200,222,0.5)",
  }[tone];

  return (
    <div className="glass-panel group relative flex h-36 flex-col justify-between overflow-hidden rounded-xl p-stack-md transition-all hover:border-primary-electric/30 hover:shadow-[0_0_24px_-8px_rgba(192,193,255,0.4)]">
      {/* Inner rim light gradient (호버 시 강조) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative z-10 flex items-start justify-between">
        <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        <Icon aria-hidden className={cn("h-5 w-5 opacity-70", toneClass)} />
      </div>

      <div className="relative z-10 space-y-1">
        <span className="block text-[28px] font-bold tracking-tighter tabular-nums text-on-surface">
          {value}
        </span>
        {delta !== undefined ? (
          <DeltaBadge delta={delta} inversed={deltaInversed} />
        ) : null}
        {subtext ? (
          <span className="block text-label-sm text-on-surface-variant">
            {subtext}
          </span>
        ) : null}
      </div>

      {/* 하단 액센트 바 (progress가 있으면 진행률, 없으면 항상 풀폭) */}
      <div
        aria-hidden
        className={cn("absolute bottom-0 left-0 h-1 transition-all", barClass)}
        style={{
          width:
            progressValue !== undefined ? `${progressValue}%` : "100%",
          boxShadow: `0 0 8px ${barGlow}`,
        }}
      />
    </div>
  );
}

function DeltaBadge({
  delta,
  inversed,
}: {
  delta: Delta | null;
  inversed?: boolean;
}) {
  if (!delta) {
    return (
      <span className="text-label-sm text-on-surface-variant">전월 데이터 없음</span>
    );
  }
  const isPositive = inversed ? delta.dir === "down" : delta.dir === "up";
  const sign = delta.dir === "up" ? "+" : delta.dir === "down" ? "" : "±";
  const label = `${sign}${(delta.pct * 100).toFixed(1)}% 전월비`;
  if (delta.dir === "flat") {
    return (
      <span className="text-label-sm text-on-surface-variant">{label}</span>
    );
  }
  return (
    <span
      className={cn(
        "text-label-sm font-medium",
        isPositive ? "text-tertiary-sky" : "text-error-soft",
      )}
    >
      {label}
    </span>
  );
}

function AlertPanel({
  title,
  icon: Icon,
  empty,
  href,
  children,
}: {
  title: string;
  icon: typeof AlertTriangle;
  empty: string;
  href?: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.length > 0 && items.some(Boolean);

  return (
    <section className="glass-panel flex flex-col rounded-xl">
      <header className="flex items-center justify-between gap-2 border-b border-outline-variant/20 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <Icon aria-hidden className="h-4 w-4 text-primary-electric" />
          {title}
        </h3>
        {href ? (
          <Link
            href={href}
            className="text-label-sm text-primary-electric transition-colors hover:text-primary-container"
          >
            전체보기
          </Link>
        ) : null}
      </header>
      {hasItems ? (
        <ul className="divide-y divide-outline-variant/15">{children}</ul>
      ) : (
        <div className="px-4 py-8 text-center text-body-md text-on-surface-variant">
          {empty}
        </div>
      )}
    </section>
  );
}

function AlertItem({
  title,
  meta,
  tone,
  href,
}: {
  title: string;
  meta: string;
  tone: "warn" | "error";
  href?: string;
}) {
  const toneClass =
    tone === "error"
      ? "border-error-soft/30 bg-error-soft/10 text-error-soft"
      : "border-yellow-400/30 bg-yellow-400/10 text-yellow-400";

  const content = (
    <li
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3 transition-colors",
        href && "hover:bg-surface-container/40",
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-on-surface">{title}</p>
        <p className="text-label-sm text-on-surface-variant">{meta}</p>
      </div>
      <span
        className={cn(
          "inline-flex flex-shrink-0 items-center rounded-md border px-2 py-1 text-[10px] font-semibold",
          toneClass,
        )}
      >
        {tone === "error" ? "긴급" : "임박"}
      </span>
    </li>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
