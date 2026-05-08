import { BookOpen, ScrollText, FileText, AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getTrialBalance } from "@/lib/accounting/trial-balance";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  asset: "자산",
  liability: "부채",
  equity: "자본",
  revenue: "수익",
  expense: "비용",
};

const TYPE_TONE: Record<string, string> = {
  asset: "bg-tertiary/15 text-tertiary",
  liability: "bg-amber-500/15 text-amber-300",
  equity: "bg-purple-500/15 text-purple-300",
  revenue: "bg-emerald-500/15 text-emerald-300",
  expense: "bg-error-soft/15 text-error-soft",
};

type Entry = {
  id: string;
  entry_date: string;
  description: string;
  source_type: string | null;
};

export default async function AccountingPage({
  searchParams,
}: {
  searchParams?: { as_of?: string };
}) {
  const today = new Date().toISOString().slice(0, 10);
  const asOf = searchParams?.as_of ?? today;
  const t = await getTranslations("accounting");

  const supabase = createClient();

  // 최근 분개 10건
  const { data: entries } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("journal_entries" as any)
    .select("id, entry_date, description, source_type")
    .order("entry_date", { ascending: false })
    .limit(10);

  const recent = (entries as unknown as Entry[]) ?? [];

  // 시산표
  const tb = await getTrialBalance(asOf);

  return (
    <div className="space-y-stack-lg">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
            <BookOpen aria-hidden className="h-4 w-4" />
            Accounting Ledger
          </p>
          <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            {t("title")}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {t("subtitle")}
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <label className="text-label-sm text-on-surface-variant">기준일</label>
          <input
            type="date"
            name="as_of"
            defaultValue={asOf}
            className="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface"
          />
          <button
            type="submit"
            className="h-11 rounded-lg bg-primary px-4 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            적용
          </button>
        </form>
      </header>

      {/* 시산표 */}
      <section className="glass-panel rounded-xl p-6">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-headline-md font-semibold text-on-surface">
            <ScrollText aria-hidden className="h-5 w-5 text-primary-electric" />
            시산표 ({asOf} 기준)
          </h2>
          {tb.balanced ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              ✓ 차변 = 대변 일치
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-error-soft/40 bg-error-soft/10 px-2 py-0.5 text-[11px] font-semibold text-error-soft">
              <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
              불일치 — 차변 {tb.total_debit.toLocaleString("ko-KR")} ≠ 대변 {tb.total_credit.toLocaleString("ko-KR")}
            </span>
          )}
        </header>

        {tb.rows.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">
            분개 기록 없음. 급여 확정·지출 등록 시 자동 분개가 생성됩니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-data-tabular">
              <thead>
                <tr className="border-b border-outline-variant/30 text-label-sm uppercase tracking-widest text-on-surface-variant">
                  <th className="px-3 py-2 text-left">코드</th>
                  <th className="px-3 py-2 text-left">계정과목</th>
                  <th className="px-3 py-2 text-left">유형</th>
                  <th className="px-3 py-2 text-right">차변 합계</th>
                  <th className="px-3 py-2 text-right">대변 합계</th>
                  <th className="px-3 py-2 text-right">잔액</th>
                </tr>
              </thead>
              <tbody>
                {tb.rows.map((r) => (
                  <tr
                    key={r.code}
                    className="border-b border-outline-variant/15 last:border-0 hover:bg-primary/5"
                  >
                    <td className="px-3 py-2 font-mono text-on-surface-variant">{r.code}</td>
                    <td className="px-3 py-2 font-medium text-on-surface">{r.name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TYPE_TONE[r.type]}`}
                      >
                        {TYPE_LABEL[r.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                      {r.debit_total > 0 ? r.debit_total.toLocaleString("ko-KR") : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                      {r.credit_total > 0 ? r.credit_total.toLocaleString("ko-KR") : "—"}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right tabular-nums font-semibold " +
                        (r.balance_side === "debit"
                          ? "text-tertiary"
                          : r.balance_side === "credit"
                            ? "text-amber-300"
                            : "text-on-surface-variant/40")
                      }
                    >
                      {r.balance > 0 ? r.balance.toLocaleString("ko-KR") : "—"}
                      {r.balance_side !== "zero" ? (
                        <span className="ml-1 text-[10px] text-on-surface-variant">
                          {r.balance_side === "debit" ? "(차)" : "(대)"}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-outline-variant/40 bg-surface-container/30">
                  <td className="px-3 py-3 font-bold text-on-surface" colSpan={3}>
                    합계
                  </td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-3 tabular-nums font-bold">
                      <span className="text-tertiary">
                        차 {tb.total_debit.toLocaleString("ko-KR")}
                      </span>
                      <span className="text-amber-300">
                        대 {tb.total_credit.toLocaleString("ko-KR")}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* 최근 분개 */}
      <section className="glass-panel rounded-xl p-6">
        <header className="mb-4 flex items-center gap-2">
          <FileText aria-hidden className="h-5 w-5 text-primary-electric" />
          <h2 className="text-headline-md font-semibold text-on-surface">
            최근 분개 (최대 10건)
          </h2>
        </header>
        {recent.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">
            분개 기록 없음.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-2"
              >
                <div>
                  <p className="text-body-md text-on-surface">{e.description}</p>
                  <p className="text-label-sm text-on-surface-variant tabular-nums">
                    {e.entry_date} · {e.source_type ?? "manual"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="glass-panel rounded-xl p-4">
        <p className="text-label-sm text-on-surface-variant">
          ⚖️ 본 시스템은 일반기업회계기준 약식 — 풀 회계 (재무제표 자동 생성, 결산 분개,
          외화·계약·세무 차이 조정) 는 v1.1 로드맵. 자동 분개는{" "}
          <code className="rounded bg-surface-container-high px-1">
            lib/accounting/auto-journalize.ts
          </code>{" "}
          에서 호출.
        </p>
      </div>
    </div>
  );
}
