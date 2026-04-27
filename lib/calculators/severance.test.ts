import { describe, expect, it } from "vitest";
import { calculateSeverance } from "./severance";

describe("calculateSeverance — 정상 케이스", () => {
  it("정확히 1년 근속 + 평균임금 100,000원/day → 3,000,000원", () => {
    // 90일 × 평균 100,000원 = 9,000,000원 (직전 3개월 총액)
    const result = calculateSeverance({
      hireDate: new Date("2025-04-26"),
      resignDate: new Date("2026-04-26"),
      threeMonthsTotalPay: 9_000_000,
      threeMonthsDays: 90,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.daysOfService).toBe(365);
      expect(result.data.yearsOfService).toBe(1);
      expect(result.data.averageDailyWage).toBe(100_000);
      expect(result.data.severancePay).toBe(3_000_000);
      expect(result.data.belowOneYear).toBe(false);
    }
  });

  it("3년 근속 (윤년 포함 1096일) → 약 9,008,219원", () => {
    const result = calculateSeverance({
      hireDate: new Date("2023-04-26"),
      resignDate: new Date("2026-04-26"),
      threeMonthsTotalPay: 9_000_000,
      threeMonthsDays: 90,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.daysOfService).toBe(1096); // 2024 윤년 포함
      // 100,000 × 30 × 1096/365 = 9,008,219.18...
      expect(result.data.severancePay).toBe(9_008_219);
    }
  });

  it("연간 상여 240만원 평균임금에 가산", () => {
    // 240만 × 3/12 = 60만, (900만 + 60만) / 90 = 106,666.67원/day
    // × 30 × 1년 = 3,200,000원
    const result = calculateSeverance({
      hireDate: new Date("2025-04-26"),
      resignDate: new Date("2026-04-26"),
      threeMonthsTotalPay: 9_000_000,
      threeMonthsDays: 90,
      annualBonus: 2_400_000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.averageDailyWage).toBeCloseTo(106666.67, 1);
      expect(result.data.severancePay).toBe(3_200_000);
    }
  });

  it("연차수당 등 기타 산입(annualOtherInclusions)도 동일 안분", () => {
    // 60만 × 3/12 = 15만, (900만 + 15만) / 90 = 101,666.67
    // × 30 × 1 = 3,050,000
    const result = calculateSeverance({
      hireDate: new Date("2025-04-26"),
      resignDate: new Date("2026-04-26"),
      threeMonthsTotalPay: 9_000_000,
      threeMonthsDays: 90,
      annualOtherInclusions: 600_000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.severancePay).toBe(3_050_000);
    }
  });
});

describe("calculateSeverance — 1년 미만", () => {
  it("재직 364일 → 0원 + belowOneYear=true", () => {
    const result = calculateSeverance({
      hireDate: new Date("2025-04-27"),
      resignDate: new Date("2026-04-26"),
      threeMonthsTotalPay: 9_000_000,
      threeMonthsDays: 90,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.daysOfService).toBe(364);
      expect(result.data.severancePay).toBe(0);
      expect(result.data.belowOneYear).toBe(true);
    }
  });

  it("재직 6개월 → 0원", () => {
    const result = calculateSeverance({
      hireDate: new Date("2025-10-26"),
      resignDate: new Date("2026-04-26"),
      threeMonthsTotalPay: 9_000_000,
      threeMonthsDays: 90,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.severancePay).toBe(0);
      expect(result.data.belowOneYear).toBe(true);
    }
  });
});

describe("calculateSeverance — 검증 실패", () => {
  it("퇴사일이 입사일보다 빠르면 실패", () => {
    const result = calculateSeverance({
      hireDate: new Date("2026-04-26"),
      resignDate: new Date("2025-04-26"),
      threeMonthsTotalPay: 9_000_000,
      threeMonthsDays: 90,
    });
    expect(result.success).toBe(false);
  });

  it("음수 임금 총액은 실패", () => {
    const result = calculateSeverance({
      hireDate: new Date("2025-04-26"),
      resignDate: new Date("2026-04-26"),
      threeMonthsTotalPay: -1,
      threeMonthsDays: 90,
    });
    expect(result.success).toBe(false);
  });

  it("3개월 일수 0 또는 음수는 실패", () => {
    const result = calculateSeverance({
      hireDate: new Date("2025-04-26"),
      resignDate: new Date("2026-04-26"),
      threeMonthsTotalPay: 9_000_000,
      threeMonthsDays: 0,
    });
    expect(result.success).toBe(false);
  });

  it("음수 상여는 실패", () => {
    const result = calculateSeverance({
      hireDate: new Date("2025-04-26"),
      resignDate: new Date("2026-04-26"),
      threeMonthsTotalPay: 9_000_000,
      threeMonthsDays: 90,
      annualBonus: -1,
    });
    expect(result.success).toBe(false);
  });
});
