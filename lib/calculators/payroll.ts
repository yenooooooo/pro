/**
 * 급여 계산 — 통상시급·수당·총지급액.
 * 근거: 근로기준법 (2026년 기준). 자세한 규칙은 CLAUDE.md §6.1.
 *
 * Phase 4.1에서 본 구현. 현재는 시그니처·타입만 잡아둔다.
 */

export type PayrollInput = {
  baseSalary: number; // 기본급 (원)
  overtimeHours: number; // 연장근로시간
  nightHours: number; // 야간근로시간
  holidayHours: number; // 휴일근로시간
  mealAllowance: number; // 식대 (비과세 20만원까지)
  positionAllowance: number; // 직책수당
  otherAllowance: number; // 기타수당
};

export type PayrollBreakdown = {
  regularHourlyWage: number; // 통상시급 = 기본급 / 209
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  grossPay: number;
};

export type CalcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const MONTHLY_REGULAR_HOURS = 209;

export function calculateGrossPay(_input: PayrollInput): CalcResult<PayrollBreakdown> {
  return {
    success: false,
    error: "Phase 4.1에서 구현 — MONTHLY_REGULAR_HOURS=" + MONTHLY_REGULAR_HOURS,
  };
}
