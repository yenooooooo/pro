/**
 * 직원 전체 명부 엑셀 내보내기.
 *
 * GET /api/employees/export
 *
 * 활성 직원(deleted_at is null)을 부서·직급 정보와 함께 .xlsx로 응답.
 */

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

type EmployeeRow = {
  employee_no: string | null;
  name: string;
  status: string;
  hire_date: string | null;
  resign_date: string | null;
  base_salary: number | null;
  dependents: number | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  bank: string | null;
  bank_account: string | null;
  departments: { name: string } | null;
  positions: { name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  active: "재직",
  leave: "휴직",
  resigned: "퇴사",
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .schema("chongmu")
    .from("employees")
    .select(
      `employee_no, name, status, hire_date, resign_date, base_salary,
       dependents, birth_date, phone, email, bank, bank_account,
       departments:department_id (name),
       positions:position_id (name)`,
    )
    .is("deleted_at", null)
    .order("employee_no", { ascending: true })
    .returns<EmployeeRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Nexus ERP";
  const ws = wb.addWorksheet("직원 명부");

  ws.columns = [
    { header: "사번", key: "employee_no", width: 12 },
    { header: "이름", key: "name", width: 10 },
    { header: "부서", key: "department", width: 14 },
    { header: "직급", key: "position", width: 12 },
    { header: "상태", key: "status", width: 8 },
    { header: "입사일", key: "hire_date", width: 12 },
    { header: "퇴사일", key: "resign_date", width: 12 },
    { header: "기본급", key: "base_salary", width: 12 },
    { header: "부양가족", key: "dependents", width: 10 },
    { header: "생년월일", key: "birth_date", width: 12 },
    { header: "전화", key: "phone", width: 14 },
    { header: "이메일", key: "email", width: 24 },
    { header: "은행", key: "bank", width: 10 },
    { header: "계좌번호", key: "bank_account", width: 18 },
  ];

  for (const row of rows ?? []) {
    ws.addRow({
      employee_no: row.employee_no ?? "",
      name: row.name,
      department: row.departments?.name ?? "",
      position: row.positions?.name ?? "",
      status: STATUS_LABEL[row.status] ?? row.status,
      hire_date: row.hire_date ?? "",
      resign_date: row.resign_date ?? "",
      base_salary: row.base_salary ?? 0,
      dependents: row.dependents ?? 0,
      birth_date: row.birth_date ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      bank: row.bank ?? "",
      bank_account: maskBankAccount(row.bank_account),
    });
  }

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E7FF" },
  };
  header.alignment = { vertical: "middle", horizontal: "center" };

  ws.getColumn("base_salary").numFmt = "#,##0";

  const buffer = await wb.xlsx.writeBuffer();
  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const filename = `employees_${stamp}.xlsx`;

  await recordAudit({
    action: "report.exported",
    entityType: "report",
    metadata: { kind: "employees", count: rows?.length ?? 0 },
  });

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

/** CLAUDE.md §8 — 계좌번호는 마스킹. 4자리만 노출. */
function maskBankAccount(account: string | null): string {
  if (!account) return "";
  const cleaned = account.replace(/\s/g, "");
  if (cleaned.length <= 4) return cleaned;
  return `****${cleaned.slice(-4)}`;
}
