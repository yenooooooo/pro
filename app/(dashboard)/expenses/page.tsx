import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileScan,
  Gavel,
  Hourglass,
  Laptop,
  MoreHorizontal,
  Plane,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatKRW } from "@/lib/utils/format";

type TxStatus = "approved" | "pending" | "flagged";

type ExpenseRow = {
  id: string;
  date: string;
  vendor: string;
  category: string;
  amount: number;
  status: TxStatus;
};

// Phase 5.1에서 expenses 조회로 교체.
const ROWS: ExpenseRow[] = [
  {
    id: "1",
    date: "26.04.22",
    vendor: "Samsung Electronics",
    category: "IT 장비",
    amount: 4_200_000,
    status: "approved",
  },
  {
    id: "2",
    date: "26.04.21",
    vendor: "Unknown Vendor X",
    category: "기타",
    amount: 1_550_000,
    status: "flagged",
  },
  {
    id: "3",
    date: "26.04.18",
    vendor: "Korean Air",
    category: "출장비",
    amount: 2_850_000,
    status: "pending",
  },
  {
    id: "4",
    date: "26.04.15",
    vendor: "Shilla Hotel",
    category: "숙박비",
    amount: 850_000,
    status: "approved",
  },
];

type CategoryHighlight = {
  name: string;
  txCount: number;
  amount: number;
  icon: typeof Plane;
  tone: "primary" | "tertiary" | "secondary" | "error";
};

const HIGH_VALUE_CATEGORIES: CategoryHighlight[] = [
  {
    name: "해외 출장",
    txCount: 12,
    amount: 32_500_000,
    icon: Plane,
    tone: "primary",
  },
  {
    name: "IT 장비 구매",
    txCount: 5,
    amount: 18_200_000,
    icon: Laptop,
    tone: "tertiary",
  },
  {
    name: "법인 식대",
    txCount: 142,
    amount: 9_800_000,
    icon: UtensilsCrossed,
    tone: "secondary",
  },
  {
    name: "법무 자문",
    txCount: 2,
    amount: 15_000_000,
    icon: Gavel,
    tone: "error",
  },
];

const TONE_CLASS: Record<
  CategoryHighlight["tone"],
  { bg: string; border: string; text: string }
> = {
  primary: {
    bg: "bg-primary-electric/10",
    border: "border-primary-electric/20",
    text: "text-primary-electric",
  },
  tertiary: {
    bg: "bg-tertiary-sky/10",
    border: "border-tertiary-sky/20",
    text: "text-tertiary-sky",
  },
  secondary: {
    bg: "bg-secondary-slate/10",
    border: "border-secondary-slate/20",
    text: "text-secondary-slate",
  },
  error: {
    bg: "bg-error-soft/10",
    border: "border-error-soft/20",
    text: "text-error-soft",
  },
};

// 도넛 차트 비율
const DISTRIBUTION = [
  { label: "운영비", pct: 45, color: "#c0c1ff", glow: "#c0c1ff" },
  { label: "인건비", pct: 30, color: "#7bd0ff", glow: "#7bd0ff" },
  { label: "기타", pct: 25, color: "#39485a", glow: null },
];

const TOTAL_DISBURSED = 145_200_000;
const PENDING_COUNT = 12;
const ANOMALY_COUNT = ROWS.filter((r) => r.status === "flagged").length;

// AI 분석에서 가장 최근 flagged 거래
const FLAGGED = ROWS.find((r) => r.status === "flagged");

export default function ExpensesPage() {
  return (
    <div className="space-y-stack-lg">
      {/* ============================================================
       * Top KPI Row
       * ============================================================ */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KPICard
          label="Total Disbursed"
          value={`₩${formatCompactKRW(TOTAL_DISBURSED)}`}
          delta={{ icon: TrendingUp, text: "2.4%", tone: "tertiary" }}
          icon={Wallet}
          iconTone="text-tertiary-sky/60"
          barTone="bg-tertiary-sky"
          barGlow="rgba(123,208,255,0.8)"
          barWidth="75%"
        />
        <KPICard
          label="Pending Approval"
          value={String(PENDING_COUNT)}
          unit="건"
          icon={Hourglass}
          iconTone="text-secondary-slate/60"
          barTone="bg-secondary-slate"
          barGlow="rgba(185,200,222,0.8)"
          barWidth="25%"
        />
        <KPICard
          label="Anomalies Detected"
          labelTone="text-error-soft"
          value={String(ANOMALY_COUNT)}
          valueTone="text-error-soft"
          unit="요주의"
          icon={AlertTriangle}
          iconTone="text-error-soft/80"
          barTone="bg-error-soft animate-pulse"
          barGlow="rgba(255,180,171,0.8)"
          barWidth="8%"
          glowText
        />
      </div>

      {/* ============================================================
       * Main bento grid (12 cols)
       * ============================================================ */}
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        {/* LEFT (8 cols) — distribution + categories + transactions */}
        <div className="flex flex-col gap-gutter lg:col-span-8">
          {/* Row 1: distribution + high-value categories */}
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            {/* Expense Distribution */}
            <div className="glass-panel flex h-80 flex-col rounded-xl p-stack-md">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-on-surface">
                  Expense Distribution
                </h3>
                <button
                  type="button"
                  aria-label="more"
                  className="text-on-surface-variant transition-colors hover:text-white"
                >
                  <MoreHorizontal aria-hidden className="h-4 w-4" />
                </button>
              </div>

              <div className="relative flex flex-1 items-center justify-center">
                <DonutChart segments={DISTRIBUTION} />

                {/* Legend */}
                <div className="absolute bottom-0 right-0 flex flex-col gap-2">
                  {DISTRIBUTION.map((seg) => (
                    <div key={seg.label} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full"
                        style={{
                          background: seg.color,
                          boxShadow: seg.glow ? `0 0 5px ${seg.glow}` : undefined,
                        }}
                      />
                      <span className="text-label-sm text-on-surface-variant">
                        {seg.label} ({seg.pct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* High-Value Categories */}
            <div className="glass-panel flex h-80 flex-col rounded-xl p-stack-md">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-on-surface">
                  High-Value Categories
                </h3>
              </div>
              <ul className="flex-1 space-y-3 overflow-y-auto pr-2">
                {HIGH_VALUE_CATEGORIES.map((c) => {
                  const t = TONE_CLASS[c.tone];
                  return (
                    <li
                      key={c.name}
                      className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-surface-variant/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded border",
                            t.bg,
                            t.border,
                          )}
                        >
                          <c.icon aria-hidden className={cn("h-4 w-4", t.text)} />
                        </div>
                        <div>
                          <div className="text-data-tabular text-on-surface">
                            {c.name}
                          </div>
                          <div className="text-label-sm text-on-surface-variant">
                            {c.txCount} Transactions
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
            </div>
          </div>

          {/* Row 2: Recent Transactions */}
          <div className="glass-panel flex-1 rounded-xl p-stack-md">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-on-surface">
                Recent Transactions
              </h3>
              <button
                type="button"
                className="text-label-sm text-primary-electric transition-colors hover:text-primary-fixed-dim"
              >
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-surface-container-high">
                    <th className="px-4 py-3 text-label-sm font-medium text-on-surface-variant">
                      Date
                    </th>
                    <th className="px-4 py-3 text-label-sm font-medium text-on-surface-variant">
                      Merchant
                    </th>
                    <th className="px-4 py-3 text-label-sm font-medium text-on-surface-variant">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-label-sm font-medium text-on-surface-variant">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-center text-label-sm font-medium text-on-surface-variant">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="text-data-tabular">
                  {ROWS.map((row) => (
                    <TxRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT (4 cols) — Document AI Analysis */}
        <div className="lg:col-span-4">
          <DocumentAIPanel flagged={FLAGGED} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * KPI Card
 * ============================================================ */
type KPICardProps = {
  label: string;
  labelTone?: string;
  value: string;
  valueTone?: string;
  unit?: string;
  delta?: { icon: typeof TrendingUp; text: string; tone: "tertiary" | "error" };
  icon: typeof Wallet;
  iconTone: string;
  barTone: string;
  barGlow: string;
  barWidth: string;
  glowText?: boolean;
};

function KPICard({
  label,
  labelTone = "text-on-surface-variant",
  value,
  valueTone = "text-on-surface",
  unit,
  delta,
  icon: Icon,
  iconTone,
  barTone,
  barGlow,
  barWidth,
  glowText,
}: KPICardProps) {
  return (
    <div className="glass-panel group relative flex h-32 flex-col justify-between overflow-hidden rounded-lg p-stack-md">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-transparent to-primary-electric/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative z-10 flex items-start justify-between">
        <span
          className={cn(
            "text-label-sm uppercase tracking-wider",
            labelTone,
          )}
        >
          {label}
        </span>
        <Icon aria-hidden className={cn("h-5 w-5", iconTone)} />
      </div>

      <div className="relative z-10 flex items-baseline gap-2">
        <span
          className={cn(
            "text-display-xl font-bold tracking-tighter tabular-nums",
            valueTone,
            glowText && "drop-shadow-[0_0_10px_rgba(128,131,255,0.5)]",
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-data-tabular text-on-surface-variant">{unit}</span>
        ) : null}
        {delta ? (
          <span className="flex items-center text-data-tabular text-tertiary-sky">
            <delta.icon aria-hidden className="mr-1 h-4 w-4" />
            {delta.text}
          </span>
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
  const stops = segments.reduce<string[]>((acc, seg, i) => {
    const prev = acc.length === 0 ? 0 : segments.slice(0, i).reduce((s, x) => s + x.pct, 0);
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
          <div className="text-label-sm text-on-surface-variant">Total</div>
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
        "group cursor-pointer border-b border-surface-container/50 transition-colors",
        isAnomaly
          ? "relative bg-error-soft/5 hover:bg-error-soft/10"
          : "hover:bg-primary-electric/5",
      )}
    >
      <td
        className={cn(
          "px-4 py-3 text-on-surface-variant group-hover:text-on-surface",
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
          "px-4 py-3",
          isAnomaly ? "font-medium text-error-soft" : "text-on-surface",
        )}
      >
        {row.vendor}
      </td>
      <td className="px-4 py-3 text-on-surface-variant">{row.category}</td>
      <td className="px-4 py-3 text-right font-medium tabular-nums text-on-surface">
        {formatKRW(row.amount)}
      </td>
      <td className="px-4 py-3 text-center">
        <StatusBadge status={row.status} />
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: TxStatus }) {
  const map: Record<TxStatus, { label: string; className: string }> = {
    approved: {
      label: "Approved",
      className: "bg-tertiary-sky/10 text-tertiary-sky border-tertiary-sky/20",
    },
    pending: {
      label: "Pending",
      className:
        "bg-secondary-container/30 text-on-surface-variant border-outline-variant/30",
    },
    flagged: {
      label: "Flagged",
      className: "bg-error-soft/10 text-error-soft border-error-soft/20",
    },
  };
  const { label, className } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-1 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

/* ============================================================
 * Document AI Analysis panel
 * ============================================================ */
function DocumentAIPanel({ flagged }: { flagged: ExpenseRow | undefined }) {
  return (
    <div className="glass-panel flex flex-col overflow-hidden rounded-xl">
      {/* Header */}
      <div className="z-10 flex items-center justify-between border-b border-surface-container-high bg-surface-container-lowest/50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <FileScan aria-hidden className="h-4 w-4 text-primary-electric" />
          Document AI Analysis
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="확대"
            className="flex h-6 w-6 items-center justify-center rounded bg-surface-variant transition-colors hover:bg-surface-bright"
          >
            <ZoomIn aria-hidden className="h-3 w-3 text-on-surface" />
          </button>
        </div>
      </div>

      {/* Scanner body */}
      <div className="relative flex flex-1 flex-col gap-4 bg-surface-container-lowest p-4">
        {/* Scan line overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(128,131,255,0.1) 1px, transparent 1px)",
            backgroundSize: "100% 4px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-30 h-1 bg-primary-container/60 shadow-[0_0_15px_#8083ff] animate-scanline"
        />

        {/* Receipt placeholder (gradient block — Phase 5.2 영수증 업로드 시 실 이미지) */}
        <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded border border-outline-variant/30 bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400">
          <div className="px-4 text-center">
            <div className="text-label-sm font-bold uppercase tracking-widest text-slate-700">
              RECEIPT
            </div>
            <div className="mt-2 space-y-0.5 text-[10px] text-slate-600">
              <div>━━━━━━━━━━━━━━━━━━</div>
              <div>VENDOR · DATE</div>
              <div>ITEM 1 ····· ₩XX,XXX</div>
              <div>ITEM 2 ····· ₩XX,XXX</div>
              <div>━━━━━━━━━━━━━━━━━━</div>
              <div className="font-bold">TOTAL ····· ₩XX,XXX</div>
            </div>
          </div>

          {/* AI bounding boxes */}
          <div
            aria-hidden
            className="absolute left-[10%] top-[20%] h-[5%] w-[60%] rounded-sm border border-primary-electric bg-primary-electric/10"
          />
          <div
            aria-hidden
            className="absolute left-[60%] top-[35%] h-[5%] w-[30%] rounded-sm border border-tertiary-sky bg-tertiary-sky/10"
          />
          <div
            aria-hidden
            className="absolute bottom-[15%] left-[50%] z-10 h-[8%] w-[40%] rounded-sm border border-error-soft bg-error-soft/10"
          >
            <span className="absolute -right-2 -top-3 flex h-5 w-5 items-center justify-center rounded-full border border-error-soft bg-surface-container">
              <AlertTriangle aria-hidden className="h-3 w-3 text-error-soft" />
            </span>
          </div>
        </div>

        {/* Extracted Data */}
        <div className="z-10 rounded-lg border border-outline-variant/30 bg-surface-container/80 p-3">
          <div className="mb-2 flex items-center text-label-sm text-primary-electric">
            <CheckCircle2 aria-hidden className="mr-1 h-3.5 w-3.5" />
            Extracted Data
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="block text-on-surface-variant">Vendor</span>
              <span className="text-on-surface">
                {flagged?.vendor ?? "—"}
              </span>
            </div>
            <div>
              <span className="block text-on-surface-variant">Date</span>
              <span className="text-on-surface">
                {flagged?.date ?? "—"}
              </span>
            </div>
            <div className="col-span-2 mt-1 flex items-end justify-between border-t border-surface-container-high pt-1">
              <div>
                <span className="block text-error-soft">Amount Mismatch</span>
                <span className="text-sm font-bold text-error-soft">
                  {flagged ? formatKRW(flagged.amount) : "—"}
                </span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded bg-primary-electric px-3 py-1 text-xs font-medium text-on-primary transition-colors hover:bg-primary-fixed-dim"
              >
                Review
                <ChevronRight aria-hidden className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */
// 디자인 라벨이 영문 M/B (백만/십억). Korean 억·만 표기는 별도 formatKRWCompact 사용.
function formatCompactKRW(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
