import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { formatKRW, formatKRWCompact } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/server";
import { checkBudgets, type BudgetCheck } from "@/lib/expenses/budget-check";
import { ExpenseFilters } from "./_components/expense-filters";
import { CsvExportButton } from "./_components/csv-export-button";
import { PAYMENT_METHOD_LABEL as PAYMENT_LABEL } from "@/lib/labels";

type TxStatus = "approved" | "pending" | "flagged";

type ExpenseDbRow = {
  id: string;
  expense_date: string;
  amount: number;
  vat: number;
  payment_method: string;
  description: string | null;
  receipt_url: string | null;
  category_id: string | null;
  vendor_id: string | null;
  category: { id: string; name: string; budget_monthly: number | null } | null;
  vendor: { id: string; name: string } | null;
};

type ExpenseRow = {
  id: string;
  date: string;
  vendor: string;
  category: string;
  categoryId: string | null;
  amount: number;
  paymentMethod: string;
  status: TxStatus;
  alertReason?: string;
};

type Category = { id: string; name: string; budget_monthly: number | null };
type Vendor = { id: string; name: string };

const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 4;
const ANOMALY_AMOUNT_THRESHOLD = 1_000_000;


export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: {
    year?: string;
    month?: string;
    category?: string;
    vendor?: string;
    payment?: string;
  };
}) {
  const year = parseIntInRange(searchParams?.year, 2000, 2100, DEFAULT_YEAR);
  const month =
    searchParams?.month === undefined
      ? DEFAULT_MONTH
      : searchParams.month === "all"
        ? null
        : parseIntInRange(searchParams.month, 1, 12, DEFAULT_MONTH);
  const categoryId = searchParams?.category ?? null;
  const vendorId = searchParams?.vendor ?? null;
  const paymentMethod = searchParams?.payment ?? null;

  const supabase = createClient();

  const periodStart =
    month === null
      ? `${year}-01-01`
      : `${year}-${String(month).padStart(2, "0")}-01`;
  const periodEnd =
    month === null ? `${year}-12-31` : lastDayOfMonth(year, month);

  let expensesQuery = supabase
    .from("expenses")
    .select(
      "id, expense_date, amount, vat, payment_method, description, receipt_url, category_id, vendor_id, category:expense_categories(id, name, budget_monthly), vendor:vendors(id, name)",
    )
    .gte("expense_date", periodStart)
    .lte("expense_date", periodEnd)
    .order("expense_date", { ascending: false });
  if (categoryId) expensesQuery = expensesQuery.eq("category_id", categoryId);
  if (vendorId) expensesQuery = expensesQuery.eq("vendor_id", vendorId);
  if (paymentMethod) expensesQuery = expensesQuery.eq("payment_method", paymentMethod);

  const [{ data: expensesRaw }, { data: categoriesRaw }, { data: vendorsRaw }] =
    await Promise.all([
      expensesQuery.returns<ExpenseDbRow[]>(),
      supabase
        .from("expense_categories")
        .select("id, name, budget_monthly")
        .order("name")
        .returns<Category[]>(),
      supabase
        .from("vendors")
        .select("id, name")
        .order("name")
        .returns<Vendor[]>(),
    ]);

  const t = await getTranslations("expenses");
  const categories = categoriesRaw ?? [];
  const vendors = vendorsRaw ?? [];
  const rows = (expensesRaw ?? []).map((r) =>
    toRow(r, { receiptMissing: t("receipt_missing") }),
  );

  const totalDisbursed = rows.reduce((s, r) => s + r.amount, 0);
  const anomalies = rows.filter((r) => r.status === "flagged");
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  // 카테고리 월 한도 점검 — 월 단위 조회일 때만 의미 있음.
  const budgetChecks =
    month === null
      ? []
      : checkBudgets(
          (expensesRaw ?? []).map((e) => ({
            categoryId: e.category_id,
            amount: e.amount,
          })),
          categories,
        ).filter((c) => c.status !== "ok");

  const byCategory = aggregateByCategory(rows);
  const top5Categories = byCategory.slice(0, 5);

  const periodLabel =
    month === null ? `${year}년 전체` : `${year}년 ${month}월`;

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M06</b>Records · Expenses
          </div>
          <h1 className="page-h">
            지출 <em>장부.</em>
          </h1>
          <p className="page-sub">
            {periodLabel} · 총 {rows.length}건
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CsvExportButton
            rows={rows.map((r) => ({
              date: r.date,
              vendor: r.vendor,
              category: r.category,
              paymentMethod: r.paymentMethod,
              amount: r.amount,
              status: r.status,
            }))}
            filename={`expenses_${month === null ? `${year}_all` : `${year}_${String(month).padStart(2, "0")}`}`}
          />
          <Link href="/expenses/import" className="btn">
            {t("import_csv")}
          </Link>
          <Link href="/expenses/new" className="btn btn-primary">
            + {t("add")}
          </Link>
        </div>
      </header>

      {/* ===== Filters ===== */}
      <div className="mb-9 border border-line bg-bg p-5">
        <ExpenseFilters
          year={year}
          month={month}
          categoryId={categoryId}
          vendorId={vendorId}
          paymentMethod={paymentMethod}
          categories={categories.map((c) => ({ value: c.id, label: c.name }))}
          vendors={vendors.map((v) => ({ value: v.id, label: v.name }))}
        />
      </div>

      {/* ===== 카테고리 월 한도 경고 ===== */}
      {budgetChecks.length > 0 ? (
        <div className="mb-9">
          <BudgetAlertBanner
            checks={budgetChecks}
            title={t("limit_warning_title")}
            exceededLabel={t("exceeded")}
          />
        </div>
      ) : null}

      {/* ===== KPI Row ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-3">
        <div className="kpi-card">
          <div className="kpi-l">{t("kpi_total")}</div>
          <div className="kpi-v">
            <span className="cur">₩</span>
            {totalDisbursed.toLocaleString("ko-KR")}
          </div>
          <div className="kpi-meta">
            <span>{periodLabel}</span>
            <span>{rows.length}건</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">{t("kpi_pending")}</div>
          <div className={cn("kpi-v", pendingCount > 0 && "warn")}>
            {pendingCount.toLocaleString("ko-KR")}
            <span className="ml-1 text-[16px] text-text-3">건</span>
          </div>
          <div className="kpi-meta">
            <span>{pendingCount > 0 ? "확인 대기" : "이상 없음"}</span>
            <span />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">{t("kpi_review_needed")}</div>
          <div className={cn("kpi-v", anomalies.length > 0 && "danger")}>
            {anomalies.length.toLocaleString("ko-KR")}
            <span className="ml-1 text-[16px] text-text-3">건</span>
          </div>
          <div className="kpi-meta">
            <span>
              {anomalies.length > 0 ? `≥ ₩${formatCompactKRW(ANOMALY_AMOUNT_THRESHOLD)} · 영수증/거래처 누락` : "이상 없음"}
            </span>
            <span />
          </div>
        </div>
      </div>

      {/* ===== Body — Top categories + Flagged list ===== */}
      <div className="row-grid mb-9" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <TopCategoriesPanel
          items={top5Categories}
          total={totalDisbursed}
          countUnit={t("kpi_unit_count")}
        />
        <FlaggedListPanel
          rows={anomalies.slice(0, 6)}
          reviewLabel={t("review")}
        />
      </div>

      {/* ===== Section rule + Transactions table ===== */}
      <div className="section-rule">
        <span className="l">
          <b>M06.01</b>Transactions · Recent
        </span>
        <span className="line" />
      </div>

      <section className="panel">
        <div className="panel-h">
          <div className="t font-serif">
            최근 <em>거래.</em>
          </div>
          <div className="meta">
            {rows.length}건 · 최신 10건
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="border-t border-line py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            해당 기간에 등록된 지출이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[640px]">
              <thead>
                <tr>
                  <th>일자</th>
                  <th>거래처</th>
                  <th>카테고리</th>
                  <th className="text-right">금액</th>
                  <th>결제</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row) => (
                  <TxRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function toRow(
  r: ExpenseDbRow,
  labels: { receiptMissing: string },
): ExpenseRow {
  const status = deriveStatus(r);
  const alertReason =
    status === "flagged"
      ? r.vendor_id === null
        ? "거래처 누락"
        : !hasReceipt(r)
          ? labels.receiptMissing
          : "확인 필요"
      : undefined;
  return {
    id: r.id,
    date: formatDate(r.expense_date),
    vendor: r.vendor?.name ?? "(거래처 미지정)",
    category: r.category?.name ?? "(카테고리 미지정)",
    categoryId: r.category_id,
    amount: r.amount,
    paymentMethod: r.payment_method,
    status,
    alertReason,
  };
}

function deriveStatus(r: ExpenseDbRow): TxStatus {
  const hasVendor = r.vendor_id !== null;
  const hasCategory = r.category_id !== null;
  const isLargeAmount = r.amount >= ANOMALY_AMOUNT_THRESHOLD;
  if (isLargeAmount && (!hasVendor || !hasReceipt(r))) return "flagged";
  if (hasVendor && hasCategory && hasReceipt(r)) return "approved";
  return "pending";
}

function hasReceipt(r: ExpenseDbRow): boolean {
  return r.receipt_url !== null || r.payment_method === "card";
}

function aggregateByCategory(rows: ExpenseRow[]): Array<{
  name: string;
  txCount: number;
  amount: number;
}> {
  const map = new Map<string, { name: string; txCount: number; amount: number }>();
  for (const r of rows) {
    const key = r.categoryId ?? "_uncat";
    const cur = map.get(key) ?? { name: r.category, txCount: 0, amount: 0 };
    cur.txCount += 1;
    cur.amount += r.amount;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function parseIntInRange(
  v: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

function formatDate(iso: string): string {
  // YYYY-MM-DD → YY.MM.DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return `${iso.slice(2, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
}

function formatCompactKRW(n: number): string {
  const { value, unit } = formatKRWCompact(n);
  return `${value}${unit}`;
}

/* ============================================================
 * v2 Sub-panels
 * ============================================================ */

function TopCategoriesPanel({
  items,
  total,
  countUnit,
}: {
  items: Array<{ name: string; txCount: number; amount: number }>;
  total: number;
  countUnit: string;
}) {
  return (
    <section className="panel">
      <div className="panel-h">
        <div className="t font-serif">
          상위 <em>카테고리.</em>
        </div>
        <div className="meta">
          총 ₩{formatCompactKRW(total)}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="border-t border-line py-10 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
          데이터 없음
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map((c) => {
            const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
            return (
              <li
                key={c.name}
                className="flex items-center gap-4 border-b border-line py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] text-text-1">{c.name}</span>
                    <span className="font-mono text-[10px] tracking-[0.05em] text-text-3">
                      {c.txCount}
                      {countUnit}
                    </span>
                  </div>
                  <div className="mt-2 h-px w-full bg-line-2">
                    <div
                      aria-hidden
                      className="h-full bg-gold"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="w-28 text-right font-mono text-[13px] tabular-nums text-text-1">
                  ₩{formatCompactKRW(c.amount)}
                  <div className="mt-[2px] font-mono text-[10px] tracking-[0.05em] text-text-3">
                    {pct}%
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function BudgetAlertBanner({
  checks,
  title,
  exceededLabel,
}: {
  checks: BudgetCheck[];
  title: string;
  exceededLabel: string;
}) {
  return (
    <div
      role="alert"
      className="border border-gold-soft bg-gold/[0.06] p-5"
    >
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-gold">
        <span className="h-[6px] w-[6px] rounded-full bg-gold" />
        {title}
      </div>
      <ul className="flex flex-col gap-2">
        {checks.map((c) => (
          <li
            key={c.categoryId}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-gold-soft/40 pb-2 last:border-b-0 last:pb-0"
          >
            <span className="text-[13px] font-medium text-text-1">{c.name}</span>
            <span className="flex items-center gap-3">
              <span className="font-mono text-[11px] tabular-nums text-text-2">
                {formatKRW(c.used)} / {formatKRW(c.budget)}
              </span>
              <span className={cn("chip", c.status === "over" ? "rej" : "pend")}>
                <i />
                {Math.round(c.ratio * 100)}%
                {c.status === "over" ? ` · ${exceededLabel}` : " · 임박"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlaggedListPanel({
  rows,
  reviewLabel,
}: {
  rows: ExpenseRow[];
  reviewLabel: string;
}) {
  return (
    <section className="panel">
      <div className="panel-h">
        <div className="t font-serif">
          검토 <em>필요.</em>
        </div>
        <div className="meta">{rows.length}건</div>
      </div>
      {rows.length === 0 ? (
        <div className="border-t border-line py-10 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
          검토가 필요한 거래가 없습니다.
        </div>
      ) : (
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-start justify-between gap-3 border-b border-line py-[14px] last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-text-1">{r.vendor}</p>
                <p className="mt-[2px] font-mono text-[10px] tracking-[0.05em] text-text-3">
                  {r.date} · {r.category}
                </p>
                {r.alertReason ? (
                  <span className="chip rej mt-[6px]">
                    <i />
                    {r.alertReason}
                  </span>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-mono text-[13px] tabular-nums text-[#E06B5F]">
                  {formatKRW(r.amount)}
                </p>
                <Link
                  href={`/expenses/${r.id}/edit`}
                  className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-gold transition-colors hover:text-gold-2"
                >
                  {reviewLabel} →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ============================================================
 * Transaction row
 * ============================================================ */
function TxRow({ row }: { row: ExpenseRow }) {
  return (
    <tr>
      <td className="font-mono text-[12px] tabular-nums text-text-3">{row.date}</td>
      <td className="text-text-1">{row.vendor}</td>
      <td>{row.category}</td>
      <td className="n">{formatKRW(row.amount)}</td>
      <td className="font-mono text-[11px] uppercase tracking-[0.06em] text-text-3">
        {PAYMENT_LABEL[row.paymentMethod] ?? row.paymentMethod}
      </td>
      <td>
        <StatusChip status={row.status} />
      </td>
    </tr>
  );
}

function StatusChip({ status }: { status: TxStatus }) {
  const map: Record<TxStatus, { label: string; variant: string }> = {
    approved: { label: "확인", variant: "ok" },
    pending: { label: "대기", variant: "info" },
    flagged: { label: "검토", variant: "rej" },
  };
  const { label, variant } = map[status];
  return (
    <span className={cn("chip", variant)}>
      <i />
      {label}
    </span>
  );
}
