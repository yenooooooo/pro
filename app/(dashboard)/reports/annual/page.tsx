/**
 * 연간 운영 리포트 — 인쇄/PDF용 페이지.
 *
 * /reports/annual?year=2025
 *
 * 1년치 KPI · 부서별 인건비 추이 · 입퇴사 통계 · 결산 완료율 · 주요 변경 audit 요약.
 * 자동 window.print() 호출.
 */

import { createClient } from "@/lib/supabase/server";
import { PrintTrigger } from "@/app/(dashboard)/closing/print/_print-trigger";

export const dynamic = "force-dynamic";

type PayrollRow = { pay_year: number; pay_month: number; gross_pay: number; net_pay: number };
type ExpenseRow = { expense_date: string; amount: number; vat: number };
type EmpRow = { hire_date: string | null; resign_date: string | null };
type ClosingRow = { year: number; month: number; is_done: boolean };

export default async function AnnualReportPage({
  searchParams,
}: {
  searchParams?: { year?: string };
}) {
  const year = Number(searchParams?.year) || new Date().getFullYear() - 1;
  const supabase = createClient();

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [
    { data: payroll },
    { data: expenses },
    { data: employees },
    { data: closings },
  ] = await Promise.all([
    supabase
      .schema("chongmu")
      .from("payroll")
      .select("pay_year, pay_month, gross_pay, net_pay")
      .eq("pay_year", year)
      .returns<PayrollRow[]>(),
    supabase
      .schema("chongmu")
      .from("expenses")
      .select("expense_date, amount, vat")
      .gte("expense_date", yearStart)
      .lte("expense_date", yearEnd)
      .returns<ExpenseRow[]>(),
    supabase
      .schema("chongmu")
      .from("employees")
      .select("hire_date, resign_date")
      .returns<EmpRow[]>(),
    supabase
      .schema("chongmu")
      .from("closing_history")
      .select("year, month, is_done")
      .eq("year", year)
      .returns<ClosingRow[]>(),
  ]);

  // 월별 집계
  const monthlyPayroll = new Array(12).fill(0);
  const monthlyExpense = new Array(12).fill(0);
  for (const r of payroll ?? []) monthlyPayroll[r.pay_month - 1] += r.gross_pay;
  for (const r of expenses ?? []) {
    const m = Number(r.expense_date.slice(5, 7)) - 1;
    monthlyExpense[m] += (r.amount || 0) + (r.vat || 0);
  }

  const totalPayroll = monthlyPayroll.reduce((a, b) => a + b, 0);
  const totalExpense = monthlyExpense.reduce((a, b) => a + b, 0);
  const totalCost = totalPayroll + totalExpense;

  // 입퇴사
  const newHires = (employees ?? []).filter(
    (e) => e.hire_date && e.hire_date >= yearStart && e.hire_date <= yearEnd,
  ).length;
  const resignations = (employees ?? []).filter(
    (e) => e.resign_date && e.resign_date >= yearStart && e.resign_date <= yearEnd,
  ).length;

  // 결산 완료율
  const totalClosingTasks = (closings ?? []).length;
  const doneClosings = (closings ?? []).filter((c) => c.is_done).length;
  const closingRate =
    totalClosingTasks > 0 ? Math.round((doneClosings / totalClosingTasks) * 100) : 0;

  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");

  // 차트용 sparkline (max 정규화)
  const maxMonthly = Math.max(...monthlyPayroll, ...monthlyExpense, 1);

  return (
    <article className="print-report mx-auto max-w-[820px] bg-white text-slate-900 print:max-w-none">
      <PrintTrigger />

      <header className="mb-6 border-b-2 border-slate-900 pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          Nexus ERP · Annual Operations Report
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{year}년 연간 리포트</h1>
        <p className="mt-1 text-sm text-slate-600">출력 일시: {stamp}</p>
      </header>

      {/* 1. KPI */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">1. 핵심 지표 요약</h2>
        <div className="grid grid-cols-2 gap-3">
          <KpiBox label="연간 총 급여" value={formatKRW(totalPayroll)} />
          <KpiBox label="연간 총 지출 (VAT 포함)" value={formatKRW(totalExpense)} />
          <KpiBox label="연간 총 운영비" value={formatKRW(totalCost)} highlight />
          <KpiBox label="신규 입사 / 퇴사" value={`${newHires} / ${resignations} 명`} />
          <KpiBox label="월 평균 급여 지출" value={formatKRW(Math.round(totalPayroll / 12))} />
          <KpiBox label="결산 체크리스트 완료율" value={`${closingRate}%`} />
        </div>
      </section>

      {/* 2. 월별 추세 */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">2. 월별 운영비 추세</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-900 bg-slate-100">
              <th className="px-2 py-1 text-left">월</th>
              <th className="px-2 py-1 text-right">급여</th>
              <th className="px-2 py-1 text-right">지출</th>
              <th className="px-2 py-1 text-right">합계</th>
              <th className="px-2 py-1 text-center" style={{ width: "120px" }}>추세</th>
            </tr>
          </thead>
          <tbody>
            {monthlyPayroll.map((p, i) => {
              const e = monthlyExpense[i];
              const sum = p + e;
              const ratio = sum / maxMonthly;
              return (
                <tr key={i} className="border-b border-slate-200">
                  <td className="px-2 py-1 font-medium">{i + 1}월</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {p ? formatKRW(p) : "—"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {e ? formatKRW(e) : "—"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums font-semibold">
                    {sum ? formatKRW(sum) : "—"}
                  </td>
                  <td className="px-2 py-1">
                    <div className="h-2 w-full rounded bg-slate-100">
                      <div
                        className="h-full rounded bg-slate-700"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* 3. 인적자원 변동 */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">3. 인적자원 변동</h2>
        <div className="rounded border border-slate-300 bg-slate-50 p-3 text-sm">
          <p>
            <strong>신규 입사:</strong> {newHires}명 ·{" "}
            <strong>퇴사:</strong> {resignations}명 ·{" "}
            <strong>순증감:</strong> {newHires - resignations >= 0 ? "+" : ""}
            {newHires - resignations}명
          </p>
        </div>
      </section>

      {/* 4. 운영 평가 */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">4. 운영 효율 평가</h2>
        <ul className="space-y-1 text-sm">
          <li>
            결산 체크리스트 완료율:{" "}
            <strong>
              {closingRate}% ({doneClosings} / {totalClosingTasks})
            </strong>
            {closingRate >= 90
              ? " — 모범 운영"
              : closingRate >= 70
                ? " — 양호"
                : " — 개선 필요"}
          </li>
          <li>
            월 평균 인당 급여:{" "}
            <strong>
              {employees && employees.length > 0
                ? formatKRW(Math.round(totalPayroll / 12 / employees.length))
                : "—"}
            </strong>
          </li>
        </ul>
      </section>

      <footer className="mt-12 border-t border-slate-300 pt-4 text-xs text-slate-500">
        <p>본 리포트는 Nexus ERP 시스템에서 자동 생성되었습니다.</p>
        <p className="mt-1">데이터 기준: {yearStart} ~ {yearEnd} · 모든 금액은 KRW</p>
      </footer>

      <style>{`
        @page { size: A4; margin: 14mm 14mm; }
        @media print {
          body { background: white !important; }
          .print-report { color: #0f172a !important; padding: 0 !important; }
          .print-report table { page-break-inside: auto; }
          .print-report tr { page-break-inside: avoid; }
          .print-report thead { display: table-header-group; }
        }
        .print-report { font-family: 'Inter', system-ui, sans-serif; padding: 24px; }
      `}</style>
    </article>
  );
}

function KpiBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={
        "rounded border px-3 py-2 " +
        (highlight ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-slate-50")
      }
    >
      <p className={"text-xs uppercase tracking-wider " + (highlight ? "text-slate-300" : "text-slate-500")}>
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function formatKRW(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}
