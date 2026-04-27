/**
 * 급여 계산 — 통상시급·수당·총지급·과세소득.
 *
 * 근거:
 *  - 근로기준법 제56조(연장·야간·휴일근로 가산수당)
 *  - 소득세법 시행령 제17조의2(생산직 등 비과세) 및 제17조의3(보수·식대·자가운전·육아수당 비과세)
 *  - 통상시급 산정: 월 소정근로시간 209시간 (주 40h × 365/7/12 ≈ 4.345주)
 *  - 식대·자가운전·6세 이하 자녀 양육수당 비과세 한도: 각 월 20만원 (2024 개정 반영)
 *
 * CLAUDE.md §6.1 참조.
 *
 * 모든 금액은 원(KRW) 정수, 시간은 시간 단위 numeric.
 */

const MONTHLY_REGULAR_HOURS = 209;
const OVERTIME_RATE = 1.5;
const NIGHT_RATE_PREMIUM = 0.5; // 야간 가산분만 (연장과 중복 시 별도 합산)
const HOLIDAY_RATE_WITHIN_8H = 1.5;
const HOLIDAY_RATE_OVER_8H = 2.0;

/** 비과세 월 한도 (원). 2024년 개정 반영. */
const MEAL_NON_TAXABLE_LIMIT = 200_000;
const CAR_ALLOWANCE_NON_TAXABLE_LIMIT = 200_000;
const CHILDCARE_NON_TAXABLE_LIMIT = 200_000;

export type PayrollInput = {
  /** 기본급 (월, 원) */
  baseSalary: number;
  /** 연장근로시간 (월) */
  overtimeHours?: number;
  /** 야간근로시간 (22~06시, 월). 가산분 0.5x만 별도 산정. */
  nightHours?: number;
  /** 휴일근로시간 (월). 8h 이내 1.5x, 초과분 2.0x. */
  holidayHours?: number;
  /** 식대 (월, 원) */
  mealAllowance?: number;
  /** 자가운전보조금 (월, 원). 본인 차량 + 회사 업무 사용. */
  carAllowance?: number;
  /** 6세 이하 자녀 양육수당 (월, 원) */
  childcareAllowance?: number;
  /** 직책수당 (월, 원). 일할 적용. */
  positionAllowance?: number;
  /** 기타수당 (월, 원). 일할 적용. */
  otherAllowance?: number;
  /** 포괄임금제: 기본급에 이미 포함된 월 연장근로시간 (그만큼 overtimeHours에서 차감). */
  inclusiveOvertimeHours?: number;
  /** 일할계산 — 실제 근무일. standardWorkDays와 함께 지정해야 적용. */
  workedDays?: number;
  /** 일할계산 — 해당 월의 소정근로일. */
  standardWorkDays?: number;
};

export type PayrollBreakdown = {
  /** 통상시급 = baseSalary / 209 (소수점 보존). */
  regularHourlyWage: number;
  /** 일할 적용 후 기본급. */
  baseSalaryProrated: number;
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  positionAllowance: number;
  otherAllowance: number;
  mealAllowance: number;
  carAllowance: number;
  childcareAllowance: number;
  /** 비과세 합계 (식대 + 자가운전 + 육아수당, 각 한도 적용). */
  nonTaxableTotal: number;
  /** 총지급액. */
  grossPay: number;
  /** 과세소득 = grossPay - nonTaxableTotal. 4대보험·소득세 산정 기준. */
  taxableIncome: number;
  /** 일할 비례 계수 (1이면 풀근무). */
  prorationFactor: number;
};

export type CalcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * 월별 급여 총지급액·과세소득 계산.
 *
 * @param input 급여 입력값. 음수·NaN 등 잘못된 값은 실패 반환.
 */
export function calculateGrossPay(input: PayrollInput): CalcResult<PayrollBreakdown> {
  if (!Number.isFinite(input.baseSalary) || input.baseSalary <= 0) {
    return { success: false, error: "기본급은 양수여야 합니다." };
  }

  const regularHourlyWage = input.baseSalary / MONTHLY_REGULAR_HOURS;

  const proration = computeProrationFactor(input.workedDays, input.standardWorkDays);
  if (!proration.success) return { success: false, error: proration.error };
  const factor = proration.factor;

  const baseSalaryProrated = roundWon(input.baseSalary * factor);
  const positionAllowance = roundWon((input.positionAllowance ?? 0) * factor);
  const otherAllowance = roundWon((input.otherAllowance ?? 0) * factor);

  // 포괄임금제: 기본급에 포함된 연장시간만큼 차감.
  const overtimeHoursEffective = Math.max(
    0,
    (input.overtimeHours ?? 0) - (input.inclusiveOvertimeHours ?? 0),
  );
  const overtimePay = roundWon(regularHourlyWage * overtimeHoursEffective * OVERTIME_RATE);
  const nightPay = roundWon(regularHourlyWage * (input.nightHours ?? 0) * NIGHT_RATE_PREMIUM);
  const holidayPay = computeHolidayPay(regularHourlyWage, input.holidayHours ?? 0);

  const mealAllowance = input.mealAllowance ?? 0;
  const carAllowance = input.carAllowance ?? 0;
  const childcareAllowance = input.childcareAllowance ?? 0;

  const nonTaxableTotal =
    Math.min(mealAllowance, MEAL_NON_TAXABLE_LIMIT) +
    Math.min(carAllowance, CAR_ALLOWANCE_NON_TAXABLE_LIMIT) +
    Math.min(childcareAllowance, CHILDCARE_NON_TAXABLE_LIMIT);

  const grossPay =
    baseSalaryProrated +
    overtimePay +
    nightPay +
    holidayPay +
    positionAllowance +
    otherAllowance +
    mealAllowance +
    carAllowance +
    childcareAllowance;

  return {
    success: true,
    data: {
      regularHourlyWage,
      baseSalaryProrated,
      overtimePay,
      nightPay,
      holidayPay,
      positionAllowance,
      otherAllowance,
      mealAllowance,
      carAllowance,
      childcareAllowance,
      nonTaxableTotal,
      grossPay,
      taxableIncome: grossPay - nonTaxableTotal,
      prorationFactor: factor,
    },
  };
}

/**
 * 최저임금 검증.
 *
 * 근거: 최저임금법 제5조. 통상시급(baseSalary / 209)이 해당 연도 최저시급 미만이면 위반.
 * 최저시급 값은 매년 고시되므로 caller가 인자로 주입한다(하드코딩 금지).
 */
export function validateMinimumWage(
  baseSalary: number,
  minimumHourlyWage: number,
): CalcResult<{ regularHourlyWage: number; minimumHourlyWage: number; shortage: number }> {
  if (!Number.isFinite(baseSalary) || baseSalary <= 0) {
    return { success: false, error: "기본급은 양수여야 합니다." };
  }
  if (!Number.isFinite(minimumHourlyWage) || minimumHourlyWage <= 0) {
    return { success: false, error: "최저시급은 양수여야 합니다." };
  }
  const regularHourlyWage = baseSalary / MONTHLY_REGULAR_HOURS;
  if (regularHourlyWage < minimumHourlyWage) {
    return {
      success: false,
      error: `통상시급 ${Math.round(regularHourlyWage)}원이 최저시급 ${minimumHourlyWage}원 미만입니다.`,
    };
  }
  return {
    success: true,
    data: {
      regularHourlyWage,
      minimumHourlyWage,
      shortage: 0,
    },
  };
}

function computeHolidayPay(hourlyWage: number, holidayHours: number): number {
  if (holidayHours <= 0) return 0;
  const within8 = Math.min(holidayHours, 8);
  const over8 = Math.max(0, holidayHours - 8);
  return (
    roundWon(hourlyWage * within8 * HOLIDAY_RATE_WITHIN_8H) +
    roundWon(hourlyWage * over8 * HOLIDAY_RATE_OVER_8H)
  );
}

function computeProrationFactor(
  workedDays: number | undefined,
  standardWorkDays: number | undefined,
): { success: true; factor: number } | { success: false; error: string } {
  if (workedDays === undefined && standardWorkDays === undefined) {
    return { success: true, factor: 1 };
  }
  if (workedDays === undefined || standardWorkDays === undefined) {
    return {
      success: false,
      error: "workedDays와 standardWorkDays는 함께 지정해야 합니다.",
    };
  }
  if (!Number.isFinite(workedDays) || !Number.isFinite(standardWorkDays)) {
    return { success: false, error: "근무일/소정일은 숫자여야 합니다." };
  }
  if (standardWorkDays <= 0) {
    return { success: false, error: "standardWorkDays는 1 이상이어야 합니다." };
  }
  if (workedDays < 0 || workedDays > standardWorkDays) {
    return {
      success: false,
      error: "workedDays는 0 이상 standardWorkDays 이하여야 합니다.",
    };
  }
  return { success: true, factor: workedDays / standardWorkDays };
}

function roundWon(amount: number): number {
  return Math.round(amount);
}
