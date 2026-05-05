/**
 * 월별 지출 내역 엑셀 내보내기.
 *
 * GET /api/expenses/export?year=2026&month=4
 *
 * 해당 월의 expenses 행을 카테고리·거래처와 함께 .xlsx로 응답.
 */

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

type ExpenseRow = {
  expense_date: string;
  amount: number;
  vat: number;
  payment_method: string;
  description: string | null;
  is_taxable: boolean;
  receipt_url: string | null;
  expense_categories: { name: string } | null;
  vendors: { name: string } | null;
};

const PAYMENT_LABEL: Record<string, string> = {
  card: "카드",
  cash: "현금",
  transfer: "이체",
  other: "기타",
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
    .from("expenses")
    .select(
      `expense_date, amount, vat, payment_method, description, is_taxable, receipt_url,
       expense_categories:category_id (name),
       vendors:vendor_id (name)`,
    )
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date", { ascending: true })
    .returns<ExpenseRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Nexus ERP";
  const ws = wb.addWorksheet(`${year}년 ${month}월 지출`);

  ws.columns = [
    { header: "일자", key: "expense_date", width: 12 },
    { header: "카테고리", key: "category", width: 14 },
    { header: "거래처", key: "vendor", width: 18 },
    { header: "공급가", key: "amount", width: 14 },
    { header: "부가세", key: "vat", width: 12 },
    { header: "합계", key: "total", width: 14 },
    { header: "결제수단", key: "payment_method", width: 10 },
    { header: "과세", key: "is_taxable", width: 8 },
    { header: "설명", key: "description", width: 30 },
    { header: "영수증", key: "receipt_url", width: 30 },
  ];

  for (const row of rows ?? []) {
    ws.addRow({
      expense_date: row.expense_date,
      category: row.expense_categories?.name ?? "",
      vendor: row.vendors?.name ?? "",
      amount: row.amount,
      vat: row.vat,
      total: row.amount + row.vat,
      payment_method: PAYMENT_LABEL[row.payment_method] ?? row.payment_method,
      is_taxable: row.is_taxable ? "과세" : "면세",
      description: row.description ?? "",
      receipt_url: row.receipt_url ?? "",
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

  ws.getColumn("amount").numFmt = "#,##0";
  ws.getColumn("vat").numFmt = "#,##0";
  ws.getColumn("total").numFmt = "#,##0";

  if ((rows?.length ?? 0) > 0) {
    const totalAmount = (rows ?? []).reduce((s, r) => s + (r.amount || 0), 0);
    const totalVat = (rows ?? []).reduce((s, r) => s + (r.vat || 0), 0);
    const totalRow = ws.addRow({
      expense_date: "",
      category: "합계",
      vendor: "",
      amount: totalAmount,
      vat: totalVat,
      total: totalAmount + totalVat,
      payment_method: "",
      is_taxable: "",
      description: `${rows?.length ?? 0}건`,
      receipt_url: "",
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `expenses_${year}_${String(month).padStart(2, "0")}.xlsx`;

  await recordAudit({
    action: "report.exported",
    entityType: "report",
    metadata: { kind: "expenses", year, month, count: rows?.length ?? 0 },
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
