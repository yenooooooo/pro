/**
 * 월말결산 종합 리포트 — 인쇄/PDF용 페이지.
 *
 * /closing/print?year=2026&month=4
 *
 * 브라우저의 인쇄 다이얼로그(Ctrl+P) 또는 자동 호출로 PDF 저장.
 * 화면 자체는 dashboard layout 안에서 동작하므로 전역 layout의 print:hidden
 * 처리(상단바·사이드바·하단탭바)에 의존한다.
 */

import { createClient } from "@/lib/supabase/server";
import { PrintTrigger } from "./_print-trigger";

const DEFAULT_YEAR = new Date().getFullYear();
const DEFAULT_MONTH = new Date().getMonth() + 1;

type ClosingTask = {
  id: string;
  title: string;
  description: string | null;
  order_no: number;
};

type ClosingHistoryRow = {
  task_id: string;
  is_done: boolean;
  completed_at: string | null;
};

type PayrollRow = {
  base_salary: number;
  gross_pay: number;
  net_pay: number;
};

type AttendanceRow = {
  overtime_hours: number;
  late_minutes: number;
};

type ExpenseRow = {
  amount: number;
  vat: number;
};

type EmployeeJoinRow = {
  hire_date: string | null;
  resign_date: string | null;
};

export default async function ClosingPrintPage({
  searchParams,
}: {
  searchParams?: { year?: string; month?: string };
}) {
  const year = parseIntInRange(searchParams?.year, 2000, 2100, DEFAULT_YEAR);
  const month = parseIntInRange(searchParams?.month, 1, 12, DEFAULT_MONTH);

  const supabase = createClient();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = lastDayOfMonth(year, month);

  const [
    { data: tasks },
    { data: history },
    { data: payroll },
    { data: attendance },
    { data: expenses },
    { data: employees },
  ] = await Promise.all([
    supabase
      .schema("chongmu")
      .from("closing_tasks")
      .select("id, title, description, order_no")
      .order("order_no")
      .returns<ClosingTask[]>(),
    supabase
      .schema("chongmu")
      .from("closing_history")
      .select("task_id, is_done, completed_at")
      .eq("year", year)
      .eq("month", month)
      .returns<ClosingHistoryRow[]>(),
    supabase
      .schema("chongmu")
      .from("payroll")
      .select("base_salary, gross_pay, net_pay")
      .eq("pay_year", year)
      .eq("pay_month", month)
      .returns<PayrollRow[]>(),
    supabase
      .schema("chongmu")
      .from("attendance")
      .select("overtime_hours, late_minutes")
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd)
      .returns<AttendanceRow[]>(),
    supabase
      .schema("chongmu")
      .from("expenses")
      .select("amount, vat")
      .gte("expense_date", monthStart)
      .lte("expense_date", monthEnd)
      .returns<ExpenseRow[]>(),
    supabase
      .schema("chongmu")
      .from("employees")
      .select("hire_date, resign_date")
      .or(
        `and(hire_date.gte.${monthStart},hire_date.lte.${monthEnd}),and(resign_date.gte.${monthStart},resign_date.lte.${monthEnd})`,
      )
      .returns<EmployeeJoinRow[]>(),
  ]);

  const taskList = tasks ?? [];
  const historyMap = new Map(
    (history ?? []).map((h) => [h.task_id, h]),
  );
  const decorated = taskList.map((t) => {
    const h = historyMap.get(t.id);
    return {
      ...t,
      isDone: h?.is_done ?? false,
      completedAt: h?.completed_at ?? null,
    };
  });
  const doneCount = decorated.filter((t) => t.isDone).length;
  const total = decorated.length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const totalGross = (payroll ?? []).reduce((s, r) => s + (r.gross_pay || 0), 0);
  const totalNet = (payroll ?? []).reduce((s, r) => s + (r.net_pay || 0), 0);
  const totalOvertime = (attendance ?? []).reduce(
    (s, r) => s + Number(r.overtime_hours || 0),
    0,
  );
  const totalLate = (attendance ?? []).reduce(
    (s, r) => s + (r.late_minutes || 0),
    0,
  );
  const totalExpenses = (expenses ?? []).reduce(
    (s, r) => s + (r.amount || 0) + (r.vat || 0),
    0,
  );
  const newHires = (employees ?? []).filter((e) => {
    if (!e.hire_date) return false;
    return e.hire_date >= monthStart && e.hire_date <= monthEnd;
  }).length;
  const resignations = (employees ?? []).filter((e) => {
    if (!e.resign_date) return false;
    return e.resign_date >= monthStart && e.resign_date <= monthEnd;
  }).length;

  const generatedAt = new Date();
  const stamp = `${generatedAt.getFullYear()}.${String(
    generatedAt.getMonth() + 1,
  ).padStart(2, "0")}.${String(generatedAt.getDate()).padStart(2, "0")} ${String(
    generatedAt.getHours(),
  ).padStart(2, "0")}:${String(generatedAt.getMinutes()).padStart(2, "0")}`;

  return (
    <article className="print-report mx-auto max-w-[820px] bg-white text-slate-900 print:max-w-none">
      <PrintTrigger />

      <header className="mb-5 border-b-2 border-slate-900 pb-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          Nexus ERP · Monthly Closing Report
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {year}년 {month}월 결산 리포트
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          출력 일시: {stamp} · 진행률 {progressPct}% ({doneCount}/{total})
        </p>
      </header>

      <section className="mb-5">
        <h2 className="mb-3 text-lg font-semibold">1. 핵심 운영 지표</h2>
        <div className="grid grid-cols-2 gap-3">
          <KpiCell label="총 급여 (지급)" value={formatKRW(totalGross)} />
          <KpiCell label="총 실지급" value={formatKRW(totalNet)} />
          <KpiCell label="연장근로 시간" value={`${totalOvertime.toFixed(1)} h`} />
          <KpiCell label="총 지각" value={`${Math.round(totalLate)} 분`} />
          <KpiCell label="지출 합계 (VAT 포함)" value={formatKRW(totalExpenses)} />
          <KpiCell label="신규 입사 / 퇴사" value={`${newHires}명 / ${resignations}명`} />
        </div>
      </section>

      <section className="mb-5">
        <h2 className="mb-3 text-lg font-semibold">2. 결산 체크리스트</h2>
        {decorated.length === 0 ? (
          <p className="text-sm text-slate-500">등록된 항목이 없습니다.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100">
                <th className="px-2 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">항목</th>
                <th className="px-2 py-2 text-left">상태</th>
                <th className="px-2 py-2 text-left">완료 시각</th>
              </tr>
            </thead>
            <tbody>
              {decorated.map((t) => (
                <tr key={t.id} className="border-b border-slate-200">
                  <td className="px-2 py-2 align-top tabular-nums text-slate-500">
                    {t.order_no}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <p className="font-medium">{t.title}</p>
                    {t.description ? (
                      <p className="mt-0.5 text-xs text-slate-600">
                        {t.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {t.isDone ? (
                      <span className="inline-flex items-center rounded border border-emerald-700 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        완료
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded border border-amber-700 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                        대기
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top text-xs tabular-nums text-slate-600">
                    {t.completedAt ? formatTimestamp(t.completedAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="report-footer mt-6 border-t border-slate-300 pt-3 text-xs text-slate-500">
        <p>본 리포트는 Nexus ERP 시스템에서 자동 생성되었습니다.</p>
        <p className="mt-1">
          데이터 기준: {monthStart} ~ {monthEnd} · 모든 금액은 KRW
        </p>
      </footer>

      <style>{`
        @page { size: A4; margin: 12mm 14mm; }
        @media print {
          body { background: white !important; }
          .print-report { color: #0f172a !important; padding: 0 !important; }
          .print-report table { page-break-inside: auto; }
          .print-report tr { page-break-inside: avoid; page-break-after: auto; }
          .print-report thead { display: table-header-group; }
          .print-report .report-footer {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-before: avoid;
            break-before: avoid;
          }
          .print-report section { page-break-inside: auto; }
        }
        .print-report { font-family: 'Inter', system-ui, sans-serif; padding: 24px; }
      `}</style>
    </article>
  );
}

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-300 bg-slate-50 px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function formatKRW(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function parseIntInRange(
  value: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  if (n < min || n > max) return fallback;
  return n;
}

function lastDayOfMonth(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}
