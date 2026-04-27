/**
 * 퇴직금 계산.
 *
 * 근거:
 *  - 근로자퇴직급여 보장법 제8조: 1년 이상 근속자에게 30일분 평균임금 × (재직일수/365) 지급
 *  - 평균임금: 산정사유 발생일 직전 3개월간 지급된 임금 총액 / 그 기간의 총 일수
 *  - 연간 상여금은 직전 3개월에 3/12만큼 안분해 평균임금에 가산 (대법원 판례)
 *  - 1년 미만 근속자는 퇴직금 지급 의무 없음(별도 의무가 없는 한)
 *
 * 본 함수는 평균임금 산정에 필요한 "직전 3개월 임금 총액"을 caller가 주입한다.
 * (일할·결근 차감 등 임금 산정 디테일은 payroll 모듈 결과를 합산해서 넣는다.)
 *
 * CLAUDE.md §1.1 (프로덕션 완성도 — 퇴직금은 ERP 필수).
 */

import { differenceInDays, startOfDay } from "date-fns";

const SEVERANCE_DAYS_PER_YEAR = 30;
const DAYS_PER_YEAR = 365;

export type SeveranceInput = {
  /** 입사일. */
  hireDate: Date;
  /** 퇴사일 (마지막 근무일 다음날 또는 퇴직일). */
  resignDate: Date;
  /** 직전 3개월 임금 총액 (원). 일할·결근 반영된 실제 지급액. */
  threeMonthsTotalPay: number;
  /** 직전 3개월의 실제 캘린더 일수 (89~92). */
  threeMonthsDays: number;
  /** 연간 상여금 총액 (원). 평균임금에 (bonus × 3/12) / threeMonthsDays 만큼 가산. */
  annualBonus?: number;
  /** 연차수당 정산액 등 기타 평균임금 산입 항목 (원, 12개월치). */
  annualOtherInclusions?: number;
};

export type SeveranceBreakdown = {
  /** 재직일수 = differenceInDays(resign, hire). */
  daysOfService: number;
  /** 만 근속연수 (소수). 365일 = 1년 가정. */
  yearsOfService: number;
  /** 1일분 평균임금 (원, 소수점 보존). */
  averageDailyWage: number;
  /** 퇴직금 (원, round). */
  severancePay: number;
  /** 1년 미만 근속이면 true. severancePay는 0. */
  belowOneYear: boolean;
};

export type CalcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function calculateSeverance(input: SeveranceInput): CalcResult<SeveranceBreakdown> {
  const hire = startOfDay(input.hireDate);
  const resign = startOfDay(input.resignDate);

  if (resign < hire) {
    return { success: false, error: "퇴사일이 입사일보다 빠를 수 없습니다." };
  }
  if (!Number.isFinite(input.threeMonthsTotalPay) || input.threeMonthsTotalPay < 0) {
    return { success: false, error: "직전 3개월 임금 총액은 0 이상이어야 합니다." };
  }
  if (!Number.isFinite(input.threeMonthsDays) || input.threeMonthsDays <= 0) {
    return { success: false, error: "직전 3개월 일수는 양수여야 합니다." };
  }
  const annualBonus = input.annualBonus ?? 0;
  const annualOther = input.annualOtherInclusions ?? 0;
  if (annualBonus < 0 || annualOther < 0) {
    return { success: false, error: "annualBonus / annualOtherInclusions는 0 이상이어야 합니다." };
  }

  const daysOfService = differenceInDays(resign, hire);
  const yearsOfService = daysOfService / DAYS_PER_YEAR;

  if (daysOfService < DAYS_PER_YEAR) {
    return {
      success: true,
      data: {
        daysOfService,
        yearsOfService,
        averageDailyWage: 0,
        severancePay: 0,
        belowOneYear: true,
      },
    };
  }

  // 연 단위 가산분(상여 + 기타)을 직전 3개월에 안분.
  const inclusionsPerThreeMonths = ((annualBonus + annualOther) * 3) / 12;
  const averageDailyWage =
    (input.threeMonthsTotalPay + inclusionsPerThreeMonths) / input.threeMonthsDays;

  const severancePay = Math.round(
    averageDailyWage * SEVERANCE_DAYS_PER_YEAR * (daysOfService / DAYS_PER_YEAR),
  );

  return {
    success: true,
    data: {
      daysOfService,
      yearsOfService,
      averageDailyWage,
      severancePay,
      belowOneYear: false,
    },
  };
}
