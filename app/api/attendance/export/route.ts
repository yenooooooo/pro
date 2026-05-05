/**
 * 월별 근태 엑셀 내보내기.
 *
 * GET /api/attendance/export?year=2026&month=4
 *
 * 해당 월 attendance 행을 직원·부서와 함께 .xlsx로 응답.
 * 직원별 합계 시트 1, 일별 상세 시트 1 (총 2개 시트).
 */

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

type AttendanceRow = {
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  regular_hours: number;
  overtime_hours: number;
  night_hours: number;
  holiday_hours: number;
  note: string | null;
  employees: {
    employee_no: string | null;
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

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: rows, error } = await supabase
    .schema("chongmu")
    .from("attendance")
    .select(
      `work_date, check_in, check_out,
       regular_hours, overtime_hours, night_hours, holiday_hours, note,
       employees:employee_id (employee_no, name, departments:department_id (name))`,
    )
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .order("work_date", { ascending: true })
    .returns<AttendanceRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Nexus ERP";

  // === 시트 1: 직원별 합계 ===
  const summary = wb.addWorksheet(`${year}년 ${month}월 합계`);
  summary.columns = [
    { header: "사번", key: "employee_no", width: 12 },
    { header: "이름", key: "name", width: 10 },
    { header: "부서", key: "department", width: 14 },
    { header: "근무일", key: "days", width: 10 },
    { header: "정규(h)", key: "regular", width: 12 },
    { header: "연장(h)", key: "overtime", width: 12 },
    { header: "야간(h)", key: "night", width: 12 },
    { header: "휴일(h)", key: "holiday", width: 12 },
    { header: "총시간(h)", key: "total", width: 14 },
  ];

  type Agg = {
    employee_no: string;
    name: string;
    department: string;
    days: number;
    regular: number;
    overtime: number;
    night: number;
    holiday: number;
  };
  const aggMap = new Map<string, Agg>();
  for (const r of rows ?? []) {
    const empNo = r.employees?.employee_no ?? "";
    const key = empNo + "|" + (r.employees?.name ?? "");
    const cur =
      aggMap.get(key) ??
      ({
        employee_no: empNo,
        name: r.employees?.name ?? "",
        department: r.employees?.departments?.name ?? "",
        days: 0,
        regular: 0,
        overtime: 0,
        night: 0,
        holiday: 0,
      } as Agg);
    cur.days += 1;
    cur.regular += Number(r.regular_hours) || 0;
    cur.overtime += Number(r.overtime_hours) || 0;
    cur.night += Number(r.night_hours) || 0;
    cur.holiday += Number(r.holiday_hours) || 0;
    aggMap.set(key, cur);
  }

  for (const a of Array.from(aggMap.values()).sort((x, y) =>
    x.employee_no.localeCompare(y.employee_no),
  )) {
    summary.addRow({
      ...a,
      total: a.regular + a.overtime + a.night + a.holiday,
    });
  }

  styleHeader(summary);
  ["regular", "overtime", "night", "holiday", "total"].forEach((k) => {
    summary.getColumn(k).numFmt = "0.0";
  });

  // === 시트 2: 일별 상세 ===
  const detail = wb.addWorksheet(`${year}년 ${month}월 상세`);
  detail.columns = [
    { header: "일자", key: "work_date", width: 12 },
    { header: "사번", key: "employee_no", width: 12 },
    { header: "이름", key: "name", width: 10 },
    { header: "출근", key: "check_in", width: 10 },
    { header: "퇴근", key: "check_out", width: 10 },
    { header: "정규(h)", key: "regular", width: 10 },
    { header: "연장(h)", key: "overtime", width: 10 },
    { header: "야간(h)", key: "night", width: 10 },
    { header: "휴일(h)", key: "holiday", width: 10 },
    { header: "비고", key: "note", width: 24 },
  ];
  for (const r of rows ?? []) {
    detail.addRow({
      work_date: r.work_date,
      employee_no: r.employees?.employee_no ?? "",
      name: r.employees?.name ?? "",
      check_in: r.check_in ?? "",
      check_out: r.check_out ?? "",
      regular: Number(r.regular_hours) || 0,
      overtime: Number(r.overtime_hours) || 0,
      night: Number(r.night_hours) || 0,
      holiday: Number(r.holiday_hours) || 0,
      note: r.note ?? "",
    });
  }
  styleHeader(detail);
  ["regular", "overtime", "night", "holiday"].forEach((k) => {
    detail.getColumn(k).numFmt = "0.0";
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `attendance_${year}_${String(month).padStart(2, "0")}.xlsx`;

  await recordAudit({
    action: "report.exported",
    entityType: "report",
    metadata: {
      kind: "attendance",
      year,
      month,
      employees: aggMap.size,
      rows: rows?.length ?? 0,
    },
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

function styleHeader(ws: ExcelJS.Worksheet) {
  const h = ws.getRow(1);
  h.font = { bold: true };
  h.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E7FF" },
  };
  h.alignment = { vertical: "middle", horizontal: "center" };
}
