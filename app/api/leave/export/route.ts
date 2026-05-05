/**
 * 연차 현황 엑셀 내보내기.
 *
 * GET /api/leave/export?year=2026
 *
 * 시트 1: 직원별 잔여 (총발생/사용/잔여)
 * 시트 2: 신청 이력 (전체 leave_requests, 해당 연도 안에 시작 또는 종료된 것)
 */

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

type BalanceRow = {
  year: number;
  total_granted: number;
  total_used: number;
  remaining: number;
  employees: {
    employee_no: string | null;
    name: string;
    departments: { name: string } | null;
  } | null;
};

type RequestRow = {
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  created_at: string;
  employees: {
    employee_no: string | null;
    name: string;
    departments: { name: string } | null;
  } | null;
};

const TYPE_LABEL: Record<string, string> = {
  annual: "연차",
  sick: "병가",
  family: "경조사",
  other: "기타",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "year 형식 오류" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [{ data: balances }, { data: requests }] = await Promise.all([
    supabase
      .schema("chongmu")
      .from("leave_balances")
      .select(
        `year, total_granted, total_used, remaining,
         employees:employee_id (employee_no, name, departments:department_id (name))`,
      )
      .eq("year", year)
      .returns<BalanceRow[]>(),
    supabase
      .schema("chongmu")
      .from("leave_requests")
      .select(
        `leave_type, start_date, end_date, days, reason, status, created_at,
         employees:employee_id (employee_no, name, departments:department_id (name))`,
      )
      .gte("start_date", yearStart)
      .lte("start_date", yearEnd)
      .order("start_date", { ascending: false })
      .returns<RequestRow[]>(),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Nexus ERP";

  // === 시트 1: 잔여 ===
  const ws1 = wb.addWorksheet(`${year}년 연차잔여`);
  ws1.columns = [
    { header: "사번", key: "employee_no", width: 12 },
    { header: "이름", key: "name", width: 10 },
    { header: "부서", key: "department", width: 14 },
    { header: "총 발생(일)", key: "total_granted", width: 14 },
    { header: "사용(일)", key: "total_used", width: 12 },
    { header: "잔여(일)", key: "remaining", width: 12 },
    { header: "사용률(%)", key: "use_rate", width: 12 },
  ];
  for (const b of balances ?? []) {
    const granted = Number(b.total_granted) || 0;
    const used = Number(b.total_used) || 0;
    ws1.addRow({
      employee_no: b.employees?.employee_no ?? "",
      name: b.employees?.name ?? "",
      department: b.employees?.departments?.name ?? "",
      total_granted: granted,
      total_used: used,
      remaining: Number(b.remaining) || 0,
      use_rate: granted > 0 ? Math.round((used / granted) * 100) : 0,
    });
  }
  styleHeader(ws1);
  ["total_granted", "total_used", "remaining"].forEach((k) => {
    ws1.getColumn(k).numFmt = "0.0";
  });

  // === 시트 2: 신청 이력 ===
  const ws2 = wb.addWorksheet(`${year}년 신청이력`);
  ws2.columns = [
    { header: "사번", key: "employee_no", width: 12 },
    { header: "이름", key: "name", width: 10 },
    { header: "부서", key: "department", width: 14 },
    { header: "유형", key: "leave_type", width: 10 },
    { header: "시작일", key: "start_date", width: 12 },
    { header: "종료일", key: "end_date", width: 12 },
    { header: "일수", key: "days", width: 8 },
    { header: "상태", key: "status", width: 10 },
    { header: "사유", key: "reason", width: 30 },
    { header: "신청일", key: "created_at", width: 18 },
  ];
  for (const r of requests ?? []) {
    ws2.addRow({
      employee_no: r.employees?.employee_no ?? "",
      name: r.employees?.name ?? "",
      department: r.employees?.departments?.name ?? "",
      leave_type: TYPE_LABEL[r.leave_type] ?? r.leave_type,
      start_date: r.start_date,
      end_date: r.end_date,
      days: Number(r.days) || 0,
      status: STATUS_LABEL[r.status] ?? r.status,
      reason: r.reason ?? "",
      created_at: r.created_at?.slice(0, 16).replace("T", " ") ?? "",
    });
  }
  styleHeader(ws2);
  ws2.getColumn("days").numFmt = "0.0";

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `leave_${year}.xlsx`;

  await recordAudit({
    action: "report.exported",
    entityType: "report",
    metadata: {
      kind: "leave",
      year,
      employees: balances?.length ?? 0,
      requests: requests?.length ?? 0,
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
