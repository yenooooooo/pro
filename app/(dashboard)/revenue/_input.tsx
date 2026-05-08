"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { upsertRevenueAction } from "./actions";

type Department = { id: string; name: string };

type Row = {
  id: string;
  year: number;
  month: number;
  department_id: string | null;
  amount: number;
  vat: number;
};

type Props = {
  year: number;
  departments: Department[];
  grid: Record<string, Row>;
  monthlyTotals: number[];
};

export function RevenueInput({ year, departments, grid, monthlyTotals }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  function handleBlur(month: number, deptId: string, raw: string) {
    const amount = Number(raw.replace(/,/g, "")) || 0;
    if (amount < 0) return;

    const key = `${month}-${deptId}`;
    const existing = grid[key];
    if (existing && existing.amount === amount) return;

    setSaved(null);
    startTransition(async () => {
      const result = await upsertRevenueAction({
        year,
        month,
        department_id: deptId,
        amount,
      });
      if (result.ok) {
        setSaved(`${month}월 ${departments.find((d) => d.id === deptId)?.name ?? ""}: ${amount.toLocaleString("ko-KR")}원 저장`);
        router.refresh();
        setTimeout(() => setSaved(null), 2200);
      }
    });
  }

  return (
    <div className="glass-panel overflow-hidden rounded-xl">
      <header className="flex items-center justify-between border-b border-outline-variant/30 px-5 py-3">
        <h2 className="text-headline-md font-semibold text-on-surface">
          {year}년 월별·부서별 매출 (원)
        </h2>
        {pending ? (
          <span className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            저장 중…
          </span>
        ) : saved ? (
          <span className="inline-flex items-center gap-1 text-label-sm text-emerald-300">
            <Check aria-hidden className="h-4 w-4" />
            {saved}
          </span>
        ) : null}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-data-tabular">
          <thead>
            <tr className="border-b border-outline-variant/30 bg-surface-container/30 text-label-sm uppercase tracking-widest text-on-surface-variant">
              <th className="px-3 py-2 text-left sticky left-0 bg-surface-container/30">월</th>
              {departments.map((d) => (
                <th key={d.id} className="px-3 py-2 text-right">
                  {d.name}
                </th>
              ))}
              <th className="px-3 py-2 text-right">월 합계</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr
                key={m}
                className="border-b border-outline-variant/15 last:border-0 hover:bg-primary/5"
              >
                <td className="px-3 py-2 font-medium text-on-surface sticky left-0 bg-surface-container/10">
                  {m}월
                </td>
                {departments.map((d) => {
                  const cell = grid[`${m}-${d.id}`];
                  const value = cell?.amount ?? 0;
                  return (
                    <td key={d.id} className="px-2 py-1 text-right">
                      <input
                        type="text"
                        defaultValue={value.toLocaleString("ko-KR")}
                        onBlur={(e) => handleBlur(m, d.id, e.target.value)}
                        className="w-32 rounded border border-outline-variant/30 bg-surface-container-low px-2 py-1 text-right text-data-tabular tabular-nums text-on-surface focus:border-primary-electric focus:outline-none focus:ring-1 focus:ring-primary-electric"
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-on-surface">
                  {monthlyTotals[m - 1].toLocaleString("ko-KR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-outline-variant/30 bg-surface-container/30 px-5 py-2 text-label-sm text-on-surface-variant">
        💡 셀을 클릭해서 값을 입력하고 다른 곳을 클릭하면 자동 저장됩니다 (천단위 콤마 자동).
      </p>
    </div>
  );
}
