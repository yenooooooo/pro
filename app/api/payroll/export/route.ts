/**
 * 월별 급여 엑셀 내보내기.
 *
 * GET /api/payroll/export?year=2026&month=4
 *
 * 해당 월의 모든 payroll 행을 직원 정보(이름·사번·부서)와 함께 .xlsx로 스트림 응답.
 * Phase 10.8 — 엑셀 I/O.
 */

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

type PayrollRow = {
  employee_id: string;
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
  employees: {
    employee_no: string;
    name: string;
    departments: { name: string } | null;
  } | null;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "year 형식 오류" }, { status: 400 });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "month 1~12" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .schema("chongmu")
    .from("payroll")
    .select(
      `employee_id, pay_year, pay_month,
       base_salary, overtime_pay, night_pay, holiday_pay,
       meal_allowance, position_allowance, other_allowance,
       gross_pay,
       pension_deduction, health_deduction, ltc_deduction, employment_deduction,
       income_tax, local_income_tax, other_deduction,
       total_deduction, net_pay, status,
       employees:employee_id (employee_no, name, departments:department_id (name))`,
    )
    .eq("pay_year", year)
    .eq("pay_month", month)
    .order("employee_id")
    .returns<PayrollRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Nexus ERP";
  const ws = wb.addWorksheet(`${year}년 ${month}월 급여`);

  ws.columns = [
    { header: "사번", key: "employee_no", width: 12 },
    { header: "이름", key: "name", width: 10 },
    { header: "부서", key: "department", width: 14 },
    { header: "기본급", key: "base_salary", width: 12 },
    { header: "연장수당", key: "overtime_pay", width: 12 },
    { header: "야간수당", key: "night_pay", width: 12 },
    { header: "휴일수당", key: "holiday_pay", width: 12 },
    { header: "식대", key: "meal_allowance", width: 10 },
    { header: "직책수당", key: "position_allowance", width: 12 },
    { header: "기타수당", key: "other_allowance", width: 12 },
    { header: "총지급", key: "gross_pay", width: 14 },
    { header: "국민연금", key: "pension_deduction", width: 12 },
    { header: "건강보험", key: "health_deduction", width: 12 },
    { header: "장기요양", key: "ltc_deduction", width: 12 },
    { header: "고용보험", key: "employment_deduction", width: 12 },
    { header: "소득세", key: "income_tax", width: 12 },
    { header: "지방소득세", key: "local_income_tax", width: 12 },
    { header: "기타공제", key: "other_deduction", width: 12 },
    { header: "공제계", key: "total_deduction", width: 14 },
    { header: "실지급", key: "net_pay", width: 14 },
    { header: "상태", key: "status", width: 10 },
  ];

  for (const row of rows ?? []) {
    ws.addRow({
      employee_no: row.employees?.employee_no ?? "",
      name: row.employees?.name ?? "",
      department: row.employees?.departments?.name ?? "",
      base_salary: row.base_salary,
      overtime_pay: row.overtime_pay,
      night_pay: row.night_pay,
      holiday_pay: row.holiday_pay,
      meal_allowance: row.meal_allowance,
      position_allowance: row.position_allowance,
      other_allowance: row.other_allowance,
      gross_pay: row.gross_pay,
      pension_deduction: row.pension_deduction,
      health_deduction: row.health_deduction,
      ltc_deduction: row.ltc_deduction,
      employment_deduction: row.employment_deduction,
      income_tax: row.income_tax,
      local_income_tax: row.local_income_tax,
      other_deduction: row.other_deduction,
      total_deduction: row.total_deduction,
      net_pay: row.net_pay,
      status: row.status,
    });
  }

  // Header row 스타일
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E7FF" },
  };
  header.alignment = { vertical: "middle", horizontal: "center" };

  // 금액 컬럼 천단위 포맷
  const moneyCols = [
    "base_salary",
    "overtime_pay",
    "night_pay",
    "holiday_pay",
    "meal_allowance",
    "position_allowance",
    "other_allowance",
    "gross_pay",
    "pension_deduction",
    "health_deduction",
    "ltc_deduction",
    "employment_deduction",
    "income_tax",
    "local_income_tax",
    "other_deduction",
    "total_deduction",
    "net_pay",
  ];
  for (const key of moneyCols) {
    ws.getColumn(key).numFmt = "#,##0";
  }

  // 합계 행
  if ((rows?.length ?? 0) > 0) {
    const totalRowIdx = ws.rowCount + 1;
    const totalRow = ws.addRow({
      employee_no: "",
      name: "합계",
      department: "",
      base_salary: sum(rows ?? [], "base_salary"),
      overtime_pay: sum(rows ?? [], "overtime_pay"),
      night_pay: sum(rows ?? [], "night_pay"),
      holiday_pay: sum(rows ?? [], "holiday_pay"),
      meal_allowance: sum(rows ?? [], "meal_allowance"),
      position_allowance: sum(rows ?? [], "position_allowance"),
      other_allowance: sum(rows ?? [], "other_allowance"),
      gross_pay: sum(rows ?? [], "gross_pay"),
      pension_deduction: sum(rows ?? [], "pension_deduction"),
      health_deduction: sum(rows ?? [], "health_deduction"),
      ltc_deduction: sum(rows ?? [], "ltc_deduction"),
      employment_deduction: sum(rows ?? [], "employment_deduction"),
      income_tax: sum(rows ?? [], "income_tax"),
      local_income_tax: sum(rows ?? [], "local_income_tax"),
      other_deduction: sum(rows ?? [], "other_deduction"),
      total_deduction: sum(rows ?? [], "total_deduction"),
      net_pay: sum(rows ?? [], "net_pay"),
      status: "",
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    void totalRowIdx;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `payroll_${year}_${String(month).padStart(2, "0")}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function sum<K extends keyof PayrollRow>(rows: PayrollRow[], key: K): number {
  return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
}
