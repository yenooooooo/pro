"use client";

import { Download } from "lucide-react";

type Row = {
  date: string;
  vendor: string;
  category: string;
  paymentMethod: string;
  amount: number;
  status: "approved" | "pending" | "flagged";
};

const PAYMENT_LABEL: Record<string, string> = {
  card: "카드",
  cash: "현금",
  transfer: "계좌이체",
  other: "기타",
};

const STATUS_LABEL: Record<Row["status"], string> = {
  approved: "확인",
  pending: "대기",
  flagged: "검토필요",
};

const HEADERS = ["일자", "거래처", "카테고리", "결제수단", "금액(원)", "상태"];

type Props = {
  rows: Row[];
  filename: string;
};

export function CsvExportButton({ rows, filename }: Props) {
  function download() {
    if (rows.length === 0) return;

    const lines: string[] = [];
    lines.push(HEADERS.map(csvEscape).join(","));
    for (const r of rows) {
      lines.push(
        [
          r.date,
          r.vendor,
          r.category,
          PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod,
          String(r.amount),
          STATUS_LABEL[r.status],
        ]
          .map(csvEscape)
          .join(","),
      );
    }
    // UTF-8 BOM 포함 → 엑셀에서 한글 깨짐 방지.
    const blob = new Blob(["﻿" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-high px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Download aria-hidden className="h-[18px] w-[18px]" />
      CSV 내보내기 ({rows.length})
    </button>
  );
}

function csvEscape(v: string): string {
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
