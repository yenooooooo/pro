/**
 * 4대보험 공제 (근로자 부담분) 계산.
 *
 * 근거 (요율은 매년 고시·변경되므로 본 함수에서는 절대 하드코딩하지 않고 인자로 주입):
 *  - 국민연금법 제88조의2 (기준소득월액 상·하한)
 *  - 국민건강보험법 제69조 (보수월액 기준)
 *  - 노인장기요양보험법 제9조 (건강보험료 기준)
 *  - 고용보험법 제13조 (실업급여 분 근로자 부담)
 *  - CLAUDE.md §6.2 / §11-1 — 요율은 `insurance_rates` 테이블에서 조회
 *
 * 과세소득(taxableIncome) = 총지급액 - 비과세 합계. payroll.ts의 결과를 그대로 사용한다.
 */

export type InsuranceRates = {
  /** 적용 연도. */
  year: number;
  /** 국민연금 근로자 요율 (예: 0.045 = 4.5%). */
  pensionRate: number;
  /** 건강보험 근로자 요율. */
  healthRate: number;
  /** 장기요양 요율 — **건강보험료 대비** (예: 0.1281 = 건강보험료 × 12.81%). */
  ltcRate: number;
  /** 고용보험 근로자 요율 (실업급여 분). */
  employmentRate: number;
  /** 국민연금 기준소득월액 하한 (원). */
  pensionMinBase?: number | null;
  /** 국민연금 기준소득월액 상한 (원). */
  pensionMaxBase?: number | null;
};

export type InsuranceDeduction = {
  /** 국민연금료. */
  pension: number;
  /** 건강보험료. */
  health: number;
  /** 장기요양보험료 (건강보험료 × ltcRate). */
  ltc: number;
  /** 고용보험료. */
  employment: number;
  /** 4대보험 합계. */
  total: number;
  /** 국민연금 산정에 사용된 기준소득월액 (상하한 적용 후). */
  pensionBase: number;
};

export type CalcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * 4대보험 공제 계산.
 *
 * @param taxableIncome 과세소득 (원). 음수면 실패.
 * @param rates 해당 연도 요율. `insurance_rates` 테이블 row를 그대로 매핑.
 */
export function calculateInsurance(
  taxableIncome: number,
  rates: InsuranceRates,
): CalcResult<InsuranceDeduction> {
  if (!Number.isFinite(taxableIncome) || taxableIncome < 0) {
    return { success: false, error: "과세소득은 0 이상이어야 합니다." };
  }
  const ratesValidation = validateRates(rates);
  if (!ratesValidation.success) return ratesValidation;

  const pensionBase = clampPensionBase(
    taxableIncome,
    rates.pensionMinBase ?? null,
    rates.pensionMaxBase ?? null,
  );
  const pension = roundWon(pensionBase * rates.pensionRate);
  const health = roundWon(taxableIncome * rates.healthRate);
  const ltc = roundWon(health * rates.ltcRate);
  const employment = roundWon(taxableIncome * rates.employmentRate);

  return {
    success: true,
    data: {
      pension,
      health,
      ltc,
      employment,
      total: pension + health + ltc + employment,
      pensionBase,
    },
  };
}

function clampPensionBase(
  taxableIncome: number,
  minBase: number | null,
  maxBase: number | null,
): number {
  let base = taxableIncome;
  if (minBase !== null && base < minBase) base = minBase;
  if (maxBase !== null && base > maxBase) base = maxBase;
  return base;
}

function validateRates(rates: InsuranceRates): { success: true } | { success: false; error: string } {
  const fields: Array<[string, number]> = [
    ["pensionRate", rates.pensionRate],
    ["healthRate", rates.healthRate],
    ["ltcRate", rates.ltcRate],
    ["employmentRate", rates.employmentRate],
  ];
  for (const [name, value] of fields) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      return {
        success: false,
        error: `${name}는 0~1 사이의 비율이어야 합니다(예: 4.5% → 0.045).`,
      };
    }
  }
  if (
    rates.pensionMinBase != null &&
    rates.pensionMaxBase != null &&
    rates.pensionMinBase > rates.pensionMaxBase
  ) {
    return { success: false, error: "pensionMinBase가 pensionMaxBase보다 큽니다." };
  }
  return { success: true };
}

function roundWon(amount: number): number {
  return Math.round(amount);
}
