import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { YearEndForm } from "./_form";

export const dynamic = "force-dynamic";

type Settlement = {
  spouse: boolean;
  children_count: number;
  elder_count: number;
  disabled_count: number;
  insurance_premium: number;
  medical_expense: number;
  education_expense: number;
  donation: number;
  housing_loan: number;
  pension_account: number;
  credit_card: number;
  cash_receipt: number;
  notes: string | null;
};

export default async function YearEndDetailPage({
  params,
  searchParams,
}: {
  params: { employeeId: string };
  searchParams: { year?: string };
}) {
  const year = Number(searchParams.year) || new Date().getFullYear();
  const supabase = createClient();

  const { data: emp } = await supabase
    .schema("chongmu")
    .from("employees")
    .select("id, employee_no, name, base_salary, dependents, status")
    .eq("id", params.employeeId)
    .maybeSingle();

  if (!emp) notFound();

  const { data: existing } = await supabase
    .schema("chongmu")
    .from("year_end_settlements")
    .select(
      "spouse, children_count, elder_count, disabled_count, insurance_premium, medical_expense, education_expense, donation, housing_loan, pension_account, credit_card, cash_receipt, notes",
    )
    .eq("employee_id", params.employeeId)
    .eq("year", year)
    .maybeSingle<Settlement>();

  return (
    <div className="space-y-stack-lg">
      <Link
        href={`/year-end?year=${year}` as never}
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        연말정산 목록
      </Link>

      <header>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          {emp.name} · {year}년 연말정산
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          사번 {emp.employee_no} · 기본급 {emp.base_salary.toLocaleString("ko-KR")}원 (월) ·
          기존 부양가족 {emp.dependents}명
        </p>
      </header>

      <YearEndForm
        employeeId={emp.id}
        baseSalary={emp.base_salary}
        currentDependents={emp.dependents}
        year={year}
        initial={existing ?? undefined}
      />
    </div>
  );
}
