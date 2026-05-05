/**
 * 퇴직급여 충당부채 엑셀 내보내기.
 * GET /api/retirement/export
 */

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";
import { calcProvision } from "@/lib/retirement/calculator";

type EmpRow = {
  id: string;
  employee_no: string | null;
  name: string;
  hire_date: string;
  base_salary: number;
  status: string;
  departments: { name: string } | null;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: emps } = await supabase
    .schema("chongmu")
    .from("employees")
    .select(
      "id, employee_no, name, hire_date, base_salary, status, departments:department_id(name)",
    )
    .eq("status", "active")
    .is("deleted_at", null)
    .order("hire_date", { ascending: true })
    .returns<EmpRow[]>();

  const today = new Date();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Nexus ERP";
  const ws = wb.addWorksheet("퇴직급여 충당부채");

  ws.columns = [
    { header: "사번", key: "employee_no", width: 12 },
    { header: "이름", key: "name", width: 10 },
    { header: "부서", key: "department", width: 14 },
    { header: "입사일", key: "hire_date", width: 12 },
    { header: "근속일", key: "tenure_days", width: 10 },
    { header: "근속연수", key: "tenure_years", width: 12 },
    { header: "기본급", key: "base_salary", width: 14 },
    { header: "충당금", key: "provision", width: 16 },
    { header: "유형", key: "plan_type", width: 8 },
  ];

  let total = 0;
  for (const e of emps ?? []) {
    const calc = calcProvision({
      hire_date: e.hire_date,
      base_salary: e.base_salary,
      baseDate: today,
    });
    total += calc.provision;
    ws.addRow({
      employee_no: e.employee_no ?? "",
      name: e.name,
      department: e.departments?.name ?? "",
      hire_date: e.hire_date,
      tenure_days: calc.tenure_days,
      tenure_years: Number(calc.tenure_years.toFixed(2)),
      base_salary: e.base_salary,
      provision: calc.provision,
      plan_type: "DB",
    });
  }

  // 헤더 스타일
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E7FF" },
  };
  header.alignment = { vertical: "middle", horizontal: "center" };

  ws.getColumn("base_salary").numFmt = "#,##0";
  ws.getColumn("provision").numFmt = "#,##0";
  ws.getColumn("tenure_years").numFmt = "0.00";

  // 합계 행
  if ((emps?.length ?? 0) > 0) {
    const tr = ws.addRow({
      employee_no: "",
      name: "합계",
      department: "",
      hire_date: "",
      tenure_days: "",
      tenure_years: "",
      base_salary: "",
      provision: total,
      plan_type: "",
    });
    tr.font = { bold: true };
    tr.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  await recordAudit({
    action: "report.exported",
    entityType: "report",
    metadata: { kind: "retirement", count: emps?.length ?? 0, total },
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="retirement_${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
