import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type AttendanceRow = {
  work_date: string;
  regular_hours: number;
  overtime_hours: number;
  night_hours: number;
  holiday_hours: number;
};

type Props = {
  rows: AttendanceRow[];
};

type MonthAgg = {
  year: number;
  month: number;
  days: number;
  regular: number;
  overtime: number;
  night: number;
  holiday: number;
};

/** 주 52시간 한도 = 주 40 + 연장 12. 월간 환산 시 가산 = 12h × 4.345주 ≈ 52h */
const MONTHLY_OT_WARN = 52;

export function AttendanceHistoryTab({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-12 text-center">
        <h3 className="text-headline-md font-semibold text-on-surface">
          근태이력
        </h3>
        <p className="mt-2 text-body-md text-on-surface-variant">
          최근 12개월간 근태 기록이 없습니다.
        </p>
      </div>
    );
  }

  const aggregated = aggregate(rows);

  return (
    <section className="glass-panel rounded-xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-headline-md font-semibold text-on-surface">
          월별 근태 집계
        </h3>
        <p className="text-label-sm text-on-surface-variant">
          최근 12개월
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-data-tabular">
          <thead>
            <tr className="border-b border-outline-variant/40 text-label-sm uppercase tracking-widest text-on-surface-variant">
              <th className="px-3 py-2 text-left">월</th>
              <th className="px-3 py-2 text-right">근무일</th>
              <th className="px-3 py-2 text-right">정규</th>
              <th className="px-3 py-2 text-right">연장</th>
              <th className="px-3 py-2 text-right">야간</th>
              <th className="px-3 py-2 text-right">휴일</th>
              <th className="px-3 py-2 text-right">합계</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {aggregated.map((m) => {
              const total = m.regular + m.overtime + m.night + m.holiday;
              const otWarn = m.overtime > MONTHLY_OT_WARN;
              return (
                <tr
                  key={`${m.year}-${m.month}`}
                  className="border-b border-outline-variant/15 last:border-0 transition-colors hover:bg-primary/5"
                >
                  <td className="px-3 py-2 text-on-surface">
                    {m.year}년 {m.month}월
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                    {m.days}일
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface">
                    {m.regular.toFixed(1)}h
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right tabular-nums",
                      otWarn ? "font-semibold text-amber-300" : "text-on-surface",
                    )}
                  >
                    {m.overtime.toFixed(1)}h
                    {otWarn ? (
                      <span className="ml-1 text-[10px]" title="주 52시간 환산 한도 초과">
                        ⚠
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface">
                    {m.night.toFixed(1)}h
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface">
                    {m.holiday.toFixed(1)}h
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-on-surface">
                    {total.toFixed(1)}h
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/attendance?year=${m.year}&month=${m.month}`}
                      title="해당 월의 근태 상세"
                      className="inline-flex items-center gap-1 text-label-sm text-primary-electric hover:text-primary-container"
                    >
                      <CalendarDays aria-hidden className="h-4 w-4" />
                      상세
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-container/40 text-label-sm">
              <td className="px-3 py-2 font-semibold text-on-surface">합계</td>
              <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                {aggregated.reduce((s, m) => s + m.days, 0)}일
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                {aggregated.reduce((s, m) => s + m.regular, 0).toFixed(1)}h
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                {aggregated.reduce((s, m) => s + m.overtime, 0).toFixed(1)}h
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                {aggregated.reduce((s, m) => s + m.night, 0).toFixed(1)}h
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                {aggregated.reduce((s, m) => s + m.holiday, 0).toFixed(1)}h
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-on-surface">
                {aggregated
                  .reduce(
                    (s, m) => s + m.regular + m.overtime + m.night + m.holiday,
                    0,
                  )
                  .toFixed(1)}
                h
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function aggregate(rows: AttendanceRow[]): MonthAgg[] {
  const map = new Map<string, MonthAgg>();
  for (const r of rows) {
    const d = new Date(r.work_date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const cur = map.get(key) ?? {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      days: 0,
      regular: 0,
      overtime: 0,
      night: 0,
      holiday: 0,
    };
    cur.days += 1;
    cur.regular += Number(r.regular_hours) || 0;
    cur.overtime += Number(r.overtime_hours) || 0;
    cur.night += Number(r.night_hours) || 0;
    cur.holiday += Number(r.holiday_hours) || 0;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}
