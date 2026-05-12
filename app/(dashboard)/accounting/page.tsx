import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
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

  // KPI: 시산표 유형별 잔액 합계 (정상 방향 기준)
  const sumByType = (type: string) =>
    tb.rows
      .filter((r) => r.type === type)
      .reduce((s, r) => s + r.balance, 0);
  const totalAssets = sumByType("asset");
  const totalLiabilities = sumByType("liability");
  const totalEquity = sumByType("equity");
  const totalRevenue = sumByType("revenue");

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M15</b>Ledger · Accounting
          </div>
          <h1 className="page-h">
            회계 <em>장부.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input
            type="date"
            name="as_of"
            defaultValue={asOf}
            className="h-9 border border-line bg-bg-1 px-3 font-mono text-[12px] text-text-1 focus:border-gold-soft"
          />
          <button type="submit" className="btn">
            적용
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
            기준일 {asOf}
          </span>
        </form>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-2 xl:grid-cols-4">
        <div className="kpi-card">
          <div className="kpi-l">자산 합계</div>
          <div className="kpi-v">
            <span className="cur">₩</span>
            {totalAssets.toLocaleString("ko-KR")}
          </div>
          <div className="kpi-meta">
            <span>시산표 기준 (차변)</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">부채 합계</div>
          <div className="kpi-v warn">
            <span className="cur">₩</span>
            {totalLiabilities.toLocaleString("ko-KR")}
          </div>
          <div className="kpi-meta">
            <span>시산표 기준 (대변)</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">자본 합계</div>
          <div className="kpi-v warn">
            <span className="cur">₩</span>
            {totalEquity.toLocaleString("ko-KR")}
          </div>
          <div className="kpi-meta">
            <span>시산표 기준 (대변)</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">수익 합계</div>
          <div className="kpi-v warn">
            <span className="cur">₩</span>
            {totalRevenue.toLocaleString("ko-KR")}
          </div>
          <div className="kpi-meta">
            <span>시산표 기준 (대변)</span>
          </div>
        </div>
      </div>

      {/* ===== 시산표 ===== */}
      <section className="panel mb-9">
        <div className="panel-h">
          <div className="t font-serif">
            <em>시산표</em>
          </div>
          <div className="meta flex items-center gap-3">
            <span>{asOf} 기준</span>
            {tb.balanced ? (
              <span className="chip ok">
                <i />
                차변 = 대변
              </span>
            ) : (
              <span className="chip rej">
                <i />
                불일치
              </span>
            )}
          </div>
        </div>

        {tb.rows.length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-8 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            분개 기록 없음. 급여 확정·지출 등록 시 자동 분개가 생성됩니다.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl min-w-[860px]">
              <thead>
                <tr>
                  <th>코드</th>
                  <th>계정과목</th>
                  <th>유형</th>
                  <th className="text-right">차변 합계</th>
                  <th className="text-right">대변 합계</th>
                  <th className="text-right">잔액</th>
                </tr>
              </thead>
              <tbody>
                {tb.rows.map((r) => {
                  const isCreditNormal =
                    r.type === "liability" ||
                    r.type === "equity" ||
                    r.type === "revenue";
                  const balanceClass =
                    r.balance_side === "zero"
                      ? "text-text-3"
                      : isCreditNormal
                        ? "text-gold"
                        : "text-text-1";
                  return (
                    <tr key={r.code}>
                      <td className="font-mono text-[12px] text-text-3">{r.code}</td>
                      <td>
                        <span className="text-text-1">{r.name}</span>
                      </td>
                      <td>
                        <span className="chip">{TYPE_LABEL[r.type]}</span>
                      </td>
                      <td className="n">
                        {r.debit_total > 0
                          ? r.debit_total.toLocaleString("ko-KR")
                          : "—"}
                      </td>
                      <td className="n">
                        {r.credit_total > 0
                          ? r.credit_total.toLocaleString("ko-KR")
                          : "—"}
                      </td>
                      <td className={cn("n", balanceClass)}>
                        {r.balance > 0 ? r.balance.toLocaleString("ko-KR") : "—"}
                        {r.balance_side !== "zero" ? (
                          <span className="ml-1 font-mono text-[10px] text-text-3">
                            {r.balance_side === "debit" ? "(차)" : "(대)"}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={3}
                    className="border-t border-line bg-bg-1 px-[14px] py-[14px] font-mono text-[11px] uppercase tracking-[0.1em] text-text-2"
                  >
                    합계
                  </td>
                  <td className="border-t border-line bg-bg-1 px-[14px] py-[14px] text-right font-mono font-semibold tabular-nums text-text-1">
                    {tb.total_debit.toLocaleString("ko-KR")}
                  </td>
                  <td className="border-t border-line bg-bg-1 px-[14px] py-[14px] text-right font-mono font-semibold tabular-nums text-gold">
                    {tb.total_credit.toLocaleString("ko-KR")}
                  </td>
                  <td className="border-t border-line bg-bg-1" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* ===== 최근 분개 ===== */}
      <section className="panel mb-9">
        <div className="panel-h">
          <div className="t font-serif">
            최근 <em>분개</em>
          </div>
          <div className="meta">최대 10건</div>
        </div>
        {recent.length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-8 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            분개 기록 없음.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl min-w-[560px]">
              <thead>
                <tr>
                  <th>전표일</th>
                  <th>적요</th>
                  <th>출처</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono text-[12px] text-text-2">
                      {e.entry_date}
                    </td>
                    <td>
                      <span className="text-text-1">{e.description}</span>
                    </td>
                    <td>
                      <span className="chip">{e.source_type ?? "manual"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== 근거 ===== */}
      <div className="border border-line bg-bg-1 p-5">
        <p className="font-mono text-[11px] leading-[1.6] tracking-[0.02em] text-text-3">
          본 시스템은 일반기업회계기준 약식 — 풀 회계 (재무제표 자동 생성, 결산
          분개, 외화·계약·세무 차이 조정) 는 v1.1 로드맵. 자동 분개는{" "}
          <code className="border border-line px-1 text-text-2">
            lib/accounting/auto-journalize.ts
          </code>{" "}
          에서 호출됩니다.
        </p>
      </div>
    </div>
  );
}
