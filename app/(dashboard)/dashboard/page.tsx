import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";
import { CommandSphere } from "@/components/shared/CommandSphere";
import { aggregateAttendance, WEEK52_THRESHOLD } from "@/lib/attendance/aggregate";
import {
  calculateDepreciation,
  classifyLifecycle,
} from "@/lib/assets/depreciation";
import { differenceInDays } from "date-fns";
import dynamic from "next/dynamic";

// Recharts 는 약 30KB+ → dynamic import 로 First Load JS 절감
const DepartmentCostChart = dynamic(() =>
  import("./_components/department-cost-chart").then((m) => m.DepartmentCostChart),
);
const ExpenseCategoryChart = dynamic(() =>
  import("./_components/expense-category-chart").then((m) => m.ExpenseCategoryChart),
);
const TrendChart = dynamic(() =>
  import("./_components/trend-chart").then((m) => m.TrendChart),
);
const AiInsightsCard = dynamic(() =>
  import("./_components/ai-insights").then((m) => m.AiInsightsCard),
);

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

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

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

  // v2 Command Hero — 미션 리스트 (실 데이터 기반)
  const missions: Array<{ label: string; done: boolean; meta: string }> = [
    {
      label: `${month}월 결산 체크리스트`,
      done: doneTasks >= totalTasks && totalTasks > 0,
      meta:
        totalTasks > 0 ? `${doneTasks}/${totalTasks}` : "—",
    },
    {
      label: "주 52h 초과 직원 점검",
      done: overworkedEmployees.length === 0,
      meta:
        overworkedEmployees.length === 0
          ? "이상 없음"
          : `${overworkedEmployees.length}건 초과`,
    },
    {
      label: "계약 만료 임박 거래처 확인",
      done: expiringVendors.length === 0,
      meta:
        expiringVendors.length === 0
          ? "이상 없음"
          : `${expiringVendors.length}건 D-30 내`,
    },
    {
      label: "자산 내용연수 점검",
      done: expiringAssets.length === 0,
      meta:
        expiringAssets.length === 0
          ? "이상 없음"
          : `${expiringAssets.length}건 임박`,
    },
    {
      label: "연차 촉진 대상자 면담",
      done: promotionTargets.length === 0,
      meta:
        promotionTargets.length === 0
          ? "해당 없음"
          : `${promotionTargets.length}명`,
    },
  ];
  const missionDone = missions.filter((m) => m.done).length;

  return (
    <div className="animate-view-in">
      {/* ===== COMMAND HERO ===== */}
      <section className="mb-9 grid min-h-[460px] grid-cols-1 gap-8 border-b border-line pb-8 pt-2 lg:grid-cols-[1.1fr_1fr]">
        {/* LEFT — Greeting + Mission */}
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-max items-center gap-3 border border-line-2 px-3 py-[6px] font-mono text-[11px] uppercase tracking-[0.16em] text-text-2">
            <span className="h-[6px] w-[6px] animate-gold-pulse rounded-full bg-gold shadow-[0_0_12px_#F5C26B]" />
            {year}.{String(month).padStart(2, "0")} · {syncTime} KST · Operations live
          </div>
          <h1 className="font-serif text-[clamp(48px,5vw,76px)] font-normal leading-[0.98] tracking-[-0.025em] text-text-1">
            안녕하세요,
            <br />
            <em className="not-italic font-serif italic text-gold">총무</em>님.
          </h1>
          <p className="mt-[22px] max-w-[480px] text-[15px] leading-[1.65] text-text-2">
            이번 달 미확정 결산 <b className="font-medium text-gold">{totalTasks - doneTasks}건</b>,
            법적 리스크{" "}
            <b className="font-medium text-gold">{overworkedEmployees.length}건</b>이
            대기 중입니다.
            {expiringVendors.length > 0 ? (
              <>
                {" "}
                오늘 확인할 것은{" "}
                <b className="font-medium text-gold">거래처 계약 만료</b>{" "}
                {expiringVendors.length}건이에요.
              </>
            ) : null}
          </p>
          <div className="mt-8 flex gap-[10px]">
            <Link href={"/closing" as never} className="btn btn-primary">
              결산 처리 →
            </Link>
            <Link href={"/risks" as never} className="btn">
              리스크 검토
            </Link>
          </div>

          {/* Mission checklist */}
          <div className="mt-9 border-t border-dashed border-line pt-6">
            <div className="mb-[14px] font-mono text-[10px] uppercase tracking-[0.15em] text-text-3">
              오늘의 미션 · {missionDone} / {missions.length}
            </div>
            <ul className="flex flex-col gap-[10px]">
              {missions.map((m) => (
                <li
                  key={m.label}
                  className={cn(
                    "flex items-center gap-[14px] text-[13px]",
                    m.done ? "text-text-3 line-through decoration-text-4" : "text-text-2",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center border font-mono text-[10px]",
                      m.done
                        ? "border-gold bg-gold text-[#0A0A0A]"
                        : "border-line-2 text-transparent",
                    )}
                  >
                    {m.done ? "✓" : ""}
                  </span>
                  <span>{m.label}</span>
                  <small className="ml-auto font-mono text-[10px] tracking-[0.05em] text-text-3">
                    {m.meta}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT — Command Sphere (회전 와이어프레임 + 궤도) + 오버레이 라벨 */}
        <div className="relative">
          <CommandSphere />
          {/* 오버레이 라벨 — v2 App.html 의 sphere-label 패턴 */}
          <div className="pointer-events-none absolute inset-0">
            <SphereLabel pos="top-[18%] left-[8%]" label="HEAD" name="직원" value={String((employeesCurr ?? []).length)} />
            <SphereLabel
              pos="top-[32%] right-[4%]"
              label="MTD"
              name="인건비"
              value={`₩${(totalPayroll / 10_000_000).toFixed(1)}M`}
            />
            <SphereLabel
              pos="top-[56%] right-[8%]"
              label="PEND"
              name="결재"
              value={String(totalTasks - doneTasks)}
              tone={totalTasks - doneTasks > 0 ? "warn" : "default"}
            />
            <SphereLabel
              pos="bottom-[22%] left-[6%]"
              label="RISK"
              name="리스크"
              value={String(overworkedEmployees.length)}
              tone={overworkedEmployees.length > 0 ? "danger" : "default"}
            />
            <SphereLabel
              pos="bottom-[8%] right-[16%]"
              label="EDI"
              name={`D-${Math.max(0, 5)}`}
              value="대기"
              tone="warn"
            />
          </div>
        </div>
      </section>

      {/* ===== KPI grid (4) ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 xl:grid-cols-4">
        <KPI
          label={t("kpi_total_payroll")}
          value={totalPayroll}
          prefix="₩"
          delta={payrollDelta}
        />
        <KPI
          label={t("kpi_total_expense")}
          value={totalExpense}
          prefix="₩"
          delta={expenseDelta}
          deltaInversed
        />
        <KPI
          label={t("kpi_leave_promotion")}
          value={promotionTargets.length}
          suffix={t("kpi_leave_promotion_unit")}
          subtext={t("kpi_leave_promotion_desc")}
          tone={promotionTargets.length > 0 ? "warn" : "default"}
        />
        <KPI
          label={t("kpi_closing_progress")}
          value={closingPct}
          suffix="%"
          subtext={t("kpi_closing_done", { done: doneTasks, total: totalTasks })}
          tone={closingPct < 50 ? "warn" : "default"}
        />
      </div>

      {/* ===== Chart row ===== */}
      <div className="row-grid mb-9" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <Panel title={t("department_costs")} meta={`${year} · ${String(month).padStart(2, "0")}`}>
          <DepartmentCostChart data={departmentChart} />
        </Panel>
        <Panel
          title={t("category_expenses")}
          meta={`${year}.${String(month).padStart(2, "0")} · 상위 5`}
        >
          <ExpenseCategoryChart data={categoryChart} />
        </Panel>
      </div>

      {/* ===== 6mo trend ===== */}
      <div className="mb-9">
        <Panel title={t("trend_6mo")}>
          <TrendChart data={trendData} />
        </Panel>
      </div>

      {/* ===== AI insights ===== */}
      <div className="mb-9">
        <AiInsightsCard />
      </div>

      {/* ===== Section rule + Alerts ===== */}
      <div className="section-rule">
        <span className="l">
          <b>04</b>Alerts · Live
        </span>
        <span className="line" />
      </div>
      <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-3">
        <AlertPanel
          title="계약 만료 임박 거래처"
          empty="만료 임박 거래처 없음"
          href="/vendors"
          viewAllLabel={tCommon("view_all")}
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
          empty="만료 임박 자산 없음"
          href="/assets"
          viewAllLabel={tCommon("view_all")}
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
          empty="52시간 초과 직원 없음"
          href="/attendance"
          viewAllLabel={tCommon("view_all")}
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

/* ============================================================
 * v2 UI primitives (Editorial 스타일)
 * ============================================================ */

function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-h">
        <div className="t font-serif">{title}</div>
        {meta ? <div className="meta">{meta}</div> : null}
      </div>
      {children}
    </section>
  );
}

function KPI({
  label,
  value,
  prefix,
  suffix,
  delta,
  deltaInversed,
  subtext,
  tone = "default",
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta?: Delta | null;
  deltaInversed?: boolean;
  subtext?: string;
  tone?: "default" | "warn" | "danger";
}) {
  const formatted = value.toLocaleString("ko-KR");
  const toneClass =
    tone === "danger"
      ? "text-[#E06B5F] italic"
      : tone === "warn"
        ? "text-gold italic"
        : "text-text-1";

  return (
    <div className="kpi-card">
      <div className="kpi-l">{label}</div>
      <div className={cn("kpi-v", toneClass)}>
        {prefix ? <span className="cur">{prefix}</span> : null}
        {formatted}
        {suffix ? <span className="ml-1 text-[16px] text-text-3">{suffix}</span> : null}
      </div>
      <div className="kpi-meta">
        {delta !== undefined ? (
          <DeltaBadge delta={delta} inversed={deltaInversed} />
        ) : subtext ? (
          <span>{subtext}</span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function DeltaBadge({
  delta,
  inversed,
}: {
  delta: Delta | null | undefined;
  inversed?: boolean;
}) {
  if (!delta) {
    return <span className="text-text-3">전월 데이터 없음</span>;
  }
  const isPositive = inversed ? delta.dir === "down" : delta.dir === "up";
  const arrow = delta.dir === "up" ? "▲" : delta.dir === "down" ? "▼" : "—";
  const label = `${arrow} ${(delta.pct * 100).toFixed(1)}% MoM`;
  if (delta.dir === "flat") return <span className="text-text-3">{label}</span>;
  return (
    <span className={isPositive ? "text-[#6BCB8A]" : "text-[#E06B5F]"}>
      {label}
    </span>
  );
}

function SphereLabel({
  pos,
  label,
  name,
  value,
  tone = "default",
}: {
  pos: string;
  label: string;
  name: string;
  value: string;
  tone?: "default" | "warn" | "danger";
}) {
  const valueClass =
    tone === "danger"
      ? "text-[#E06B5F] italic"
      : tone === "warn"
        ? "text-gold italic"
        : "text-text-1";
  return (
    <div
      className={cn(
        "absolute whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.08em] text-text-2",
        pos,
      )}
    >
      <span className="mr-2 inline-block h-px w-6 bg-gold align-middle" />
      <b className="mr-2 font-normal text-gold">{label}</b>
      <span>{name}</span>
      <span className={cn("ml-2 align-[-2px] font-serif text-[18px] italic", valueClass)}>
        {value}
      </span>
    </div>
  );
}

function AlertPanel({
  title,
  empty,
  href,
  children,
  viewAllLabel,
}: {
  title: string;
  empty: string;
  href?: string;
  children: React.ReactNode;
  viewAllLabel?: string;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.length > 0 && items.some(Boolean);

  return (
    <section className="panel">
      <div className="panel-h">
        <div className="t font-serif text-[18px]">{title}</div>
        {href ? (
          <Link
            href={href as never}
            className="font-mono text-[10px] uppercase tracking-[0.1em] text-gold transition-colors hover:text-gold-2"
          >
            {viewAllLabel ?? "전체보기"} →
          </Link>
        ) : null}
      </div>
      {hasItems ? (
        <ul className="flex flex-col">{children}</ul>
      ) : (
        <div className="border-t border-line py-8 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
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
  const chipClass = tone === "error" ? "chip rej" : "chip pend";
  const label = tone === "error" ? "긴급" : "임박";

  const content = (
    <li
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line py-[14px] last:border-b-0",
        href && "transition-colors hover:bg-bg-1",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] text-text-1">{title}</p>
        <p className="mt-[2px] font-mono text-[10px] tracking-[0.05em] text-text-3">{meta}</p>
      </div>
      <span className={chipClass}>
        <i />
        {label}
      </span>
    </li>
  );

  return href ? (
    <Link href={href as never}>{content}</Link>
  ) : (
    content
  );
}
