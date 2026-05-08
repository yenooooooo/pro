import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * 시산표 (Trial Balance) 생성.
 *
 * 모든 계정과목별 차변·대변 합계 → 잔액 계산.
 * 자산·비용은 차변 잔액 정상, 부채·자본·수익은 대변 잔액 정상.
 *
 * 회계 등식: Σ 차변 잔액 = Σ 대변 잔액
 */

export type TrialBalanceRow = {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  normal_side: "debit" | "credit";
  debit_total: number;
  credit_total: number;
  balance: number;          // 정상 방향 잔액 (양수)
  balance_side: "debit" | "credit" | "zero";
};

export async function getTrialBalance(
  asOfDate: string,
): Promise<{ rows: TrialBalanceRow[]; total_debit: number; total_credit: number; balanced: boolean }> {
  const supabase = createClient();

  const { data: accounts } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("chart_of_accounts" as any)
    .select("id, code, name, type, normal_side")
    .eq("is_active", true);

  type Account = {
    id: string;
    code: string;
    name: string;
    type: TrialBalanceRow["type"];
    normal_side: "debit" | "credit";
  };

  const acctList = (accounts as unknown as Account[]) ?? [];

  // entry_date <= asOfDate 인 분개의 라인만 집계
  // GraphQL N+1 회피 — 한 번에 모든 라인 + 분개 가져와서 메모리 집계
  const { data: entries } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("journal_entries" as any)
    .select("id")
    .lte("entry_date", asOfDate);

  const entryIds = ((entries as unknown as { id: string }[] | null) ?? []).map(
    (e) => e.id,
  );

  let lines: { account_id: string; side: string; amount: number }[] = [];
  if (entryIds.length > 0) {
    const { data: lineData } = await supabase
      .schema("chongmu")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("journal_lines" as any)
      .select("account_id, side, amount")
      .in("entry_id", entryIds);
    lines =
      (lineData as { account_id: string; side: string; amount: number }[] | null) ??
      [];
  }

  // 계정별 합산
  const totalsByAccount = new Map<string, { debit: number; credit: number }>();
  for (const l of lines) {
    const cur = totalsByAccount.get(l.account_id) ?? { debit: 0, credit: 0 };
    if (l.side === "debit") cur.debit += l.amount;
    else cur.credit += l.amount;
    totalsByAccount.set(l.account_id, cur);
  }

  const rows: TrialBalanceRow[] = acctList
    .map((a) => {
      const t = totalsByAccount.get(a.id) ?? { debit: 0, credit: 0 };
      const net = t.debit - t.credit;
      let balance = 0;
      let balance_side: TrialBalanceRow["balance_side"] = "zero";
      if (net > 0) {
        balance = net;
        balance_side = "debit";
      } else if (net < 0) {
        balance = -net;
        balance_side = "credit";
      }
      return {
        code: a.code,
        name: a.name,
        type: a.type,
        normal_side: a.normal_side,
        debit_total: t.debit,
        credit_total: t.credit,
        balance,
        balance_side,
      };
    })
    .filter((r) => r.debit_total > 0 || r.credit_total > 0)
    .sort((a, b) => a.code.localeCompare(b.code));

  const total_debit = rows
    .filter((r) => r.balance_side === "debit")
    .reduce((s, r) => s + r.balance, 0);
  const total_credit = rows
    .filter((r) => r.balance_side === "credit")
    .reduce((s, r) => s + r.balance, 0);

  return {
    rows,
    total_debit,
    total_credit,
    balanced: total_debit === total_credit,
  };
}
