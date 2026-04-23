import {
  AlertTriangle,
  ChevronDown,
  CreditCard,
  Download,
  Receipt,
  Search,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatKRW } from "@/lib/utils/format";

type PaymentMethod = "법인카드" | "계좌이체" | "현금";

type ExpenseRow = {
  id: string;
  date: string;
  category: string;
  vendor: string;
  amount: number;
  vat: number;
  method: PaymentMethod;
  hasReceipt: boolean;
  description: string;
};

// Phase 5.1에서 expenses 조회로 교체.
const ROWS: ExpenseRow[] = [
  {
    id: "1",
    date: "04.22",
    category: "임대료",
    vendor: "강남빌딩관리",
    amount: 3_500_000,
    vat: 350_000,
    method: "계좌이체",
    hasReceipt: true,
    description: "4월 사무실 임대료",
  },
  {
    id: "2",
    date: "04.18",
    category: "접대비",
    vendor: "한정식 명가",
    amount: 240_000,
    vat: 24_000,
    method: "법인카드",
    hasReceipt: true,
    description: "A사 대표 미팅",
  },
  {
    id: "3",
    date: "04.15",
    category: "복리후생",
    vendor: "코어플러스피트니스",
    amount: 1_200_000,
    vat: 120_000,
    method: "계좌이체",
    hasReceipt: true,
    description: "전직원 헬스장 월회비",
  },
  {
    id: "4",
    date: "04.12",
    category: "비품",
    vendor: "오피스디포",
    amount: 180_000,
    vat: 18_000,
    method: "법인카드",
    hasReceipt: false,
    description: "사무용품 구매",
  },
  {
    id: "5",
    date: "04.08",
    category: "교육",
    vendor: "프라임러닝",
    amount: 800_000,
    vat: 80_000,
    method: "계좌이체",
    hasReceipt: true,
    description: "개발팀 기술 세미나",
  },
  {
    id: "6",
    date: "04.03",
    category: "통신",
    vendor: "KT",
    amount: 450_000,
    vat: 45_000,
    method: "계좌이체",
    hasReceipt: true,
    description: "인터넷·전화 요금",
  },
];

type Category = {
  name: string;
  spent: number;
  budget: number;
};

const CATEGORIES: Category[] = [
  { name: "임대료", spent: 3_500_000, budget: 3_500_000 },
  { name: "복리후생", spent: 1_200_000, budget: 2_000_000 },
  { name: "교육", spent: 800_000, budget: 1_500_000 },
  { name: "통신", spent: 450_000, budget: 500_000 },
  { name: "접대비", spent: 240_000, budget: 500_000 },
  { name: "비품", spent: 180_000, budget: 300_000 },
];

const TOTAL_SPENT = CATEGORIES.reduce((s, c) => s + c.spent, 0);
const TOTAL_BUDGET = CATEGORIES.reduce((s, c) => s + c.budget, 0);

const METHOD_COLOR: Record<PaymentMethod, string> = {
  법인카드: "border-primary-container/50 bg-primary-container/20 text-primary-container",
  계좌이체: "border-tertiary-container/50 bg-tertiary-container/20 text-tertiary-sky",
  현금: "border-outline-variant/50 bg-surface-variant text-on-surface-variant",
};

export default function ExpensesPage() {
  return (
    <div className="space-y-stack-lg">
      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="mb-2 text-headline-lg font-semibold tracking-tight text-on-surface">
            Expense Ledger
          </h2>
          <p className="text-body-md text-on-surface-variant">
            카테고리·거래처별 지출 · 부가세·영수증 관리
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded border border-outline-variant/50 bg-surface-container-high px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            <Download aria-hidden className="h-[18px] w-[18px]" />
            내보내기
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded border border-outline-variant/50 bg-surface-container-high px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            <Upload aria-hidden className="h-[18px] w-[18px]" />
            영수증 업로드
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded bg-gradient-to-b from-primary-electric to-inverse-primary px-6 py-2 text-label-sm font-semibold text-on-primary shadow-[0_0_15px_rgba(192,193,255,0.3)] transition-opacity hover:opacity-90"
          >
            <Receipt aria-hidden className="h-[18px] w-[18px]" />
            지출 등록
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* LEFT: 필터 + 테이블 */}
        <div className="col-span-12 flex flex-col gap-stack-md xl:col-span-8">
          {/* 필터 */}
          <div className="glass-panel flex flex-col items-start justify-between gap-3 rounded-lg bg-surface-container-low p-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-3">
              <div className="relative max-w-xs">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
                />
                <input
                  type="search"
                  placeholder="거래처·내용 검색"
                  className="min-h-11 rounded border border-outline-variant/40 bg-surface py-1.5 pl-9 pr-3 text-data-tabular text-on-surface placeholder:text-outline focus:border-primary-electric focus:outline-none focus:ring-1 focus:ring-primary-electric"
                />
              </div>
              <FilterSelect label="2026년 4월" options={["2026년 4월", "2026년 3월", "2026년 2월"]} />
              <FilterSelect
                label="전체 카테고리"
                options={["전체 카테고리", "임대료", "복리후생", "접대비", "비품", "교육", "통신"]}
              />
              <FilterSelect
                label="결제 수단"
                options={["결제 수단", "법인카드", "계좌이체", "현금"]}
              />
            </div>
          </div>

          {/* 테이블 */}
          <div className="glass-panel overflow-x-auto rounded-lg bg-surface-container-lowest">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead className="border-b border-outline-variant/30 bg-surface-container-low text-label-sm uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4 font-semibold">일자</th>
                  <th className="px-6 py-4 font-semibold">카테고리</th>
                  <th className="px-6 py-4 font-semibold">거래처 · 내용</th>
                  <th className="px-6 py-4 text-right font-semibold">금액</th>
                  <th className="px-6 py-4 text-right font-semibold">부가세</th>
                  <th className="px-6 py-4 text-center font-semibold">결제</th>
                  <th className="px-6 py-4 text-center font-semibold">영수증</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-data-tabular text-on-surface">
                {ROWS.map((row) => (
                  <tr
                    key={row.id}
                    className="group transition-colors hover:bg-primary-electric/5"
                  >
                    <td className="px-6 py-3 tabular-nums text-on-surface-variant">
                      {row.date}
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded-md border border-outline-variant/30 bg-surface-container px-2 py-1 text-[11px] text-on-surface-variant">
                        {row.category}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-on-surface">{row.vendor}</div>
                      <div className="text-xs text-on-surface-variant">{row.description}</div>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums text-white">
                      {formatKRW(row.amount)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-on-surface-variant">
                      {formatKRW(row.vat)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                          METHOD_COLOR[row.method],
                        )}
                      >
                        {row.method}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {row.hasReceipt ? (
                        <Receipt
                          aria-label="영수증 있음"
                          className="mx-auto h-4 w-4 text-tertiary-sky"
                        />
                      ) : (
                        <AlertTriangle
                          aria-label="영수증 누락"
                          className="mx-auto h-4 w-4 text-error-soft"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: 월 합계 + 카테고리 한도 */}
        <div className="col-span-12 flex flex-col gap-stack-lg xl:col-span-4">
          {/* 월 합계 카드 */}
          <div className="glass-panel relative overflow-hidden rounded-xl bg-surface-container p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-electric/20 blur-2xl"
            />
            <div className="mb-6 flex items-center gap-2">
              <CreditCard aria-hidden className="h-5 w-5 text-primary-electric" />
              <h3 className="text-[18px] font-semibold text-white">Monthly Spend</h3>
            </div>
            <div className="mb-2 text-label-sm uppercase tracking-wider text-on-surface-variant">
              2026년 4월 누적
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tighter tabular-nums text-white">
                {formatKRW(TOTAL_SPENT)}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-label-sm">
              <span className="text-on-surface-variant">예산 {formatKRW(TOTAL_BUDGET)}</span>
              <span className="text-tertiary-sky">
                · {Math.round((TOTAL_SPENT / TOTAL_BUDGET) * 100)}% 소진
              </span>
            </div>
          </div>

          {/* 카테고리별 한도 */}
          <div className="glass-panel rounded-xl bg-surface-container p-6">
            <h3 className="mb-4 text-[18px] font-semibold text-white">카테고리별 월 한도</h3>
            <ul className="space-y-4">
              {CATEGORIES.map((c) => {
                const pct = Math.min(100, Math.round((c.spent / c.budget) * 100));
                const isWarn = pct >= 90;
                return (
                  <li key={c.name}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-data-tabular font-medium text-on-surface">
                        {c.name}
                      </span>
                      <span
                        className={cn(
                          "text-label-sm tabular-nums",
                          isWarn ? "text-error-soft" : "text-on-surface-variant",
                        )}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                      <div
                        className={cn(
                          "h-1.5 rounded-full",
                          isWarn
                            ? "bg-error-soft"
                            : pct >= 60
                              ? "bg-tertiary-sky"
                              : "bg-primary-electric",
                        )}
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                    <div className="mt-1 text-[11px] tabular-nums text-outline">
                      {formatKRW(c.spent)} / {formatKRW(c.budget)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        className="min-h-11 appearance-none rounded border border-outline-variant/40 bg-surface px-3 pr-8 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-outline"
      />
    </div>
  );
}
