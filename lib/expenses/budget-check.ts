/**
 * 카테고리 월 한도 점검.
 *
 * 사용 시점: /expenses 페이지에서 해당 월 지출을 카테고리별로 합산하고
 * `expense_categories.budget_monthly`와 비교해 경고/초과 상태를 산정.
 *
 * 분류:
 *  - ok    : ratio < 0.8 (한도의 80% 미만)
 *  - warn  : 0.8 ≤ ratio < 1.0
 *  - over  : ratio ≥ 1.0
 *
 * budget이 null/0이면 점검 대상 제외(한도 미설정).
 */

export type BudgetExpense = {
  categoryId: string | null;
  amount: number;
};

export type BudgetCategory = {
  id: string;
  name: string;
  /** 월 한도 (원). null이면 한도 없음. */
  budget_monthly: number | null;
};

export type BudgetCheck = {
  categoryId: string;
  name: string;
  used: number;
  budget: number;
  ratio: number;
  status: "ok" | "warn" | "over";
};

const WARN_THRESHOLD = 0.8;

export function checkBudgets(
  expenses: BudgetExpense[],
  categories: BudgetCategory[],
): BudgetCheck[] {
  const usedByCategory = new Map<string, number>();
  for (const e of expenses) {
    if (!e.categoryId) continue;
    usedByCategory.set(e.categoryId, (usedByCategory.get(e.categoryId) ?? 0) + e.amount);
  }

  const checks: BudgetCheck[] = [];
  for (const c of categories) {
    if (!c.budget_monthly || c.budget_monthly <= 0) continue;
    const used = usedByCategory.get(c.id) ?? 0;
    const ratio = used / c.budget_monthly;
    let status: BudgetCheck["status"];
    if (ratio >= 1) status = "over";
    else if (ratio >= WARN_THRESHOLD) status = "warn";
    else status = "ok";
    checks.push({
      categoryId: c.id,
      name: c.name,
      used,
      budget: c.budget_monthly,
      ratio,
      status,
    });
  }
  // 위험도 순 (over → warn → ok), 같으면 ratio 큰 순.
  const order = { over: 0, warn: 1, ok: 2 } as const;
  return checks.sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.ratio - a.ratio;
  });
}
