"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAttendanceCSV, type ParseError } from "./csv-import";
import { calcDailyHours } from "./calc-hours";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export type ImportRowError = {
  lineNumber: number;
  employeeNo?: string;
  workDate?: string;
  error: string;
};

export type ImportSummary = {
  fatal?: string;
  parseErrors: ParseError[];
  rowErrors: ImportRowError[];
  upserted: number;
  totalParsed: number;
};

/**
 * 근태 CSV 가져오기 — 파싱 → 직원 lookup → 시간 자동 계산 → bulk upsert.
 *
 * 정책:
 *  - (employee_id, work_date) 충돌 시 upsert로 덮어쓴다 (CSV = 동기화 원본).
 *  - 부분 실패 허용: 잘못된 행은 건너뛰고 나머지를 처리.
 *  - 파일 크기 5MB 상한.
 */
export async function importAttendanceCSVAction(
  formData: FormData,
): Promise<ImportSummary> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      fatal: "파일이 선택되지 않았거나 비어있습니다.",
      parseErrors: [],
      rowErrors: [],
      upserted: 0,
      totalParsed: 0,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      fatal: `파일이 5MB를 초과합니다 (${(file.size / 1024 / 1024).toFixed(1)}MB).`,
      parseErrors: [],
      rowErrors: [],
      upserted: 0,
      totalParsed: 0,
    };
  }

  const text = await file.text();
  const parsed = parseAttendanceCSV(text);

  if ("fatal" in parsed) {
    return {
      fatal: parsed.fatal,
      parseErrors: [],
      rowErrors: [],
      upserted: 0,
      totalParsed: 0,
    };
  }

  if (parsed.rows.length === 0) {
    return {
      parseErrors: parsed.errors,
      rowErrors: [],
      upserted: 0,
      totalParsed: 0,
    };
  }

  const supabase = createClient();

  // 사번 → employee_id 매핑
  const uniqueEmpNos = Array.from(new Set(parsed.rows.map((r) => r.employeeNo)));
  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, employee_no")
    .in("employee_no", uniqueEmpNos)
    .is("deleted_at", null)
    .returns<{ id: string; employee_no: string }[]>();

  if (empErr) {
    return {
      fatal: `직원 조회 실패: ${empErr.message}`,
      parseErrors: parsed.errors,
      rowErrors: [],
      upserted: 0,
      totalParsed: parsed.rows.length,
    };
  }

  const empMap = new Map(
    (employees ?? []).map((e) => [e.employee_no, e.id]),
  );

  type AttendanceInsert = {
    employee_id: string;
    work_date: string;
    check_in: string;
    check_out: string;
    regular_hours: number;
    overtime_hours: number;
    night_hours: number;
    holiday_hours: number;
    note: string | null;
  };

  const inserts: AttendanceInsert[] = [];
  const rowErrors: ImportRowError[] = [];

  for (let i = 0; i < parsed.rows.length; i += 1) {
    const row = parsed.rows[i];
    // CSV 헤더가 1행, 빈 줄 스킵 가능성을 고려해 정확한 lineNumber는 추적 어려움.
    // 대신 인덱스 + 2 (헤더 1행 가정)로 근사. 빈 줄이 많은 파일은 살짝 어긋날 수 있음.
    const lineNumber = i + 2;

    const empId = empMap.get(row.employeeNo);
    if (!empId) {
      rowErrors.push({
        lineNumber,
        employeeNo: row.employeeNo,
        workDate: row.workDate,
        error: `사번 미존재 또는 퇴사 상태`,
      });
      continue;
    }

    const calc = calcDailyHours({
      checkIn: row.checkIn,
      checkOut: row.checkOut,
    });
    if (!calc.success) {
      rowErrors.push({
        lineNumber,
        employeeNo: row.employeeNo,
        workDate: row.workDate,
        error: calc.error,
      });
      continue;
    }

    inserts.push({
      employee_id: empId,
      work_date: row.workDate,
      check_in: `${row.checkIn}:00`,
      check_out: `${row.checkOut}:00`,
      regular_hours: calc.regularHours,
      overtime_hours: calc.overtimeHours,
      night_hours: row.nightHours,
      holiday_hours: row.holidayHours,
      note: row.note,
    });
  }

  let upserted = 0;
  if (inserts.length > 0) {
    const { error: upsertErr, count } = await supabase
      .schema("chongmu")
      .from("attendance")
      .upsert(inserts, {
        onConflict: "employee_id,work_date",
        count: "exact",
      });
    if (upsertErr) {
      return {
        fatal: `bulk upsert 실패: ${upsertErr.message}`,
        parseErrors: parsed.errors,
        rowErrors,
        upserted: 0,
        totalParsed: parsed.rows.length,
      };
    }
    upserted = count ?? inserts.length;
  }

  revalidatePath("/attendance");

  return {
    parseErrors: parsed.errors,
    rowErrors,
    upserted,
    totalParsed: parsed.rows.length,
  };
}
