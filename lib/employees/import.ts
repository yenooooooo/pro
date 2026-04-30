"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

/**
 * 직원 일괄 등록 — .xlsx 파싱 → 검증 → bulk insert.
 *
 * 헤더: 사번, 이름, 부서, 직급, 입사일, 기본급, 부양가족, 생년월일?, 전화?, 이메일?, 은행?, 계좌?
 *  - 부서/직급은 이름으로 매핑(없으면 자동 생성하지 않음 — 에러).
 *  - 입사일: YYYY-MM-DD 또는 Excel 날짜.
 *  - 기본급: 정수.
 *  - 부양가족: 1~11.
 *  - 동일 사번이 이미 있으면 skip.
 */

export type ImportSummary = {
  totalRows: number;
  inserted: number;
  skipped: { row: number; reason: string }[];
  fatal: string | null;
};

const HEADER_MAP = {
  employee_no: ["사번", "employee_no", "employee no"],
  name: ["이름", "name"],
  department: ["부서", "department"],
  position: ["직급", "position"],
  hire_date: ["입사일", "hire_date", "hire date"],
  base_salary: ["기본급", "base_salary", "base salary"],
  dependents: ["부양가족", "부양가족수", "dependents"],
  birth_date: ["생년월일", "birth_date", "birth date"],
  phone: ["전화", "전화번호", "phone"],
  email: ["이메일", "email"],
  bank_name: ["은행", "은행명", "bank_name"],
  bank_account: ["계좌", "계좌번호", "bank_account"],
} as const;

type FieldKey = keyof typeof HEADER_MAP;

export async function importEmployeesXlsxAction(formData: FormData): Promise<ImportSummary> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { totalRows: 0, inserted: 0, skipped: [], fatal: "파일을 선택하세요." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { totalRows: 0, inserted: 0, skipped: [], fatal: "10MB 이하 파일만 지원합니다." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { totalRows: 0, inserted: 0, skipped: [], fatal: "인증이 필요합니다." };
  }

  let workbook: ExcelJS.Workbook;
  try {
    const arrayBuf = await file.arrayBuffer();
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuf);
  } catch (err) {
    return {
      totalRows: 0,
      inserted: 0,
      skipped: [],
      fatal: `엑셀 파일을 읽을 수 없습니다: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { totalRows: 0, inserted: 0, skipped: [], fatal: "시트가 비어있습니다." };
  }

  // 1행 헤더 매핑
  const headerRow = sheet.getRow(1);
  const colIndex: Partial<Record<FieldKey, number>> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const text = String(cell.text ?? "").trim().toLowerCase();
    for (const [field, aliases] of Object.entries(HEADER_MAP) as [FieldKey, readonly string[]][]) {
      if (aliases.some((a) => a.toLowerCase() === text)) {
        colIndex[field] = col;
      }
    }
  });

  for (const required of ["employee_no", "name", "department", "position", "hire_date", "base_salary"] as const) {
    if (!colIndex[required]) {
      return {
        totalRows: 0,
        inserted: 0,
        skipped: [],
        fatal: `필수 컬럼 누락: ${HEADER_MAP[required][0]}`,
      };
    }
  }

  // 부서·직급 사전 조회
  const [deptRes, posRes] = await Promise.all([
    supabase.from("departments").select("id, name").returns<{ id: string; name: string }[]>(),
    supabase.from("positions").select("id, name").returns<{ id: string; name: string }[]>(),
  ]);
  const deptByName = new Map((deptRes.data ?? []).map((d) => [d.name.trim(), d.id]));
  const posByName = new Map((posRes.data ?? []).map((p) => [p.name.trim(), p.id]));

  const skipped: ImportSummary["skipped"] = [];
  type EmployeeInsert = {
    employee_no: string;
    name: string;
    department_id: string;
    position_id: string;
    hire_date: string;
    base_salary: number;
    dependents: number;
    birth_date: string | null;
    phone: string | null;
    email: string | null;
    bank_name: string | null;
    bank_account: string | null;
    status: string;
  };
  const inserts: EmployeeInsert[] = [];
  let totalRows = 0;

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;
    totalRows++;

    const get = (field: FieldKey): string => {
      const col = colIndex[field];
      if (!col) return "";
      const cell = row.getCell(col);
      const val = cell.value;
      if (val === null || val === undefined) return "";
      if (val instanceof Date) {
        const yyyy = val.getFullYear();
        const mm = String(val.getMonth() + 1).padStart(2, "0");
        const dd = String(val.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
      if (typeof val === "object" && "result" in val) return String(val.result ?? "");
      if (typeof val === "object" && "text" in val) return String(val.text ?? "");
      return String(val).trim();
    };

    const employee_no = get("employee_no");
    const name = get("name");
    if (!employee_no || !name) {
      skipped.push({ row: r, reason: "사번 또는 이름이 비어있음" });
      continue;
    }

    const departmentName = get("department");
    const positionName = get("position");
    const department_id = deptByName.get(departmentName);
    const position_id = posByName.get(positionName);
    if (!department_id) {
      skipped.push({ row: r, reason: `부서 '${departmentName}' 매칭 실패` });
      continue;
    }
    if (!position_id) {
      skipped.push({ row: r, reason: `직급 '${positionName}' 매칭 실패` });
      continue;
    }

    const hire_date = get("hire_date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hire_date)) {
      skipped.push({ row: r, reason: `입사일 형식 오류: '${hire_date}'` });
      continue;
    }

    const base_salary_str = get("base_salary").replace(/[,\s원]/g, "");
    const base_salary = Number(base_salary_str);
    if (!Number.isFinite(base_salary) || base_salary <= 0) {
      skipped.push({ row: r, reason: `기본급 형식 오류: '${base_salary_str}'` });
      continue;
    }

    const dependents_str = get("dependents") || "1";
    const dependents = Number(dependents_str);
    if (!Number.isInteger(dependents) || dependents < 1 || dependents > 11) {
      skipped.push({ row: r, reason: `부양가족 1~11 사이여야 함: '${dependents_str}'` });
      continue;
    }

    const birth_date_raw = get("birth_date");
    const birth_date = /^\d{4}-\d{2}-\d{2}$/.test(birth_date_raw) ? birth_date_raw : null;

    inserts.push({
      employee_no,
      name,
      department_id,
      position_id,
      hire_date,
      base_salary: Math.round(base_salary),
      dependents,
      birth_date,
      phone: get("phone") || null,
      email: get("email") || null,
      bank_name: get("bank_name") || null,
      bank_account: get("bank_account") || null,
      status: "active",
    });
  }

  if (inserts.length === 0) {
    return { totalRows, inserted: 0, skipped, fatal: null };
  }

  // 사번 중복 검사 (DB에 이미 존재하는 사번 제외)
  const empNos = inserts.map((i) => i.employee_no);
  const { data: existing } = await supabase
    .from("employees")
    .select("employee_no")
    .in("employee_no", empNos)
    .returns<{ employee_no: string }[]>();
  const existingSet = new Set((existing ?? []).map((e) => e.employee_no));

  const toInsert = inserts.filter((i) => {
    if (existingSet.has(i.employee_no)) {
      skipped.push({ row: 0, reason: `사번 '${i.employee_no}' 이미 존재` });
      return false;
    }
    return true;
  });

  if (toInsert.length === 0) {
    return { totalRows, inserted: 0, skipped, fatal: null };
  }

  const { error } = await supabase
    .schema("chongmu")
    .from("employees")
    .insert(toInsert as never);

  if (error) {
    return { totalRows, inserted: 0, skipped, fatal: `DB 저장 실패: ${error.message}` };
  }

  await recordAudit({
    action: "employee.created",
    entityType: "employee",
    metadata: {
      bulk: true,
      count: toInsert.length,
      employee_nos: toInsert.map((i) => i.employee_no),
    },
  });

  revalidatePath("/employees");

  return {
    totalRows,
    inserted: toInsert.length,
    skipped,
    fatal: null,
  };
}
