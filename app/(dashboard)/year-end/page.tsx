import Link from "next/link";
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
  const totalEmployees = emps?.length ?? 0;

  const yearOptions = Array.from(
    { length: 4 },
    (_, i) => new Date().getFullYear() - 2 + i,
  );

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M14</b>Cycle · Year-End
          </div>
          <h1 className="page-h">
            연말 <em>정산.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <select
            name="year"
            defaultValue={year}
            className="h-9 border border-line bg-bg-1 px-3 font-mono text-[12px] text-text-1 focus:border-gold-soft"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년 귀속
              </option>
            ))}
          </select>
          <button type="submit" className="btn">
            적용
          </button>
        </form>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-2 xl:grid-cols-4">
        <div className="kpi-card">
          <div className="kpi-l">입력 완료</div>
          <div className="kpi-v">
            {completedCount.toLocaleString("ko-KR")}
            <span className="ml-2 text-[16px] text-text-3">
              / {totalEmployees.toLocaleString("ko-KR")}명
            </span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">{year}년 환급 예상</div>
          <div className="kpi-v text-[#6BCB8A]">
            <span className="cur">₩</span>
            {totalRefund.toLocaleString("ko-KR")}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">추가납부 합계</div>
          <div className="kpi-v warn">
            <span className="cur">₩</span>
            {totalAdditional.toLocaleString("ko-KR")}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">대상 직원</div>
          <div className="kpi-v">
            {totalEmployees.toLocaleString("ko-KR")}
            <span className="ml-2 text-[16px] text-text-3">명</span>
          </div>
        </div>
      </div>

      {/* ===== Settlement Table ===== */}
      <section className="panel">
        <div className="panel-h">
          <div className="t font-serif">
            <em>{year}</em> 정산 대상
          </div>
          <div className="meta">
            {totalEmployees.toLocaleString("ko-KR")} 명 · {completedCount.toLocaleString("ko-KR")} 입력완료
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>사번</th>
                <th>이름</th>
                <th>부서</th>
                <th className="text-right">기본급</th>
                <th className="text-right">결정세액</th>
                <th className="text-right">기납부</th>
                <th className="text-right">환급/추가납부</th>
                <th className="text-center">상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(emps ?? []).map((e) => {
                const s = settlementMap.get(e.id);
                const refundColor = !s
                  ? "text-text-3"
                  : s.refund_amount > 0
                    ? "text-[#6BCB8A]"
                    : s.refund_amount < 0
                      ? "text-[#E06B5F] italic font-serif"
                      : "text-text-3";
                return (
                  <tr key={e.id}>
                    <td className="font-mono text-[12px] text-text-3">
                      {e.employee_no ?? "—"}
                    </td>
                    <td className="text-text-1">{e.name}</td>
                    <td className="text-text-2">
                      {e.departments?.name ?? "—"}
                    </td>
                    <td className="n">
                      {e.base_salary.toLocaleString("ko-KR")}
                    </td>
                    <td className="n">
                      {s ? s.determined_tax.toLocaleString("ko-KR") : "—"}
                    </td>
                    <td className="n text-text-3">
                      {s ? s.prepaid_tax.toLocaleString("ko-KR") : "—"}
                    </td>
                    <td
                      className={`px-[14px] py-[14px] text-right font-mono tabular-nums border-b border-line ${refundColor}`}
                    >
                      {s
                        ? `${s.refund_amount > 0 ? "+" : ""}${s.refund_amount.toLocaleString("ko-KR")}원`
                        : "—"}
                    </td>
                    <td className="text-center">
                      {s ? (
                        <span className="chip ok">
                          <i />
                          입력완료
                        </span>
                      ) : (
                        <span className="chip pend">
                          <i />
                          미입력
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/year-end/${e.id}?year=${year}` as never}
                        className="font-mono text-[10px] uppercase tracking-[0.1em] text-gold transition-colors hover:text-gold-2"
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
