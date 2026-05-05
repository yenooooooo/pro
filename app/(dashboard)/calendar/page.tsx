import { CalendarDays } from "lucide-react";
import { getTaxDeadlines, type TaxDeadline } from "@/lib/calendar/tax-deadlines";
import { CalendarSubscribeButton } from "./_subscribe";

export const dynamic = "force-dynamic";

const SEVERITY_COLOR: Record<TaxDeadline["severity"], string> = {
  info: "border-tertiary/40 bg-tertiary/10 text-tertiary",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  danger: "border-error-soft/40 bg-error-soft/10 text-error-soft",
};

const CATEGORY_LABEL: Record<TaxDeadline["category"], string> = {
  insurance: "4대보험",
  withholding: "원천세",
  vat: "부가세",
  corporate: "법인세",
  year_end: "연말정산",
};

export default function CalendarPage({
  searchParams,
}: {
  searchParams?: { year?: string };
}) {
  const year = Number(searchParams?.year) || new Date().getFullYear();
  const items = getTaxDeadlines(year);

  // 월별 그룹화
  const byMonth = new Map<number, TaxDeadline[]>();
  for (const item of items) {
    const m = Number(item.date.slice(5, 7));
    const cur = byMonth.get(m) ?? [];
    cur.push(item);
    byMonth.set(m, cur);
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const upcoming = items.filter((it) => it.date >= todayStr).slice(0, 5);

  return (
    <div className="space-y-stack-lg">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
            <CalendarDays aria-hidden className="h-4 w-4" />
            Tax & Filing Calendar
          </p>
          <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            세무 신고 캘린더
          </h1>
          <p className="text-body-md text-on-surface-variant">
            매월 4대보험·원천세 (10일), 분기별 부가세, 법인세, 연말정산까지 한 곳에서.
          </p>
        </div>
        <CalendarSubscribeButton year={year} />
      </header>

      {/* 다가오는 마감 5건 */}
      {upcoming.length > 0 && (
        <section className="glass-panel rounded-xl p-6">
          <h2 className="mb-4 text-headline-md font-semibold text-on-surface">
            다가오는 마감
          </h2>
          <ul className="space-y-2">
            {upcoming.map((it) => {
              const days = Math.ceil(
                (new Date(it.date).getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              return (
                <li
                  key={it.id}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${SEVERITY_COLOR[it.severity]}`}
                >
                  <div className="text-center">
                    <p className="text-display-xl font-bold tabular-nums leading-none">
                      D
                    </p>
                    <p className="text-data-tabular tabular-nums">
                      {days >= 0 ? `-${days}` : `+${Math.abs(days)}`}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface">{it.title}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {it.description}
                    </p>
                    <p className="mt-1 text-label-sm tabular-nums text-on-surface-variant/70">
                      {it.date} · {CATEGORY_LABEL[it.category]}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 월별 전체 */}
      <section className="space-y-4">
        <h2 className="text-headline-md font-semibold text-on-surface">
          {year}년 전체 마감일
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const monthItems = byMonth.get(m) ?? [];
            return (
              <div
                key={m}
                className="glass-panel rounded-xl p-4"
              >
                <h3 className="mb-2 text-data-tabular font-semibold uppercase tracking-widest text-on-surface-variant">
                  {m}월
                </h3>
                {monthItems.length === 0 ? (
                  <p className="text-label-sm text-on-surface-variant/40">—</p>
                ) : (
                  <ul className="space-y-1.5">
                    {monthItems.map((it) => (
                      <li key={it.id} className="text-label-sm">
                        <span className="font-mono tabular-nums text-on-surface-variant">
                          {it.date.slice(8, 10)}일
                        </span>{" "}
                        <span className="text-on-surface">{it.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="glass-panel rounded-xl p-4">
        <p className="text-label-sm text-on-surface-variant">
          ⚖️ 본 일정은 일반적인 12월 결산 법인 기준. 사업연도가 다른 경우 별도 확인.
          국세청 정책 변동 시 매년 갱신 필요.
        </p>
      </div>
    </div>
  );
}
