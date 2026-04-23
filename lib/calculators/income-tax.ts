/**
 * 근로소득세(원천징수) 계산 — 국세청 간이세액표 조회.
 * CLAUDE.md §6.3.
 *
 * Phase 4.1에서 본 구현.
 */

export type IncomeTaxRow = {
  year: number;
  minSalary: number; // 월급여액 이상
  maxSalary: number; // 월급여액 미만
  dependents: number;
  tax: number;
};

export type IncomeTaxResult = {
  incomeTax: number;
  localIncomeTax: number; // 소득세 × 10%
};

export function calculateIncomeTax(
  _taxableIncome: number,
  _dependents: number,
  _table: IncomeTaxRow[],
): { success: false; error: string } {
  return { success: false, error: "Phase 4.1에서 구현" };
}
