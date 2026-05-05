/**
 * 자산 현황 엑셀 내보내기.
 *
 * GET /api/assets/export
 *
 * 모든 자산을 카테고리·할당직원과 함께 .xlsx로 응답.
 * 감가상각(정액법) 잔존가·만료일도 계산해 포함.
 */

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

type AssetRow = {
  asset_no: string | null;
  name: string;
  category: string | null;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  useful_life: number | null;
  location: string | null;
  status: string;
  memo: string | null;
  disposed_at: string | null;
  employees: { name: string; employee_no: string | null } | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  it_device: "IT 기기",
  furniture: "사무가구",
  vehicle: "차량",
  equipment: "장비",
  other: "기타",
};

const STATUS_LABEL: Record<string, string> = {
  in_use: "사용 중",
  repair: "수리 중",
  disposed: "폐기",
  sold: "매각",
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
    .from("assets")
    .select(
      `asset_no, name, category, acquisition_date, acquisition_cost,
       useful_life, location, status, memo, disposed_at,
       employees:assigned_to (name, employee_no)`,
    )
    .order("acquisition_date", { ascending: false, nullsFirst: false })
    .returns<AssetRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Nexus ERP";
  const ws = wb.addWorksheet("자산 현황");

  ws.columns = [
    { header: "자산번호", key: "asset_no", width: 14 },
    { header: "이름", key: "name", width: 20 },
    { header: "분류", key: "category", width: 12 },
    { header: "상태", key: "status", width: 10 },
    { header: "취득일", key: "acquisition_date", width: 12 },
    { header: "취득가", key: "acquisition_cost", width: 14 },
    { header: "내용연수(년)", key: "useful_life", width: 12 },
    { header: "잔존가치", key: "book_value", width: 14 },
    { header: "만료예정일", key: "expiry_date", width: 14 },
    { header: "할당직원", key: "assignee", width: 14 },
    { header: "위치", key: "location", width: 16 },
    { header: "폐기일", key: "disposed_at", width: 12 },
    { header: "메모", key: "memo", width: 24 },
  ];

  const today = new Date();
  for (const row of rows ?? []) {
    const { bookValue, expiryDate } = computeDepreciation(row, today);
    ws.addRow({
      asset_no: row.asset_no ?? "",
      name: row.name,
      category: CATEGORY_LABEL[row.category ?? ""] ?? row.category ?? "",
      status: STATUS_LABEL[row.status] ?? row.status,
      acquisition_date: row.acquisition_date ?? "",
      acquisition_cost: row.acquisition_cost ?? 0,
      useful_life: row.useful_life ?? "",
      book_value: bookValue ?? "",
      expiry_date: expiryDate ?? "",
      assignee: row.employees
        ? `${row.employees.name}${row.employees.employee_no ? ` (${row.employees.employee_no})` : ""}`
        : "",
      location: row.location ?? "",
      disposed_at: row.disposed_at ?? "",
      memo: row.memo ?? "",
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

  ws.getColumn("acquisition_cost").numFmt = "#,##0";
  ws.getColumn("book_value").numFmt = "#,##0";

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const filename = `assets_${stamp}.xlsx`;

  await recordAudit({
    action: "report.exported",
    entityType: "report",
    metadata: { kind: "assets", count: rows?.length ?? 0 },
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

/**
 * 정액법 감가상각.
 * 잔존가치 = 취득가 × max(0, 1 - 경과월/내용연수월)
 * CLAUDE.md §6.7
 */
function computeDepreciation(
  row: AssetRow,
  today: Date,
): { bookValue: number | null; expiryDate: string | null } {
  if (!row.acquisition_date || !row.acquisition_cost || !row.useful_life) {
    return { bookValue: null, expiryDate: null };
  }
  const acq = new Date(row.acquisition_date);
  const expiry = new Date(acq);
  expiry.setFullYear(expiry.getFullYear() + row.useful_life);
  const expiryDate = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, "0")}-${String(expiry.getDate()).padStart(2, "0")}`;

  if (row.status === "disposed" || row.status === "sold") {
    return { bookValue: 0, expiryDate };
  }

  const totalMonths = row.useful_life * 12;
  const elapsedMonths =
    (today.getFullYear() - acq.getFullYear()) * 12 +
    (today.getMonth() - acq.getMonth());
  const ratio = Math.max(0, 1 - elapsedMonths / totalMonths);
  const bookValue = Math.round(row.acquisition_cost * ratio);
  return { bookValue, expiryDate };
}
