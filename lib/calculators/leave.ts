/**
 * 연차(유급휴가) 발생 일수 계산.
 *
 * 근거: 근로기준법 제60조 (2026년 기준)
 *  - 1년 미만: 1개월 개근 시 1일씩 발생, 최대 11일 (제60조 ②항)
 *  - 1년 이상 (2년차 진입): 15일 (제60조 ①항)
 *  - 3년차 이상: 15일 + floor((근속연수 - 1) / 2), 최대 25일 (제60조 ④항)
 *
 * 한계:
 *  - 출근율 80% 미만 환산(월차 방식)은 caller가 별도로 days를 조정한다.
 *  - 본 함수는 통상의 만근(滿勤)을 가정한다.
 */

import {
  differenceInMonths,
  differenceInYears,
  startOfDay,
} from "date-fns";

export type LeaveCalcMode = "hire_date" | "fiscal_year";

export type LeaveCalcSuccess = {
  success: true;
  /** 발생 일수 */
  days: number;
  /** 만 근속 연수 (소수점 버림). 1년 미만이면 0. */
  yearsOfService: number;
  /** 1년 미만일 때 누적된 만 개월 수. 1년 이상이면 null. */
  monthsAccrued: number | null;
  /** 산정 방식 — monthly: 월차 / annual: 연단위. */
  basis: "monthly" | "annual";
  mode: LeaveCalcMode;
};

export type LeaveCalcFailure = {
  success: false;
  error: string;
};

export type LeaveCalcResult = LeaveCalcSuccess | LeaveCalcFailure;

const MAX_FIRST_YEAR_DAYS = 11;
const SECOND_YEAR_DAYS = 15;
const MAX_DAYS = 25;

/**
 * 연차 발생 일수 계산.
 *
 * @param hireDate 입사일
 * @param baseDate 기준일 (보통 오늘)
 * @param mode "hire_date" = 입사일 기준(기본) / "fiscal_year" = 회계연도(1/1) 기준
 */
export function calculateAnnualLeave(
  hireDate: Date,
  baseDate: Date,
  mode: LeaveCalcMode = "hire_date",
): LeaveCalcResult {
  const hire = startOfDay(hireDate);
  const base = startOfDay(baseDate);

  if (base < hire) {
    return { success: false, error: "기준일이 입사일보다 빠를 수 없습니다." };
  }

  if (mode === "fiscal_year") {
    return calculateFiscalYear(hire, base);
  }
  return calculateHireDate(hire, base);
}

function calculateHireDate(hire: Date, base: Date): LeaveCalcResult {
  const years = differenceInYears(base, hire);

  if (years < 1) {
    const months = Math.max(differenceInMonths(base, hire), 0);
    return {
      success: true,
      days: Math.min(months, MAX_FIRST_YEAR_DAYS),
      yearsOfService: 0,
      monthsAccrued: months,
      basis: "monthly",
      mode: "hire_date",
    };
  }

  return {
    success: true,
    days: annualDays(years),
    yearsOfService: years,
    monthsAccrued: null,
    basis: "annual",
    mode: "hire_date",
  };
}

function calculateFiscalYear(hire: Date, base: Date): LeaveCalcResult {
  // 회계연도 = base의 1/1 ~ 12/31.
  const fiscalStart = new Date(base.getFullYear(), 0, 1);
  const yearsAtFiscalStart = differenceInYears(fiscalStart, hire);

  if (yearsAtFiscalStart < 1) {
    // 첫 회계연도: 입사 후 만 N개월에 따른 월차.
    const months = Math.max(differenceInMonths(base, hire), 0);
    return {
      success: true,
      days: Math.min(months, MAX_FIRST_YEAR_DAYS),
      yearsOfService: 0,
      monthsAccrued: months,
      basis: "monthly",
      mode: "fiscal_year",
    };
  }

  return {
    success: true,
    days: annualDays(yearsAtFiscalStart),
    yearsOfService: yearsAtFiscalStart,
    monthsAccrued: null,
    basis: "annual",
    mode: "fiscal_year",
  };
}

function annualDays(years: number): number {
  if (years < 3) return SECOND_YEAR_DAYS;
  return Math.min(SECOND_YEAR_DAYS + Math.floor((years - 1) / 2), MAX_DAYS);
}
