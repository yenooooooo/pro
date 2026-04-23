/**
 * 4대보험 공제 계산.
 * 요율은 `insurance_rates` 테이블에서 조회 (CLAUDE.md §6.2, §11-1).
 * 하드코딩 금지.
 *
 * Phase 4.1에서 본 구현.
 */

export type InsuranceRates = {
  year: number;
  pensionRate: number;
  healthRate: number;
  ltcRate: number; // 장기요양 (건강보험료 대비)
  employmentRate: number;
  pensionMinBase?: number;
  pensionMaxBase?: number;
};

export type InsuranceDeduction = {
  pension: number;
  health: number;
  ltc: number;
  employment: number;
  total: number;
};

export function calculateInsurance(
  _taxableIncome: number,
  _rates: InsuranceRates,
): { success: false; error: string } {
  return { success: false, error: "Phase 4.1에서 구현" };
}
