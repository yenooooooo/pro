import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("payroll");
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
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M04</b>Records · Payroll
          </div>
          <h1 className="page-h">
            급여 <em>{year}.{String(month).padStart(2, "0")}.</em>
          </h1>
          <p className="page-sub">
            {t("subtitle")} · 계산 {calculated}/{totalEmployees}명 · 확정 {confirmedCount}건
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/payroll/export?year=${year}&month=${month}`}
            download={`payroll_${year}_${String(month).padStart(2, "0")}.xlsx`}
            className={cn(
              "btn",
              calculated === 0 && "pointer-events-none cursor-not-allowed opacity-50",
            )}
            aria-disabled={calculated === 0}
          >
            <Download aria-hidden className="h-[14px] w-[14px]" />
            엑셀 내보내기
          </a>
          <ConfirmBatchButton year={year} month={month} draftCount={draftDbCount} />
        </div>
      </header>

      {/* ===== KPIs (총지급 / 공제 / 실지급) ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-3">
        <div className="kpi-card">
          <div className="kpi-l">총 지급액</div>
          <div className="kpi-v">
            <span className="cur">₩</span>
            {aggTotalGross.toLocaleString("ko-KR")}
          </div>
          <div className="kpi-meta">
            <span>기본급 + 수당</span>
            <span>{calculated}명</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">총 공제액</div>
          <div className={cn("kpi-v", aggTotalDeduct > 0 ? "warn" : "")}>
            <span className="cur">₩</span>
            {aggTotalDeduct.toLocaleString("ko-KR")}
          </div>
          <div className="kpi-meta">
            <span>4대보험 + 소득세</span>
            <span>
              {aggTotalGross > 0
                ? `${((aggTotalDeduct / aggTotalGross) * 100).toFixed(1)}%`
                : "—"}
            </span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">실지급 총액</div>
          <div className={cn("kpi-v", aggNet < 0 ? "danger" : "")}>
            <span className="cur">₩</span>
            {aggNet.toLocaleString("ko-KR")}
          </div>
          <div className="kpi-meta">
            <span>
              {year}년 {month}월 마감
            </span>
            <span>
              검토 {reviewCount}건
            </span>
          </div>
        </div>
      </div>

      {/* ===== Batch Calculation ===== */}
      <section className="panel mb-9">
        <div className="panel-h">
          <div className="t font-serif">
            배치 <em>계산</em>
          </div>
          <div className="meta">
            {year}년 {month}월 · {progressPct}%
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
              완료 {calculated} / {totalEmployees}
            </div>
            <div className="h-px w-[280px] bg-line">
              <div
                aria-hidden
                className="h-px bg-gold"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="font-mono text-[11px] text-text-2">
              <span
                className={cn(
                  progressPct === 100
                    ? "text-[#6BCB8A]"
                    : progressPct > 0
                      ? "text-gold"
                      : "text-text-3",
                )}
              >
                {progressPct === 100 ? "완료" : progressPct > 0 ? "처리 중" : "대기"}
              </span>
            </div>
          </div>
          <BatchRunButtons year={year} month={month} hasExisting={calculated > 0} />
        </div>
      </section>

      {/* ===== Filter + Table ===== */}
      <section className="panel mb-9">
        <div className="panel-h">
          <div className="t font-serif">
            직원별 <em>급여명세서</em>
          </div>
          <div className="meta">{rows.length}건 표시</div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <PeriodFilter year={year} month={month} />
        </div>

        {rows.length === 0 ? (
          <EmptyState year={year} month={month} totalEmployees={totalEmployees} />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[860px]">
              <thead>
                <tr>
                  <th>{t("col_employee")}</th>
                  <th className="text-right">{t("item_base")}</th>
                  <th className="text-right">수당</th>
                  <th className="text-right">{t("col_deduction")}</th>
                  <th className="text-right">{t("col_net")}</th>
                  <th className="text-center">{t("col_status")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <PayrollTableRow key={row.id} row={row} year={year} month={month} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
  let alertMessage: string | undefined;
  if (r.net_pay < 0) {
    status = "review";
    alertMessage = "실지급 음수";
  } else if (suspectTax) {
    status = "review";
    alertMessage = "세액 미산정";
  } else if (r.status === "confirmed" || r.status === "paid") {
    status = "confirmed";
  } else {
    status = "draft";
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
    <div className="flex flex-col items-center justify-center gap-3 border border-line bg-bg-1/40 px-6 py-16 text-center">
      <div className="font-serif text-[24px] text-text-1">
        {year}년 {month}월 급여 <em className="not-italic italic text-gold">미계산</em>
      </div>
      <div className="max-w-sm font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
        활성 직원 {totalEmployees}명 · 우측 실행 버튼으로 일괄 계산
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
    <tr>
      <td>
        <Link
          href={payslipHref}
          className="flex flex-col outline-none transition-colors hover:text-gold focus-visible:text-gold"
        >
          <span className="text-text-1">{row.name}</span>
          <span
            className={cn(
              "font-mono text-[10px] tracking-[0.05em]",
              isException ? "text-[#E06B5F]" : "text-text-3",
            )}
          >
            {isException ? row.alertMessage : row.employeeNo}
          </span>
        </Link>
      </td>
      <td className="n">{formatKRW(row.base)}</td>
      <td className="n">
        {row.allowance > 0 ? `+${formatKRW(row.allowance)}` : formatKRW(0)}
      </td>
      <td className="n">
        {row.deduction > 0 ? (
          <span className="text-[#E06B5F]">-{formatKRW(row.deduction)}</span>
        ) : (
          <span className="text-text-3">—</span>
        )}
      </td>
      <td className="n">
        <span className={row.netPay < 0 ? "text-[#E06B5F]" : "text-text-1"}>
          {formatKRW(row.netPay)}
        </span>
      </td>
      <td className="text-center">
        <StatusBadge status={row.status} />
      </td>
      <td className="text-right">
        <Link
          href={payslipHref}
          aria-label={`${row.name} 명세서 보기`}
          className="inline-flex h-8 w-8 items-center justify-center text-text-3 transition-colors hover:text-gold"
        >
          <FileText className="h-[16px] w-[16px]" />
        </Link>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  if (status === "confirmed") {
    return (
      <span className="chip ok">
        <i />
        확정
      </span>
    );
  }
  if (status === "review") {
    return (
      <span className="chip rej">
        <i />
        검토필요
      </span>
    );
  }
  return (
    <span className="chip pend">
      <i />
      초안
    </span>
  );
}
