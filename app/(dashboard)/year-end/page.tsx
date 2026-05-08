import Link from "next/link";
import { Calendar, FileText, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EmpRow = {
  id: string;
  employee_no: string | null;
  name: string;
  base_salary: number;
  dependents: number;
  departments: { name: string } | null;
};

type SettlementRow = {
  employee_id: string;
  year: number;
  determined_tax: number;
  prepaid_tax: number;
  refund_amount: number;
  updated_at: string;
};

export default async function YearEndPage({
  searchParams,
}: {
  searchParams?: { year?: string };
}) {
  const t = await getTranslations("year_end");
  const supabase = createClient();
  const year = Number(searchParams?.year) || new Date().getFullYear();

  const [{ data: emps }, { data: settlements }] = await Promise.all([
    supabase
      .schema("chongmu")
      .from("employees")
      .select(
        "id, employee_no, name, base_salary, dependents, departments:department_id(name)",
      )
      .eq("status", "active")
      .is("deleted_at", null)
      .order("employee_no")
      .returns<EmpRow[]>(),
    supabase
      .schema("chongmu")
      .from("year_end_settlements")
      .select("employee_id, year, determined_tax, prepaid_tax, refund_amount, updated_at")
      .eq("year", year)
      .returns<SettlementRow[]>(),
  ]);

  const settlementMap = new Map(
    (settlements ?? []).map((s) => [s.employee_id, s]),
  );

  const totalRefund = (settlements ?? []).reduce(
    (s, r) => s + (r.refund_amount > 0 ? r.refund_amount : 0),
    0,
  );
  const totalAdditional = (settlements ?? []).reduce(
    (s, r) => s + (r.refund_amount < 0 ? Math.abs(r.refund_amount) : 0),
    0,
  );
  const completedCount = settlements?.length ?? 0;

  const yearOptions = Array.from(
    { length: 4 },
    (_, i) => new Date().getFullYear() - 2 + i,
  );

  return (
    <div className="space-y-stack-lg">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
            <Calendar aria-hidden className="h-4 w-4" />
            Year-End Tax Settlement
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
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년 귀속
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            적용
          </button>
        </form>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KpiCard
          icon={Users}
          label="입력 완료"
          value={`${completedCount} / ${emps?.length ?? 0}명`}
          tone="default"
        />
        <KpiCard
          icon={FileText}
          label={`${year}년 환급액 합계`}
          value={`${totalRefund.toLocaleString("ko-KR")}원`}
          tone="primary"
        />
        <KpiCard
          icon={FileText}
          label="추가납부 합계"
          value={`${totalAdditional.toLocaleString("ko-KR")}원`}
          tone="error"
        />
      </div>

      {/* 직원 목록 */}
      <section className="glass-panel overflow-hidden rounded-xl">
        <h2 className="border-b border-outline-variant/30 px-6 py-4 text-headline-md font-semibold text-on-surface">
          {year}년 정산 대상 직원
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-data-tabular">
            <thead>
              <tr className="border-b border-outline-variant/30 text-label-sm uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3 text-left">사번</th>
                <th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-left">부서</th>
                <th className="px-4 py-3 text-right">기본급</th>
                <th className="px-4 py-3 text-right">결정세액</th>
                <th className="px-4 py-3 text-right">기납부</th>
                <th className="px-4 py-3 text-right">환급/추가납부</th>
                <th className="px-4 py-3 text-center">상태</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(emps ?? []).map((e) => {
                const s = settlementMap.get(e.id);
                const refundColor =
                  !s
                    ? "text-on-surface-variant"
                    : s.refund_amount > 0
                      ? "text-emerald-300"
                      : s.refund_amount < 0
                        ? "text-error-soft"
                        : "text-on-surface-variant";
                return (
                  <tr
                    key={e.id}
                    className="border-b border-outline-variant/15 last:border-0 transition-colors hover:bg-primary/5"
                  >
                    <td className="px-4 py-3 text-on-surface-variant">
                      {e.employee_no ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-on-surface">
                      {e.name}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {e.departments?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-on-surface">
                      {e.base_salary.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-on-surface">
                      {s ? s.determined_tax.toLocaleString("ko-KR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">
                      {s ? s.prepaid_tax.toLocaleString("ko-KR") : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${refundColor}`}>
                      {s
                        ? `${s.refund_amount > 0 ? "+" : ""}${s.refund_amount.toLocaleString("ko-KR")}원`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s ? (
                        <span className="inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          입력완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                          미입력
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/year-end/${e.id}?year=${year}` as never}
                        className="text-label-sm font-semibold text-primary-electric hover:text-primary-container"
                      >
                        편집 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: "primary" | "default" | "error";
}) {
  const colorMap = {
    primary: "text-primary-electric",
    default: "text-on-surface",
    error: "text-error-soft",
  };
  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
          {label}
        </p>
        <Icon aria-hidden className="h-4 w-4 text-on-surface-variant/40" />
      </div>
      <p className={`mt-2 text-headline-md font-bold tabular-nums ${colorMap[tone]}`}>
        {value}
      </p>
    </div>
  );
}
