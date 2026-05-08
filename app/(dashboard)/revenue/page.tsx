import { TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
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
  const year = Number(searchParams?.year) || new Date().getFullYear();

  const [{ data: depts }, { data: rows }] = await Promise.all([
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
  ]);

  const departments = (depts ?? []) as Department[];
  const revenueRows = (rows as unknown as RevenueRow[]) ?? [];

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

  return (
    <div className="space-y-stack-lg">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
            <TrendingUp aria-hidden className="h-4 w-4" />
            Revenue Tracking
          </p>
          <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            {t("title")}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {t("subtitle")}
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <select
            name="year"
            defaultValue={year}
            className="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ),
            )}
          </select>
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            적용
          </button>
        </form>
      </header>

      <div className="glass-panel rounded-xl p-5">
        <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
          {year}년 누계
        </p>
        <p className="mt-2 text-display-xl font-bold tabular-nums text-primary-electric">
          {yearlyTotal.toLocaleString("ko-KR")}원
        </p>
      </div>

      <RevenueInput
        year={year}
        departments={departments}
        grid={Object.fromEntries(grid.entries())}
        monthlyTotals={monthlyTotals}
      />
    </div>
  );
}
