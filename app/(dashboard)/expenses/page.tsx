import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Hourglass,
  Plus,
  Wallet,
} from "lucide-react";
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
  const top4Categories = byCategory.slice(0, 4);

  const periodLabel =
    month === null ? `${year}년 전체` : `${year}년 ${month}월`;

  const top3Distribution = computeDistribution(byCategory, t("label_other"));

  return (
    <div className="space-y-stack-lg">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            {t("title")}
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {periodLabel} · {rows.length}
            {t("kpi_unit_count")}
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
          <Link
            href="/expenses/import"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
          >
            {t("import_csv")}
          </Link>
          <Link
            href="/expenses/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-electric px-4 py-2 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            <Plus aria-hidden className="h-[18px] w-[18px]" />
            {t("add")}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-xl p-stack-md">
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

      {/* 카테고리 월 한도 경고 */}
      {budgetChecks.length > 0 ? (
        <BudgetAlertBanner
          checks={budgetChecks}
          title={t("limit_warning_title")}
          exceededLabel={t("exceeded")}
        />
      ) : null}

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KPICard
          label={t("kpi_total")}
          value={`₩${formatCompactKRW(totalDisbursed)}`}
          icon={Wallet}
          iconTone="text-tertiary-sky/60"
          barTone="bg-tertiary-sky"
          barGlow="rgba(123,208,255,0.8)"
          barWidth="100%"
        />
        <KPICard
          label={t("kpi_pending")}
          value={String(pendingCount)}
          unit={t("kpi_unit_count")}
          icon={Hourglass}
          iconTone="text-secondary-slate/60"
          barTone="bg-secondary-slate"
          barGlow="rgba(185,200,222,0.8)"
          barWidth={pendingCount > 0 ? "40%" : "0%"}
        />
        <KPICard
          label={t("kpi_review_needed")}
          labelTone="text-error-soft"
          value={String(anomalies.length)}
          valueTone="text-error-soft"
          unit={anomalies.length > 0 ? t("kpi_unit_count") : ""}
          icon={AlertTriangle}
          iconTone="text-error-soft/80"
          barTone="bg-error-soft animate-pulse"
          barGlow="rgba(255,180,171,0.8)"
          barWidth={anomalies.length > 0 ? "8%" : "0%"}
          glowText={anomalies.length > 0}
        />
      </div>

      {/* Bento */}
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <div className="flex flex-col gap-gutter lg:col-span-8">
          {/* Distribution + High-Value */}
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            <DistributionCard
              segments={top3Distribution}
              total={totalDisbursed}
              title={t("category_distribution")}
            />
            <HighValueCategoriesCard
              items={top4Categories}
              title={t("top_categories")}
              countUnit={t("kpi_unit_count")}
            />
          </div>

          {/* Transactions */}
          <div className="glass-panel flex-1 rounded-xl p-stack-md">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-on-surface">최근 거래</h3>
              <span className="text-label-sm text-on-surface-variant">
                {rows.length}건 · 최신 10건 표시
              </span>
            </div>
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <CircleDollarSign aria-hidden className="h-8 w-8 text-outline-variant" />
                <p className="text-body-md text-on-surface-variant">
                  해당 기간에 등록된 지출이 없습니다.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-surface-container-high">
                      <th className="whitespace-nowrap px-4 py-3 text-label-sm font-medium text-on-surface-variant">
                        일자
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-label-sm font-medium text-on-surface-variant">
                        거래처
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-label-sm font-medium text-on-surface-variant">
                        카테고리
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-label-sm font-medium text-on-surface-variant">
                        금액
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-center text-label-sm font-medium text-on-surface-variant">
                        결제
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-center text-label-sm font-medium text-on-surface-variant">
                        상태
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-data-tabular">
                    {rows.slice(0, 10).map((row) => (
                      <TxRow key={row.id} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — 검토 필요 거래 */}
        <div className="lg:col-span-4">
          <FlaggedListPanel
            rows={anomalies.slice(0, 5)}
            title={t("review_needed_transactions")}
            reviewLabel={t("review")}
          />
        </div>
      </div>
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

function computeDistribution(
  byCategory: Array<{ name: string; amount: number }>,
  otherLabel: string,
): Array<{ label: string; pct: number; color: string }> {
  const total = byCategory.reduce((s, c) => s + c.amount, 0);
  if (total === 0) return [];
  const palette = ["#c0c1ff", "#7bd0ff", "#39485a"];
  const top = byCategory.slice(0, 2);
  const rest = byCategory.slice(2).reduce((s, c) => s + c.amount, 0);
  const segments: Array<{ label: string; pct: number; color: string }> = top.map(
    (c, i) => ({
      label: c.name,
      pct: Math.round((c.amount / total) * 100),
      color: palette[i],
    }),
  );
  if (rest > 0) {
    // ★ "기타" 카테고리(실제 비용 카테고리)와 혼동 방지 — "그 외" 사용
    segments.push({
      label: otherLabel,
      pct: Math.round((rest / total) * 100),
      color: palette[2],
    });
  }
  return segments;
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
 * Bento sub-components
 * ============================================================ */

function DistributionCard({
  segments,
  total,
  title,
}: {
  segments: Array<{ label: string; pct: number; color: string }>;
  total: number;
  title: string;
}) {
  return (
    <div className="glass-panel flex h-80 flex-col rounded-xl p-stack-md">
      <h3 className="mb-4 text-sm font-semibold text-on-surface">{title}</h3>
      {segments.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-body-md text-on-surface-variant">
          데이터 없음
        </div>
      ) : (
        <div className="relative flex flex-1 items-center justify-center">
          <DonutChart segments={segments} />
          <div className="absolute bottom-0 right-0 flex flex-col gap-2">
            {segments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: seg.color }}
                />
                <span className="text-label-sm text-on-surface-variant">
                  {seg.label} ({seg.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {total > 0 ? (
        <div className="mt-2 text-label-sm text-on-surface-variant">
          총 {formatKRW(total)}
        </div>
      ) : null}
    </div>
  );
}

function HighValueCategoriesCard({
  items,
  title,
  countUnit,
}: {
  items: Array<{ name: string; txCount: number; amount: number }>;
  title: string;
  countUnit: string;
}) {
  return (
    <div className="glass-panel flex h-80 flex-col rounded-xl p-stack-md">
      <h3 className="mb-4 text-sm font-semibold text-on-surface">{title}</h3>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-body-md text-on-surface-variant">
          데이터 없음
        </div>
      ) : (
        <ul className="flex-1 space-y-3 overflow-y-auto pr-2">
          {items.map((c, i) => {
            const tone = TONE_PALETTE[i % TONE_PALETTE.length];
            return (
              <li
                key={c.name}
                className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-surface-variant/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded border",
                      tone.bg,
                      tone.border,
                    )}
                  >
                    <CircleDollarSign aria-hidden className={cn("h-4 w-4", tone.text)} />
                  </div>
                  <div>
                    <div className="text-data-tabular text-on-surface">{c.name}</div>
                    <div className="text-label-sm text-on-surface-variant">
                      {c.txCount}
                      {countUnit}
                    </div>
                  </div>
                </div>
                <div className="text-data-tabular font-semibold tabular-nums text-on-surface">
                  ₩{formatCompactKRW(c.amount)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
  const hasOver = checks.some((c) => c.status === "over");
  return (
    <div
      role="alert"
      className={cn(
        "glass-panel flex flex-col gap-3 rounded-xl border-l-4 p-stack-md",
        hasOver ? "border-l-error-soft" : "border-l-yellow-400/70",
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          aria-hidden
          className={cn(
            "h-4 w-4",
            hasOver ? "text-error-soft" : "text-yellow-400",
          )}
        />
        <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface">
          {title}
        </h3>
      </div>
      <ul className="space-y-2 text-data-tabular">
        {checks.map((c) => (
          <li
            key={c.categoryId}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <span className="font-medium text-on-surface">{c.name}</span>
            <span className="flex items-center gap-2">
              <span className="tabular-nums text-on-surface-variant">
                {formatKRW(c.used)} / {formatKRW(c.budget)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold",
                  c.status === "over"
                    ? "border-error-soft/30 bg-error-soft/10 text-error-soft"
                    : "border-yellow-400/30 bg-yellow-400/10 text-yellow-400",
                )}
              >
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
  title,
  reviewLabel,
}: {
  rows: ExpenseRow[];
  title: string;
  reviewLabel: string;
}) {
  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden rounded-xl">
      <div className="flex items-center gap-2 border-b border-surface-container-high bg-surface-container-lowest/50 p-4">
        <AlertTriangle aria-hidden className="h-4 w-4 text-error-soft" />
        <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <CheckCircle2 aria-hidden className="h-8 w-8 text-tertiary-sky" />
          <p className="text-body-md text-on-surface-variant">
            검토가 필요한 거래가 없습니다.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant/15">
          {rows.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-on-surface">{r.vendor}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {r.date} · {r.category}
                  </p>
                  {r.alertReason ? (
                    <p className="mt-1 inline-flex items-center gap-1 rounded border border-error-soft/30 bg-error-soft/10 px-1.5 py-0.5 text-[10px] font-semibold text-error-soft">
                      {r.alertReason}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-data-tabular font-bold tabular-nums text-error-soft">
                    {formatKRW(r.amount)}
                  </p>
                  <Link
                    href={`/expenses/${r.id}/edit`}
                    className="mt-1 inline-flex items-center gap-1 text-label-sm text-primary-electric transition-colors hover:text-primary-container"
                  >
                    {reviewLabel} <ChevronRight aria-hidden className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TONE_PALETTE = [
  {
    bg: "bg-primary-electric/10",
    border: "border-primary-electric/20",
    text: "text-primary-electric",
  },
  {
    bg: "bg-tertiary-sky/10",
    border: "border-tertiary-sky/20",
    text: "text-tertiary-sky",
  },
  {
    bg: "bg-secondary-slate/10",
    border: "border-secondary-slate/20",
    text: "text-secondary-slate",
  },
  {
    bg: "bg-error-soft/10",
    border: "border-error-soft/20",
    text: "text-error-soft",
  },
];

/* ============================================================
 * KPI Card
 * ============================================================ */
function KPICard({
  label,
  labelTone = "text-on-surface-variant",
  value,
  valueTone = "text-on-surface",
  unit,
  icon: Icon,
  iconTone,
  barTone,
  barGlow,
  barWidth,
  glowText,
}: {
  label: string;
  labelTone?: string;
  value: string;
  valueTone?: string;
  unit?: string;
  icon: typeof Wallet;
  iconTone: string;
  barTone: string;
  barGlow: string;
  barWidth: string;
  glowText?: boolean;
}) {
  return (
    <div className="glass-panel group relative flex h-32 flex-col justify-between overflow-hidden rounded-lg p-stack-md">
      <div className="relative z-10 flex items-start justify-between">
        <span className={cn("text-label-sm uppercase tracking-wider", labelTone)}>
          {label}
        </span>
        <Icon aria-hidden className={cn("h-5 w-5", iconTone)} />
      </div>

      <div className="relative z-10 flex items-baseline gap-2">
        <span
          className={cn(
            "text-display-xl font-bold tracking-tighter tabular-nums",
            valueTone,
            glowText && "drop-shadow-[0_0_10px_rgba(255,180,171,0.5)]",
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-data-tabular text-on-surface-variant">{unit}</span>
        ) : null}
      </div>

      <div
        aria-hidden
        className={cn("absolute bottom-0 left-0 h-1", barTone)}
        style={{ width: barWidth, boxShadow: `0 0 8px ${barGlow}` }}
      />
    </div>
  );
}

/* ============================================================
 * Donut chart — pure SVG (no recharts dep)
 * ============================================================ */
function DonutChart({
  segments,
}: {
  segments: { label: string; pct: number; color: string }[];
}) {
  if (segments.length === 0) return null;
  const stops = segments.reduce<string[]>((acc, seg, i) => {
    const prev = i === 0 ? 0 : segments.slice(0, i).reduce((s, x) => s + x.pct, 0);
    const next = prev + seg.pct;
    acc.push(`${seg.color} ${prev}% ${next}%`);
    return acc;
  }, []);
  const conic = `conic-gradient(from 0deg, ${stops.join(", ")})`;

  return (
    <div
      className="relative flex h-48 w-48 items-center justify-center rounded-full border-[12px] border-surface-container-high"
      style={{
        background: conic,
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
      }}
    >
      <div className="absolute flex h-36 w-36 items-center justify-center rounded-full bg-surface-container-lowest shadow-[0_0_15px_rgba(0,0,0,0.8)]">
        <div className="text-center">
          <div className="text-label-sm text-on-surface-variant">합계</div>
          <div className="text-body-lg font-bold text-primary-electric">100%</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Transaction row
 * ============================================================ */
function TxRow({ row }: { row: ExpenseRow }) {
  const isAnomaly = row.status === "flagged";
  return (
    <tr
      className={cn(
        "group border-b border-surface-container/50 transition-colors",
        isAnomaly
          ? "relative bg-error-soft/5 hover:bg-error-soft/10"
          : "hover:bg-primary-electric/5",
      )}
    >
      <td
        className={cn(
          "whitespace-nowrap px-4 py-3 text-on-surface-variant tabular-nums group-hover:text-on-surface",
          isAnomaly && "relative pl-5",
        )}
      >
        {isAnomaly ? (
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-1 bg-error-soft opacity-70"
          />
        ) : null}
        {row.date}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-4 py-3",
          isAnomaly ? "font-medium text-error-soft" : "text-on-surface",
        )}
      >
        {row.vendor}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
        {row.category}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-on-surface">
        {formatKRW(row.amount)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center text-label-sm text-on-surface-variant">
        {PAYMENT_LABEL[row.paymentMethod] ?? row.paymentMethod}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center">
        <StatusBadge status={row.status} />
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: TxStatus }) {
  const map: Record<TxStatus, { label: string; className: string }> = {
    approved: {
      label: "확인",
      className: "bg-tertiary-sky/10 text-tertiary-sky border-tertiary-sky/20",
    },
    pending: {
      label: "대기",
      className:
        "bg-secondary-container/30 text-on-surface-variant border-outline-variant/30",
    },
    flagged: {
      label: "검토필요",
      className: "bg-error-soft/10 text-error-soft border-error-soft/20",
    },
  };
  const { label, className } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded border px-2 py-1 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}
