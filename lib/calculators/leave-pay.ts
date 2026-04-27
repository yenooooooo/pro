/**
 * 연차수당(미사용 연차 정산) 계산.
 *
 * 근거:
 *  - 근로기준법 제60조 ⑤항: 사용하지 못한 휴가에 대하여 통상임금 또는 평균임금으로 보상
 *  - 통상임금 1일분 = 통상시급 × 1일 소정근로시간(통상 8h)
 *  - CLAUDE.md §6.4
 *
 * 본 함수는 통상시급 기준만 지원(평균임금 기준은 caller가 별도 계산하여 hourlyWage로 주입).
 * 직책수당·정기상여 등 통상임금 포함 여부는 회사별 단체협약에 따라 다르므로,
 * 호출자가 `extraOrdinaryAllowance`로 시간당 추가분을 주입할 수 있게 열어둔다.
 */

const MONTHLY_REGULAR_HOURS = 209;
const DAILY_WORK_HOURS = 8;

export type LeavePayInput = {
  /** 기본급 (월, 원). */
  baseSalary: number;
  /** 미사용 연차 일수. 0.5일 단위 허용(반차). */
  unusedDays: number;
  /**
   * 통상임금에 포함되는 월 단위 추가 수당 (직책수당 등). 선택.
   * baseSalary와 함께 209h로 나눠 시급에 가산.
   */
  extraMonthlyOrdinaryAllowance?: number;
  /** 1일 소정근로시간. 기본 8h. */
  dailyHours?: number;
};

export type LeavePayBreakdown = {
  /** 통상시급 (원, 소수점 보존). */
  regularHourlyWage: number;
  /** 1일분 통상임금 (원, round). */
  dailyOrdinaryWage: number;
  /** 연차수당 = 1일분 × 일수 (원, round). */
  pay: number;
  unusedDays: number;
};

export type CalcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function calculateLeavePay(input: LeavePayInput): CalcResult<LeavePayBreakdown> {
  if (!Number.isFinite(input.baseSalary) || input.baseSalary <= 0) {
    return { success: false, error: "기본급은 양수여야 합니다." };
  }
  if (!Number.isFinite(input.unusedDays) || input.unusedDays < 0) {
    return { success: false, error: "미사용 일수는 0 이상이어야 합니다." };
  }
  const extra = input.extraMonthlyOrdinaryAllowance ?? 0;
  if (!Number.isFinite(extra) || extra < 0) {
    return { success: false, error: "extraMonthlyOrdinaryAllowance는 0 이상이어야 합니다." };
  }
  const dailyHours = input.dailyHours ?? DAILY_WORK_HOURS;
  if (!Number.isFinite(dailyHours) || dailyHours <= 0) {
    return { success: false, error: "dailyHours는 양수여야 합니다." };
  }

  const regularHourlyWage = (input.baseSalary + extra) / MONTHLY_REGULAR_HOURS;
  const dailyOrdinaryWage = Math.round(regularHourlyWage * dailyHours);
  const pay = Math.round(regularHourlyWage * dailyHours * input.unusedDays);

  return {
    success: true,
    data: {
      regularHourlyWage,
      dailyOrdinaryWage,
      pay,
      unusedDays: input.unusedDays,
    },
  };
}
