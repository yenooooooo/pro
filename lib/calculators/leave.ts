/**
 * 연차(유급휴가) 발생 일수 계산 — 근로기준법 제60조.
 * CLAUDE.md §6.4.
 *
 * Phase 3.2에서 본 구현. 현재는 시그니처만.
 */

export type LeaveCalcMode = "hire_date" | "fiscal_year";

/**
 * 연차 발생 일수 계산
 * 근거: 근로기준법 제60조 (2026년 기준)
 * @param hireDate 입사일
 * @param baseDate 기준일 (보통 오늘)
 */
export function calculateAnnualLeave(
  _hireDate: Date,
  _baseDate: Date,
  _mode: LeaveCalcMode = "hire_date",
): { success: false; error: string } {
  return { success: false, error: "Phase 3.2에서 구현" };
}
