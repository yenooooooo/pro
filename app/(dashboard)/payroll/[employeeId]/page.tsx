import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/utils/format";
import { maskBankAccount } from "@/lib/utils/mask";
import { cn } from "@/lib/utils/cn";
import { PrintButton } from "./_components/print-button";

const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 4;

type EmployeeForPayslip = {
  id: string;
  employee_no: string;
  name: string;
  hire_date: string;
  bank_name: string | null;
  bank_account: string | null;
  dependents: number;
  department: { name: string } | null;
  position: { name: string } | null;
};

type PayrollDetail = {
  id: string;
  pay_year: number;
  pay_month: number;
  base_salary: number;
  overtime_pay: number;
  night_pay: number;
  holiday_pay: number;
  meal_allowance: number;
  position_allowance: number;
  other_allowance: number;
  gross_pay: number;
  pension_deduction: number;
  health_deduction: number;
  ltc_deduction: number;
  employment_deduction: number;
  income_tax: number;
  local_income_tax: number;
  other_deduction: number;
  total_deduction: number;
  net_pay: number;
  status: string;
  calculated_at: string;
  confirmed_at: string | null;
  paid_at: string | null;
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  draft: {
    label: "초안",
    tone: "border-outline-variant/40 bg-surface-container text-on-surface-variant",
  },
  confirmed: {
    label: "확정",
    tone: "border-tertiary-sky/30 bg-tertiary-sky/10 text-tertiary-sky",
  },
  paid: {
    label: "지급완료",
    tone: "border-primary-electric/30 bg-primary-electric/10 text-primary-electric",
  },
};

export default async function PayslipPage({
  params,
  searchParams,
}: {
  params: { employeeId: string };
  searchParams?: { year?: string; month?: string };
}) {
  const year = parseIntInRange(searchParams?.year, 2000, 2100, DEFAULT_YEAR);
  const month = parseIntInRange(searchParams?.month, 1, 12, DEFAULT_MONTH);

  const supabase = createClient();

  const [{ data: emp }, { data: payroll }] = await Promise.all([
    supabase
      .from("employees")
      .select(
        `id, employee_no, name, hire_date, bank_name, bank_account, dependents,
         department:departments(name),
         position:positions(name)`,
      )
      .eq("id", params.employeeId)
      .maybeSingle()
      .returns<EmployeeForPayslip | null>(),
    supabase
      .from("payroll")
      .select(
        "id, pay_year, pay_month, base_salary, overtime_pay, night_pay, holiday_pay, meal_allowance, position_allowance, other_allowance, gross_pay, pension_deduction, health_deduction, ltc_deduction, employment_deduction, income_tax, local_income_tax, other_deduction, total_deduction, net_pay, status, calculated_at, confirmed_at, paid_at",
      )
      .eq("employee_id", params.employeeId)
      .eq("pay_year", year)
      .eq("pay_month", month)
      .maybeSingle()
      .returns<PayrollDetail | null>(),
  ]);

  if (!emp) notFound();

  const statusBadge = payroll
    ? (STATUS_LABEL[payroll.status] ?? STATUS_LABEL.draft)
    : null;

  return (
    <div className="space-y-stack-lg print:space-y-0">
      {/* 화면에서만 보이는 네비게이션 */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/payroll?year=${year}&month=${month}`}
          className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          급여 목록으로
        </Link>
        {payroll ? <PrintButton /> : null}
      </div>

      {payroll ? (
        <Payslip emp={emp} payroll={payroll} statusBadge={statusBadge!} />
      ) : (
        <NotCalculated emp={emp} year={year} month={month} />
      )}
    </div>
  );
}

function Payslip({
  emp,
  payroll,
  statusBadge,
}: {
  emp: EmployeeForPayslip;
  payroll: PayrollDetail;
  statusBadge: { label: string; tone: string };
}) {
  const earnings: Array<{ label: string; amount: number; nonTaxable?: boolean }> = [
    { label: "기본급", amount: payroll.base_salary },
    { label: "연장근로수당", amount: payroll.overtime_pay },
    { label: "야간근로수당", amount: payroll.night_pay },
    { label: "휴일근로수당", amount: payroll.holiday_pay },
    { label: "직책수당", amount: payroll.position_allowance },
    { label: "기타수당", amount: payroll.other_allowance },
    { label: "식대", amount: payroll.meal_allowance, nonTaxable: true },
  ].filter((r) => r.amount > 0);

  const deductions: Array<{ label: string; amount: number }> = [
    { label: "국민연금", amount: payroll.pension_deduction },
    { label: "건강보험", amount: payroll.health_deduction },
    { label: "장기요양보험", amount: payroll.ltc_deduction },
    { label: "고용보험", amount: payroll.employment_deduction },
    { label: "근로소득세", amount: payroll.income_tax },
    { label: "지방소득세", amount: payroll.local_income_tax },
    { label: "기타공제", amount: payroll.other_deduction },
  ].filter((r) => r.amount > 0);

  return (
    <div className="glass-panel rounded-xl p-8 print:rounded-none print:border-none print:bg-white print:p-0 print:text-black print:shadow-none">
      {/* 헤더 — 페이지 분할 방지 */}
      <div className="break-inside-avoid border-b border-outline-variant/30 pb-6 print:pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-label-sm uppercase tracking-widest text-on-surface-variant print:text-black/60">
              Nexus ERP · Payroll Statement
            </p>
            <h1 className="mt-1 text-headline-lg font-bold tracking-tight text-on-surface print:text-black">
              {payroll.pay_year}년 {payroll.pay_month}월 급여명세서
            </h1>
          </div>
          <span
            className={cn(
              "inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-label-sm font-semibold print:hidden",
              statusBadge.tone,
            )}
          >
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* 직원·지급정보 — 페이지 분할 방지 */}
      <div className="grid break-inside-avoid grid-cols-1 gap-6 border-b border-outline-variant/30 py-6 md:grid-cols-2 print:gap-4 print:py-3">
        <InfoBlock title="직원 정보">
          <InfoRow label="이름" value={emp.name} />
          <InfoRow label="사번" value={emp.employee_no} mono />
          <InfoRow label="부서" value={emp.department?.name ?? "—"} />
          <InfoRow label="직급" value={emp.position?.name ?? "—"} />
          <InfoRow label="입사일" value={emp.hire_date} mono />
          <InfoRow label="공제대상가족" value={`${emp.dependents}명`} mono />
        </InfoBlock>

        <InfoBlock title="지급 정보">
          <InfoRow label="지급 기간" value={`${payroll.pay_year}년 ${payroll.pay_month}월`} mono />
          <InfoRow
            label="계산일시"
            value={formatTimestamp(payroll.calculated_at)}
            mono
          />
          <InfoRow
            label="확정일시"
            value={payroll.confirmed_at ? formatTimestamp(payroll.confirmed_at) : "—"}
            mono
          />
          <InfoRow
            label="지급일자"
            value={payroll.paid_at ? formatTimestamp(payroll.paid_at) : "미지급"}
            mono
          />
          <InfoRow label="입금 은행" value={emp.bank_name ?? "—"} />
          <InfoRow
            label="입금 계좌"
            value={maskBankAccount(emp.bank_account)}
            mono
          />
        </InfoBlock>
      </div>

      {/* 지급/공제 표 — 각 표 페이지 분할 방지 */}
      <div className="grid grid-cols-1 gap-6 py-6 lg:grid-cols-2 print:gap-4 print:py-3">
        <div className="break-inside-avoid">
          <PayslipTable
            title="지급 항목"
            rows={earnings}
            totalLabel="지급 합계"
            total={payroll.gross_pay}
          />
        </div>
        <div className="break-inside-avoid">
          <PayslipTable
            title="공제 항목"
            rows={deductions}
            totalLabel="공제 합계"
            total={payroll.total_deduction}
            tone="error"
          />
        </div>
      </div>

      {/* 실지급액 — 페이지 분할 방지 */}
      <div className="break-inside-avoid rounded-xl border-2 border-primary-electric/40 bg-primary-electric/5 p-6 print:border print:border-black print:bg-transparent print:p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-label-sm uppercase tracking-widest text-primary-electric print:text-black/70">
              Net Pay · 실지급액
            </p>
            <p className="mt-1 text-body-md text-on-surface-variant print:text-black/60">
              지급 합계 - 공제 합계
            </p>
          </div>
          <p className="text-display-xl font-bold tracking-tighter tabular-nums text-on-surface print:text-black">
            {formatKRW(payroll.net_pay)}
          </p>
        </div>
      </div>

      {/* 서명 영역 (인쇄 전용) — 페이지 분할 방지 + 푸터와 묶기 */}
      <div className="hidden break-inside-avoid grid-cols-2 gap-12 pt-12 print:grid print:pt-8">
        <SignatureBlock title="회사" />
        <SignatureBlock title="수령인" />
      </div>

      <p className="mt-6 break-inside-avoid text-label-sm text-outline print:mt-3 print:text-black/50">
        본 명세서는 근로기준법 제48조에 따라 임금의 구성항목·계산방법·공제내역을 명시합니다.
      </p>
    </div>
  );
}

function NotCalculated({
  emp,
  year,
  month,
}: {
  emp: EmployeeForPayslip;
  year: number;
  month: number;
}) {
  return (
    <div className="glass-panel rounded-xl p-12 text-center">
      <h2 className="text-headline-md font-semibold text-on-surface">
        {year}년 {month}월 급여 미계산
      </h2>
      <p className="mt-2 text-body-md text-on-surface-variant">
        {emp.name}({emp.employee_no})의 해당 월 급여가 아직 계산되지 않았습니다.
      </p>
      <Link
        href={`/payroll?year=${year}&month=${month}`}
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary-electric/40 bg-primary-electric/10 px-4 text-label-sm font-semibold text-primary-electric transition-colors hover:bg-primary-electric/20"
      >
        급여 페이지에서 일괄 계산하기
      </Link>
    </div>
  );
}

function PayslipTable({
  title,
  rows,
  totalLabel,
  total,
  tone = "default",
}: {
  title: string;
  rows: Array<{ label: string; amount: number; nonTaxable?: boolean }>;
  totalLabel: string;
  total: number;
  tone?: "default" | "error";
}) {
  return (
    <section className="rounded-xl border border-outline-variant/30 print:border-black/30">
      <h3
        className={cn(
          "border-b border-outline-variant/30 px-4 py-3 text-headline-md font-semibold print:border-black/30",
          tone === "error" ? "text-error-soft print:text-black" : "text-on-surface print:text-black",
        )}
      >
        {title}
      </h3>
      <table className="w-full text-data-tabular">
        <tbody className="divide-y divide-outline-variant/20 print:divide-black/20">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-3 text-on-surface-variant print:text-black/60" colSpan={2}>
                해당 항목 없음
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.label} className="break-inside-avoid">
                <td className="px-4 py-2.5 text-on-surface print:text-black">
                  {r.label}
                  {r.nonTaxable ? (
                    <span className="ml-1.5 rounded border border-tertiary-sky/30 bg-tertiary-sky/10 px-1.5 py-0.5 text-[10px] font-semibold text-tertiary-sky print:border-black/40 print:bg-transparent print:text-black/70">
                      비과세
                    </span>
                  ) : null}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right tabular-nums",
                    tone === "error"
                      ? "text-error-soft print:text-black"
                      : "text-on-surface print:text-black",
                  )}
                >
                  {tone === "error" ? `-${formatKRW(r.amount)}` : formatKRW(r.amount)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-outline-variant/40 bg-surface-container/30 print:border-black/40 print:bg-transparent">
            <td className="px-4 py-3 text-label-sm font-semibold text-on-surface print:text-black">
              {totalLabel}
            </td>
            <td
              className={cn(
                "px-4 py-3 text-right text-headline-md font-bold tabular-nums",
                tone === "error"
                  ? "text-error-soft print:text-black"
                  : "text-on-surface print:text-black",
              )}
            >
              {tone === "error" ? `-${formatKRW(total)}` : formatKRW(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-label-sm font-semibold uppercase tracking-widest text-on-surface-variant print:text-black/60">
        {title}
      </h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-body-md text-on-surface-variant print:text-black/70">{label}</dt>
      <dd
        className={cn(
          "text-body-md text-on-surface print:text-black",
          mono && "tabular-nums",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function SignatureBlock({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 text-label-sm font-semibold text-black/70">{title}</p>
      <div className="h-20 w-full border-b border-black/40" />
      <p className="mt-2 text-label-sm text-black/50">(서명 또는 인)</p>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
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
