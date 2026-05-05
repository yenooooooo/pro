"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

type Props = {
  year: number;
  month: number;
  monthsAhead?: number;
  monthsBack?: number;
};

export function PeriodFilter({
  year,
  month,
  monthsAhead = 2,
  monthsBack = 12,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const options = generateOptions(
    today.getFullYear(),
    today.getMonth() + 1,
    monthsAhead,
    monthsBack,
  );
  const currentValue = `${year}-${month}`;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const [y, m] = e.target.value.split("-").map(Number);
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(y));
    params.set("month", String(m));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="relative">
      <select
        aria-label="대상 월"
        value={currentValue}
        onChange={handleChange}
        className="min-h-11 appearance-none rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 pr-8 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
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

function generateOptions(
  todayYear: number,
  todayMonth: number,
  monthsAhead: number,
  monthsBack: number,
): Array<{ value: string; label: string }> {
  // 오늘 기준 +monthsAhead 부터 -monthsBack 까지 (최신이 위)
  const options: Array<{ value: string; label: string }> = [];
  let y = todayYear;
  let m = todayMonth + monthsAhead;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  const total = monthsAhead + monthsBack + 1;
  for (let i = 0; i < total; i++) {
    options.push({ value: `${y}-${m}`, label: `${y}년 ${m}월` });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return options;
}
