/**
 * 월별 급여 일괄 계산 API.
 *
 * POST /api/payroll/calculate
 * Body: { year, month, employeeIds?: string[], mealAllowanceDefault?: number }
 *
 * 활성 직원(또는 employeeIds로 한정) 전원에 대해:
 *  1) 해당 월 근태 합산 → 연장/야간/휴일 시간
 *  2) calculator 체인 실행 (payroll → insurance → income-tax)
 *  3) payroll 테이블에 status='draft'로 upsert (employee_id, pay_year, pay_month 키)
 *
 * 비과세 식대(meal_allowance)는 회사별 일괄 정책 — 기본 200,000원, body로 override 가능.
 * (자가운전·육아수당은 employees 스키마에 컬럼 없어 본 API에서는 0. v2에서 보완.)
 *
 * 인증: Supabase 로그인 사용자(authenticated). MVP = 단일 관리자.
 *
 * Phase 4.2.1.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aggregateAttendance } from "@/lib/attendance/aggregate";
import { calculateGrossPay } from "@/lib/calculators/payroll";
import { calculateInsurance, type InsuranceRates } from "@/lib/calculators/insurance";
import { calculateIncomeTax, type IncomeTaxRow } from "@/lib/calculators/income-tax";
import type { Database } from "@/types/database";

type PayrollInsert = Database["chongmu"]["Tables"]["payroll"]["Insert"];

type InsuranceRatesRow = {
  year: number;
  pension_rate: number;
  health_rate: number;
  ltc_rate: number;
  employment_rate: number;
  pension_min_base: number | null;
  pension_max_base: number | null;
};

type IncomeTaxRowDb = {
  year: number;
  min_salary: number;
  max_salary: number;
  dependents: number;
  tax: number;
};

const DEFAULT_MEAL_ALLOWANCE = 200_000;

const BodySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  employeeIds: z.array(z.string().uuid()).optional(),
  mealAllowanceDefault: z.number().int().min(0).optional(),
});

type EmployeeRow = {
  id: string;
  employee_no: string;
  name: string;
  base_salary: number;
  dependents: number;
  hire_date: string;
};

type AttendanceRow = {
  employee_id: string;
  work_date: string;
  regular_hours: number;
  overtime_hours: number;
  night_hours: number;
  holiday_hours: number;
};

type ProcessedDetail = {
  employee_id: string;
  name: string;
  gross_pay: number;
  total_deduction: number;
  net_pay: number;
  status: "draft";
};

type SkippedDetail = {
  employee_id: string;
  name: string;
  skipped: true;
  error: string;
};

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON body가 필요합니다." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "잘못된 입력" },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const mealAllowance = input.mealAllowanceDefault ?? DEFAULT_MEAL_ALLOWANCE;

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // 1) 직원
  let empQuery = supabase
    .from("employees")
    .select("id, employee_no, name, base_salary, dependents, hire_date")
    .is("deleted_at", null)
    .eq("status", "active");
  if (input.employeeIds && input.employeeIds.length > 0) {
    empQuery = empQuery.in("id", input.employeeIds);
  }
  const { data: employees, error: empErr } = await empQuery.returns<EmployeeRow[]>();
  if (empErr) {
    return NextResponse.json({ error: `직원 조회 실패: ${empErr.message}` }, { status: 500 });
  }
  if (!employees || employees.length === 0) {
    return NextResponse.json({ error: "대상 직원이 없습니다." }, { status: 404 });
  }

  // 2) 근태 (해당 월)
  const monthStart = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
  const monthEnd = lastDayOfMonth(input.year, input.month);
  const empIds = employees.map((e) => e.id);

  const { data: attendance, error: attErr } = await supabase
    .from("attendance")
    .select("employee_id, work_date, regular_hours, overtime_hours, night_hours, holiday_hours")
    .in("employee_id", empIds)
    .gte("work_date", monthStart)
    .lte("work_date", monthEnd)
    .returns<AttendanceRow[]>();
  if (attErr) {
    return NextResponse.json(
      { error: `근태 조회 실패: ${attErr.message}` },
      { status: 500 },
    );
  }

  // 3) 4대보험 요율 (해당 연도)
  const { data: ratesRow, error: rateErr } = await supabase
    .from("insurance_rates")
    .select(
      "year, pension_rate, health_rate, ltc_rate, employment_rate, pension_min_base, pension_max_base",
    )
    .eq("year", input.year)
    .maybeSingle<InsuranceRatesRow>();
  if (rateErr) {
    return NextResponse.json(
      { error: `보험요율 조회 실패: ${rateErr.message}` },
      { status: 500 },
    );
  }
  if (!ratesRow) {
    return NextResponse.json(
      { error: `${input.year}년 보험요율(insurance_rates)이 등록되지 않았습니다.` },
      { status: 412 },
    );
  }
  const rates: InsuranceRates = {
    year: ratesRow.year,
    pensionRate: Number(ratesRow.pension_rate),
    healthRate: Number(ratesRow.health_rate),
    ltcRate: Number(ratesRow.ltc_rate),
    employmentRate: Number(ratesRow.employment_rate),
    pensionMinBase: ratesRow.pension_min_base ?? null,
    pensionMaxBase: ratesRow.pension_max_base ?? null,
  };

  // 4) 간이세액표 (해당 연도, 직원 부양가족수 분량만)
  const dependentsSet = Array.from(new Set(employees.map((e) => e.dependents)));
  const { data: taxRows, error: taxErr } = await supabase
    .from("income_tax_table")
    .select("year, min_salary, max_salary, dependents, tax")
    .eq("year", input.year)
    .in("dependents", dependentsSet)
    .returns<IncomeTaxRowDb[]>();
  if (taxErr) {
    return NextResponse.json(
      { error: `간이세액표 조회 실패: ${taxErr.message}` },
      { status: 500 },
    );
  }
  const taxTable: IncomeTaxRow[] = (taxRows ?? []).map((r) => ({
    year: r.year,
    minSalary: r.min_salary,
    maxSalary: r.max_salary,
    dependents: r.dependents,
    tax: r.tax,
  }));

  // 5) 직원별 근태 집계
  const aggregates = aggregateAttendance(
    (attendance ?? []).map((a) => {
      const emp = employees.find((e) => e.id === a.employee_id)!;
      return {
        employeeId: a.employee_id,
        employeeNo: emp.employee_no,
        name: emp.name,
        workDate: a.work_date,
        regularHours: Number(a.regular_hours),
        overtimeHours: Number(a.overtime_hours),
        nightHours: Number(a.night_hours),
        holidayHours: Number(a.holiday_hours),
      };
    }),
  );
  const aggMap = new Map(aggregates.map((a) => [a.id, a]));

  // 6) 계산 + upsert payload
  const processed: ProcessedDetail[] = [];
  const skipped: SkippedDetail[] = [];
  const upserts: PayrollInsert[] = [];

  for (const emp of employees) {
    const agg = aggMap.get(emp.id);
    const grossResult = calculateGrossPay({
      baseSalary: emp.base_salary,
      overtimeHours: agg?.overtimeHours ?? 0,
      nightHours: agg?.nightHours ?? 0,
      holidayHours: agg?.holidayHours ?? 0,
      mealAllowance,
    });
    if (!grossResult.success) {
      skipped.push({
        employee_id: emp.id,
        name: emp.name,
        skipped: true,
        error: `[grossPay] ${grossResult.error}`,
      });
      continue;
    }
    const gross = grossResult.data;

    const insResult = calculateInsurance(gross.taxableIncome, rates);
    if (!insResult.success) {
      skipped.push({
        employee_id: emp.id,
        name: emp.name,
        skipped: true,
        error: `[insurance] ${insResult.error}`,
      });
      continue;
    }
    const ins = insResult.data;

    const taxResult = calculateIncomeTax(
      gross.taxableIncome,
      emp.dependents,
      taxTable,
      input.year,
    );
    // 표 미매칭은 0원으로 두되 skipped로도 기록 (UI에서 검토필요 표시 가능).
    const incomeTax = taxResult.success ? taxResult.data.incomeTax : 0;
    const localIncomeTax = taxResult.success ? taxResult.data.localIncomeTax : 0;

    const totalDeduction =
      ins.pension + ins.health + ins.ltc + ins.employment + incomeTax + localIncomeTax;
    const netPay = gross.grossPay - totalDeduction;

    upserts.push({
      employee_id: emp.id,
      pay_year: input.year,
      pay_month: input.month,
      base_salary: gross.baseSalaryProrated,
      overtime_pay: gross.overtimePay,
      night_pay: gross.nightPay,
      holiday_pay: gross.holidayPay,
      meal_allowance: gross.mealAllowance,
      position_allowance: gross.positionAllowance,
      other_allowance: gross.otherAllowance,
      gross_pay: gross.grossPay,
      pension_deduction: ins.pension,
      health_deduction: ins.health,
      ltc_deduction: ins.ltc,
      employment_deduction: ins.employment,
      income_tax: incomeTax,
      local_income_tax: localIncomeTax,
      other_deduction: 0,
      total_deduction: totalDeduction,
      net_pay: netPay,
      status: "draft",
      calculated_at: new Date().toISOString(),
      confirmed_at: null,
      paid_at: null,
    });

    processed.push({
      employee_id: emp.id,
      name: emp.name,
      gross_pay: gross.grossPay,
      total_deduction: totalDeduction,
      net_pay: netPay,
      status: "draft",
    });

    if (!taxResult.success) {
      skipped.push({
        employee_id: emp.id,
        name: emp.name,
        skipped: true,
        error: `[incomeTax] ${taxResult.error} (소득세 0원으로 임시 저장)`,
      });
    }
  }

  // 7) Upsert
  if (upserts.length > 0) {
    const { error: upsertErr } = await supabase
      .schema("chongmu")
      .from("payroll")
      .upsert(upserts, { onConflict: "employee_id,pay_year,pay_month" });
    if (upsertErr) {
      return NextResponse.json(
        { error: `payroll upsert 실패: ${upsertErr.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    year: input.year,
    month: input.month,
    processed: processed.length,
    skipped: skipped.length,
    details: [...processed, ...skipped],
  });
}

function lastDayOfMonth(year: number, month: number): string {
  // month: 1~12. 다음 달 0일 = 이번 달 마지막 일.
  const d = new Date(Date.UTC(year, month, 0));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
