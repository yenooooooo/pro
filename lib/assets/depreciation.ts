/**
 * 자산 감가상각 — 정액법 (Straight-line method).
 *
 * 근거:
 *  - 법인세법 시행령 제26조 (감가상각방법)
 *  - 일반 PC·사무가구·차량 등 자산 분류별 내용연수는 기준내용연수표(국세청)
 *  - 정액법: 연 감가상각비 = 취득원가 / 내용연수
 *  - 잔존가액 0 가정(MVP). 5% 잔존은 정률법과 함께 별도 옵션으로 v2에 확장.
 *
 * 입력 검증:
 *  - acquisition_cost / useful_life / acquisition_date 중 하나라도 누락이면
 *    감가상각 불가 → null 반환 (caller가 표시 분기).
 */

import { differenceInDays } from "date-fns";

export type DepreciationInput = {
  acquisitionDate: Date;
  acquisitionCost: number;
  /** 내용연수(년). 정수. */
  usefulLifeYears: number;
};

export type DepreciationResult = {
  /** 연 감가상각비 (원, round). */
  annualDepreciation: number;
  /** 누적 감가상각 (원, round). */
  accumulatedDepreciation: number;
  /** 장부가액 = 취득원가 - 누적 감가상각 (원). */
  bookValue: number;
  /** 경과 연수 (소수). */
  elapsedYears: number;
  /** 잔여 연수 (소수). 만료 시 음수. */
  remainingYears: number;
  /** 내용연수 만료 여부 (잔여 ≤ 0). */
  isExpired: boolean;
};

const DAYS_PER_YEAR = 365;

/**
 * 자산의 현재 시점 감가상각 결과를 계산.
 * 입력 누락(원가/내용연수/취득일 중 하나라도 없으면) → null.
 */
export function calculateDepreciation(
  input: DepreciationInput,
  baseDate: Date,
): DepreciationResult | null {
  if (
    !input.acquisitionDate ||
    !Number.isFinite(input.acquisitionCost) ||
    input.acquisitionCost <= 0 ||
    !Number.isFinite(input.usefulLifeYears) ||
    input.usefulLifeYears <= 0
  ) {
    return null;
  }
  if (baseDate < input.acquisitionDate) {
    return {
      annualDepreciation: input.acquisitionCost / input.usefulLifeYears,
      accumulatedDepreciation: 0,
      bookValue: input.acquisitionCost,
      elapsedYears: 0,
      remainingYears: input.usefulLifeYears,
      isExpired: false,
    };
  }

  const elapsedDays = differenceInDays(baseDate, input.acquisitionDate);
  const elapsedYears = elapsedDays / DAYS_PER_YEAR;
  const annualDepreciation = input.acquisitionCost / input.usefulLifeYears;

  // 누적 감가상각은 elapsedYears 만큼 진행. 취득원가를 넘지 않도록 클램프.
  const rawAccumulated = annualDepreciation * elapsedYears;
  const accumulatedDepreciation = Math.min(
    Math.round(rawAccumulated),
    input.acquisitionCost,
  );
  const bookValue = input.acquisitionCost - accumulatedDepreciation;
  const remainingYears = input.usefulLifeYears - elapsedYears;

  return {
    annualDepreciation: Math.round(annualDepreciation),
    accumulatedDepreciation,
    bookValue,
    elapsedYears,
    remainingYears,
    isExpired: remainingYears <= 0,
  };
}

/**
 * "만료 임박"(6개월 미만 잔여) 또는 "이미 만료" 여부를 단일 enum으로 분류.
 * 재사용 편의를 위해 helper로 분리.
 */
export type LifecycleStatus = "ok" | "expiring" | "expired";

export function classifyLifecycle(remainingYears: number | null): LifecycleStatus {
  if (remainingYears === null) return "ok";
  if (remainingYears <= 0) return "expired";
  if (remainingYears < 0.5) return "expiring";
  return "ok";
}
