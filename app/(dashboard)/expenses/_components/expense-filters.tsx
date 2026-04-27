"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";

type Option = { value: string; label: string };

type Props = {
  year: number;
  month: number | null; // null = 연도 전체
  categoryId: string | null;
  vendorId: string | null;
  paymentMethod: string | null;
  categories: Option[];
  vendors: Option[];
};

const PAYMENT_METHODS: Option[] = [
  { value: "card", label: "카드" },
  { value: "cash", label: "현금" },
  { value: "transfer", label: "계좌이체" },
  { value: "other", label: "기타" },
];

export function ExpenseFilters({
  year,
  month,
  categoryId,
  vendorId,
  paymentMethod,
  categories,
  vendors,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const periodOptions = generatePeriodOptions(year, month, 12);
  const periodValue = month === null ? `${year}-all` : `${year}-${month}`;

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  function updatePeriod(value: string) {
    const [y, m] = value.split("-");
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", y);
    if (m === "all") params.delete("month");
    else params.set("month", m);
    router.push(`?${params.toString()}`);
  }

  const hasFilter = categoryId || vendorId || paymentMethod;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={periodValue} onChange={updatePeriod} options={periodOptions} ariaLabel="기간" />
      <Select
        value={categoryId ?? ""}
        onChange={(v) => update("category", v || null)}
        options={[{ value: "", label: "전체 카테고리" }, ...categories]}
        ariaLabel="카테고리"
      />
      <Select
        value={vendorId ?? ""}
        onChange={(v) => update("vendor", v || null)}
        options={[{ value: "", label: "전체 거래처" }, ...vendors]}
        ariaLabel="거래처"
      />
      <Select
        value={paymentMethod ?? ""}
        onChange={(v) => update("payment", v || null)}
        options={[{ value: "", label: "결제수단 전체" }, ...PAYMENT_METHODS]}
        ariaLabel="결제수단"
      />
      {hasFilter ? (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams();
            if (year) params.set("year", String(year));
            if (month !== null) params.set("month", String(month));
            router.push(`?${params.toString()}`);
          }}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <X aria-hidden className="h-4 w-4" />
          필터 초기화
        </button>
      ) : null}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 max-w-[180px] appearance-none truncate rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 pr-8 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
      >
        {options.map((o) => (
          <option key={o.value || "_empty"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-outline"
      />
    </div>
  );
}

function generatePeriodOptions(
  startYear: number,
  startMonth: number | null,
  count: number,
): Option[] {
  const options: Option[] = [{ value: `${startYear}-all`, label: `${startYear}년 전체` }];
  let y = startYear;
  let m = startMonth ?? 12;
  for (let i = 0; i < count; i++) {
    options.push({ value: `${y}-${m}`, label: `${y}년 ${m}월` });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
      options.push({ value: `${y}-all`, label: `${y}년 전체` });
    }
  }
  return options;
}
