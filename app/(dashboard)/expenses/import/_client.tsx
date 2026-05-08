"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  parseCardStatementCsv,
  type ParsedExpenseRow,
} from "@/lib/expenses/csv-parser";
import {
  bulkImportExpensesAction,
  classifyMerchantsAction,
} from "./actions";

type Category = { id: string; name: string };

type Row = ParsedExpenseRow & {
  category_id?: string | null;
  selected: boolean;
};

type Props = {
  categories: Category[];
};

export function CardImportClient({ categories }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setParsing(true);
    setError(null);
    try {
      const text = await file.text();
      const result = parseCardStatementCsv(text);
      setRows(
        result.rows.map((r) => ({
          ...r,
          category_id: null,
          selected: true,
        })),
      );
      setWarnings(result.warnings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일 읽기 실패");
    } finally {
      setParsing(false);
    }
  }

  async function classifyWithAi() {
    if (rows.length === 0) return;
    setClassifying(true);
    setError(null);
    const merchants = Array.from(new Set(rows.map((r) => r.merchant)));
    const result = await classifyMerchantsAction(merchants);
    setClassifying(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        category_id: result.classifications[r.merchant] ?? r.category_id,
      })),
    );
  }

  function submit() {
    const selectedRows = rows.filter((r) => r.selected);
    if (selectedRows.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await bulkImportExpensesAction({
        rows: selectedRows.map((r) => ({
          date: r.date,
          merchant: r.merchant,
          amount: r.amount,
          vat: r.vat,
          category_id: r.category_id ?? null,
        })),
      });
      if (result.ok) {
        router.push("/expenses");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function toggleRow(idx: number) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)),
    );
  }

  function setRowCategory(idx: number, category_id: string | null) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, category_id } : r)),
    );
  }

  const selectedCount = rows.filter((r) => r.selected).length;
  const totalAmount = rows
    .filter((r) => r.selected)
    .reduce((s, r) => s + r.amount + r.vat, 0);

  if (rows.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-12">
        <div className="text-center">
          <Upload aria-hidden className="mx-auto h-12 w-12 text-on-surface-variant/40" />
          <h3 className="mt-4 text-headline-md font-semibold text-on-surface">
            CSV 파일을 선택하세요
          </h3>
          <p className="mt-2 text-body-md text-on-surface-variant">
            카드사 홈페이지에서 다운받은 명세서 CSV 또는 엑셀(CSV 저장)
          </p>
          <label className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-5 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90">
            {parsing ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Upload aria-hidden className="h-4 w-4" />
            )}
            {parsing ? "분석 중…" : "CSV 파일 선택"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>
          {error ? (
            <p className="mt-4 inline-flex items-center gap-1 text-body-md text-error-soft">
              <AlertCircle aria-hidden className="h-4 w-4" />
              {error}
            </p>
          ) : null}
        </div>
        <div className="mt-8 rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 text-label-sm text-on-surface-variant">
          <p className="mb-2 font-semibold text-on-surface">자동 매핑되는 컬럼명</p>
          <ul className="space-y-0.5">
            <li>
              <strong>일자</strong>: 거래일, 결제일, 이용일자, 사용일자, date
            </li>
            <li>
              <strong>가맹점</strong>: 거래처, 이용처, 사용처, 상호명, merchant, vendor
            </li>
            <li>
              <strong>금액</strong>: 이용금액, 결제금액, 사용금액, amount, total
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-body-md text-on-surface">
            총 <strong className="text-primary-electric">{rows.length}</strong>건 파싱 ·{" "}
            <strong className="text-primary-electric">{selectedCount}</strong>건 선택 ·{" "}
            합계 <strong className="text-primary-electric tabular-nums">{totalAmount.toLocaleString("ko-KR")}원</strong>
          </p>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={classifyWithAi}
              disabled={classifying}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary-electric/40 bg-primary-electric/10 px-3 py-1.5 text-label-sm font-semibold text-primary-electric transition-colors hover:bg-primary-electric/20 disabled:opacity-50"
            >
              {classifying ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles aria-hidden className="h-4 w-4" />
              )}
              AI 카테고리 자동 분류
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || selectedCount === 0}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-3 py-1.5 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 aria-hidden className="h-4 w-4" />
              )}
              {selectedCount}건 일괄 등록
            </button>
          </div>
        </div>

        {warnings.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-label-sm text-amber-300">
                ⚠ {w}
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p className="mt-2 inline-flex items-center gap-1 text-body-md text-error-soft">
            <AlertCircle aria-hidden className="h-4 w-4" />
            {error}
          </p>
        ) : null}
      </div>

      {/* 미리보기 표 */}
      <div className="glass-panel overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-data-tabular">
            <thead>
              <tr className="border-b border-outline-variant/40 text-label-sm uppercase tracking-widest text-on-surface-variant">
                <th className="px-3 py-3 w-10"></th>
                <th className="px-3 py-3 text-left">일자</th>
                <th className="px-3 py-3 text-left">가맹점</th>
                <th className="px-3 py-3 text-right">공급가</th>
                <th className="px-3 py-3 text-right">VAT</th>
                <th className="px-3 py-3 text-right">합계</th>
                <th className="px-3 py-3 text-left">카테고리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={idx}
                  className={
                    "border-b border-outline-variant/15 last:border-0 " +
                    (r.selected ? "" : "opacity-50")
                  }
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={r.selected}
                      onChange={() => toggleRow(idx)}
                      className="h-4 w-4 rounded accent-primary-electric"
                    />
                  </td>
                  <td className="px-3 py-2 text-on-surface tabular-nums">{r.date}</td>
                  <td className="px-3 py-2 text-on-surface">{r.merchant}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                    {r.amount.toLocaleString("ko-KR")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                    {r.vat.toLocaleString("ko-KR")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-on-surface">
                    {(r.amount + r.vat).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={r.category_id ?? ""}
                      onChange={(e) => setRowCategory(idx, e.target.value || null)}
                      className="min-h-8 w-full rounded border border-outline-variant/40 bg-surface-container-low px-2 py-1 text-label-sm text-on-surface focus:border-primary-electric focus:outline-none"
                    >
                      <option value="">선택 안 함</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
