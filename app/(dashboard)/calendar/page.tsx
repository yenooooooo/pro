import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { getTaxDeadlines, type TaxDeadline } from "@/lib/calendar/tax-deadlines";
import { CalendarSubscribeButton } from "./_subscribe";

export const dynamic = "force-dynamic";

// 카테고리별 chip 변형 (v2)
const CATEGORY_CHIP: Record<TaxDeadline["category"], string> = {
  insurance: "chip info",
  withholding: "chip pend",
  vat: "chip ok",
  corporate: "chip pend",
  year_end: "chip rej",
};

const CATEGORY_LABEL: Record<TaxDeadline["category"], string> = {
  insurance: "4대보험",
  withholding: "원천세",
  vat: "부가세",
  corporate: "법인세",
  year_end: "연말정산",
};

const SEVERITY_TONE: Record<TaxDeadline["severity"], string> = {
  info: "text-text-1",
  warn: "text-gold italic",
  danger: "text-[#E06B5F] italic",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: { year?: string };
}) {
  const t = await getTranslations("calendar");
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
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M18</b>Operations · Tax Calendar
          </div>
          <h1 className="page-h">
            세무 <em>캘린더.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <CalendarSubscribeButton year={year} />
      </header>

      {/* 다가오는 마감 5건 */}
      {upcoming.length > 0 && (
        <section className="panel mb-9 border border-line">
          <div className="panel-h">
            <div className="t font-serif">
              다가오는 <em>마감</em>
            </div>
            <div className="meta">상위 5건</div>
          </div>
          <ul className="flex flex-col">
            {upcoming.map((it) => {
              const days = Math.ceil(
                (new Date(it.date).getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              return (
                <li
                  key={it.id}
                  className="flex items-center gap-5 border-b border-line py-4 last:border-b-0"
                >
                  <div className="w-16 text-center">
                    <p
                      className={cn(
                        "font-serif text-[32px] leading-none tabular-nums",
                        SEVERITY_TONE[it.severity],
                      )}
                    >
                      D
                    </p>
                    <p className="mt-1 font-mono text-[11px] tabular-nums text-text-2">
                      {days >= 0 ? `-${days}` : `+${Math.abs(days)}`}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-[18px] text-text-1">
                      {it.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-[1.5] text-text-2">
                      {it.description}
                    </p>
                    <p className="mt-2 font-mono text-[10px] tracking-[0.08em] text-text-3">
                      {it.date}
                    </p>
                  </div>
                  <span className={CATEGORY_CHIP[it.category]}>
                    <i />
                    {CATEGORY_LABEL[it.category]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 월별 전체 */}
      <div className="section-rule">
        <span className="l">
          <b>YR</b>
          {year}년 전체 마감일
        </span>
        <span className="line" />
      </div>
      <div className="mb-9 grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const monthItems = byMonth.get(m) ?? [];
          return (
            <div key={m} className="bg-bg p-5">
              <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2">
                <span className="font-serif text-[24px] tabular-nums text-text-1">
                  {String(m).padStart(2, "0")}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
                  {monthItems.length}건
                </span>
              </div>
              {monthItems.length === 0 ? (
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
                  —
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {monthItems.map((it) => (
                    <li key={it.id} className="flex items-start gap-3">
                      <span className="mt-[2px] font-mono text-[10px] tabular-nums tracking-[0.05em] text-gold">
                        {it.date.slice(8, 10)}
                      </span>
                      <span className="flex-1 text-[12px] leading-[1.4] text-text-2">
                        {it.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="border border-line bg-bg-1 p-5">
        <p className="font-mono text-[11px] leading-[1.6] tracking-[0.02em] text-text-3">
          본 일정은 일반적인 12월 결산 법인 기준. 사업연도가 다른 경우 별도
          확인. 국세청 정책 변동 시 매년 갱신 필요.
        </p>
      </div>
    </div>
  );
}
