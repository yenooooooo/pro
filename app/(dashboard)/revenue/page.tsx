import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";
import { RevenueInput } from "./_input";

export const dynamic = "force-dynamic";

type Department = { id: string; name: string };

type RevenueRow = {
  id: string;
  year: number;
  month: number;
  department_id: string | null;
  amount: number;
  vat: number;
  departments: { name: string } | null;
};

export default async function RevenuePage({
  searchParams,
}: {
  searchParams?: { year?: string };
}) {
  const t = await getTranslations("revenue");
  const supabase = createClient();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const year = Number(searchParams?.year) || currentYear;

  const [{ data: depts }, { data: rows }, { data: prevRows }] = await Promise.all([
    supabase.schema("chongmu").from("departments").select("id, name").order("name"),
    supabase
      .schema("chongmu")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("revenue" as any)
      .select(
        "id, year, month, department_id, amount, vat, departments:department_id(name)",
      )
      .eq("year", year)
      .order("month", { ascending: true }),
    supabase
      .schema("chongmu")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("revenue" as any)
      .select("month, amount")
      .eq("year", year - 1),
  ]);

  const departments = (depts ?? []) as Department[];
  const revenueRows = (rows as unknown as RevenueRow[]) ?? [];
  const prevRevenueRows =
    (prevRows as unknown as { month: number; amount: number }[]) ?? [];

  // 월×부서 그리드
  const grid = new Map<string, RevenueRow>();
  for (const r of revenueRows) {
    const key = `${r.month}-${r.department_id ?? "null"}`;
    grid.set(key, r);
  }

  // 월별 합계
  const monthlyTotals = new Array(12).fill(0);
  for (const r of revenueRows) {
    monthlyTotals[r.month - 1] += r.amount;
  }
  const yearlyTotal = monthlyTotals.reduce((a, b) => a + b, 0);

  // KPI 계산
  // YTD: 선택연도가 현재연도면 1~currentMonth 까지, 아니면 1~12
  const ytdMonths = year === currentYear ? currentMonth : 12;
  const ytdRevenue = monthlyTotals.slice(0, ytdMonths).reduce((a, b) => a + b, 0);

  // 이번달 매출 (선택연도가 현재연도가 아니면 마지막 달)
  const focusMonth = year === currentYear ? currentMonth : 12;
  const focusMonthRevenue = monthlyTotals[focusMonth - 1] ?? 0;

  // 전년 동월비 delta
  const prevMonthlyTotals = new Array(12).fill(0);
  for (const r of prevRevenueRows) {
    prevMonthlyTotals[r.month - 1] += r.amount;
  }
  const prevSameMonth = prevMonthlyTotals[focusMonth - 1] ?? 0;
  const yoyDelta = focusMonthRevenue - prevSameMonth;
  const yoyPct =
    prevSameMonth > 0 ? Math.round((yoyDelta / prevSameMonth) * 100) : null;
  const yoyPositive = yoyDelta >= 0;

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M14</b>Records · Revenue
          </div>
          <h1 className="page-h">
            매출 <em>{year}.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select
            name="year"
            defaultValue={year}
            className="h-9 border border-line-2 bg-bg px-3 font-mono text-[11px] uppercase tracking-[0.06em] text-text-1 focus:border-gold focus:outline-none"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            적용
          </button>
        </form>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-3">
        <KPI
          label={`${year}년 YTD 매출`}
          value={ytdRevenue.toLocaleString("ko-KR")}
          prefix="₩"
          subtext={`1월 ~ ${ytdMonths}월 누계`}
        />
        <KPI
          label={`${focusMonth}월 매출`}
          value={focusMonthRevenue.toLocaleString("ko-KR")}
          prefix="₩"
          subtext={year === currentYear ? "이번달" : `${year}년`}
        />
        <KPI
          label="전년 동월비"
          value={`${yoyPositive ? "+" : ""}${yoyDelta.toLocaleString("ko-KR")}`}
          prefix="₩"
          tone={yoyPositive ? "default" : "danger"}
          subtext={
            yoyPct === null
              ? "전년 데이터 없음"
              : `${yoyPositive ? "▲" : "▼"} ${Math.abs(yoyPct)}% vs ${year - 1}년 ${focusMonth}월`
          }
        />
      </div>

      {/* ===== 월×부서 매출 입력 ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            월별·부서별 <em>매출</em>
          </div>
          <div className="meta">{year}년</div>
        </div>

        <RevenueInput
          year={year}
          departments={departments}
          grid={Object.fromEntries(grid.entries())}
          monthlyTotals={monthlyTotals}
        />

        {/* 연간 합계 푸터 */}
        <div className="mt-6 flex flex-col items-end gap-1 border-t border-line pt-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            {year}년 누계
          </div>
          <div className="font-serif text-[36px] leading-none tabular-nums text-gold">
            <span className="mr-1 font-mono text-[14px] align-[4px] text-text-3">₩</span>
            {yearlyTotal.toLocaleString("ko-KR")}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
 * Subcomponents
 * ============================================================ */

function KPI({
  label,
  value,
  prefix,
  suffix,
  subtext,
  tone = "default",
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  subtext?: string;
  tone?: "default" | "warn" | "danger";
}) {
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
        {value}
        {suffix ? (
          <span className="ml-2 text-[16px] text-text-3">{suffix}</span>
        ) : null}
      </div>
      {subtext ? (
        <div className="kpi-meta">
          <span>{subtext}</span>
        </div>
      ) : null}
    </div>
  );
}
