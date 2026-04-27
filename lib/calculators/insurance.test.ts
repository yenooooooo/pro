import { describe, expect, it } from "vitest";
import { calculateInsurance, type InsuranceRates } from "./insurance";

// 단순화한 테스트용 요율(실제값 아님 — 시드는 공식 사이트에서 매년 갱신).
const SAMPLE_RATES: InsuranceRates = {
  year: 2026,
  pensionRate: 0.045, // 4.5%
  healthRate: 0.035, // 3.5%
  ltcRate: 0.1, // 건강보험료 × 10%
  employmentRate: 0.009, // 0.9%
  pensionMinBase: 380_000,
  pensionMaxBase: 5_900_000,
};

describe("calculateInsurance — 일반 케이스", () => {
  it("과세소득 300만원 기준 4대보험 합계", () => {
    const result = calculateInsurance(3_000_000, SAMPLE_RATES);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pension).toBe(135_000); // 3,000,000 × 0.045
      expect(result.data.health).toBe(105_000); // 3,000,000 × 0.035
      expect(result.data.ltc).toBe(10_500); // 105,000 × 0.10
      expect(result.data.employment).toBe(27_000); // 3,000,000 × 0.009
      expect(result.data.total).toBe(277_500);
      expect(result.data.pensionBase).toBe(3_000_000);
    }
  });

  it("과세소득 0원이면 모든 항목 0 (단, 국민연금은 하한 적용)", () => {
    const result = calculateInsurance(0, SAMPLE_RATES);
    expect(result.success).toBe(true);
    if (result.success) {
      // 0 < 380,000 하한 → 380,000 × 0.045 = 17,100
      expect(result.data.pensionBase).toBe(380_000);
      expect(result.data.pension).toBe(17_100);
      expect(result.data.health).toBe(0);
      expect(result.data.ltc).toBe(0);
      expect(result.data.employment).toBe(0);
    }
  });

  it("음수 과세소득은 실패", () => {
    const result = calculateInsurance(-1, SAMPLE_RATES);
    expect(result.success).toBe(false);
  });
});

describe("calculateInsurance — 국민연금 상하한", () => {
  it("과세소득이 상한(590만)을 초과해도 상한 기준 산정", () => {
    const result = calculateInsurance(8_000_000, SAMPLE_RATES);
    expect(result.success).toBe(true);
    if (result.success) {
      // 5,900,000 × 0.045 = 265,500
      expect(result.data.pensionBase).toBe(5_900_000);
      expect(result.data.pension).toBe(265_500);
      // 건강·고용은 실제 과세소득 기준
      expect(result.data.health).toBe(280_000); // 8,000,000 × 0.035
      expect(result.data.employment).toBe(72_000); // 8,000,000 × 0.009
    }
  });

  it("과세소득이 하한(38만) 미만이면 하한 기준 산정", () => {
    const result = calculateInsurance(200_000, SAMPLE_RATES);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pensionBase).toBe(380_000);
      expect(result.data.pension).toBe(17_100); // 380,000 × 0.045
      // 건강·고용은 실제값(200,000) 기준
      expect(result.data.health).toBe(7_000);
      expect(result.data.employment).toBe(1_800);
    }
  });

  it("상하한이 null이면 그대로 적용", () => {
    const result = calculateInsurance(8_000_000, {
      ...SAMPLE_RATES,
      pensionMinBase: null,
      pensionMaxBase: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pensionBase).toBe(8_000_000);
      expect(result.data.pension).toBe(360_000);
    }
  });
});

describe("calculateInsurance — 요율 검증", () => {
  it("요율이 음수면 실패", () => {
    const result = calculateInsurance(3_000_000, {
      ...SAMPLE_RATES,
      pensionRate: -0.01,
    });
    expect(result.success).toBe(false);
  });

  it("요율이 1을 초과하면 실패 (백분율 오기 방지)", () => {
    const result = calculateInsurance(3_000_000, {
      ...SAMPLE_RATES,
      healthRate: 4.5, // 4.5% 입력 시 0.045여야 함
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/healthRate/);
    }
  });

  it("min > max 면 실패", () => {
    const result = calculateInsurance(3_000_000, {
      ...SAMPLE_RATES,
      pensionMinBase: 6_000_000,
      pensionMaxBase: 5_900_000,
    });
    expect(result.success).toBe(false);
  });
});

describe("calculateInsurance — 장기요양 ltcRate 의미", () => {
  it("ltcRate는 건강보험료 대비 비율", () => {
    // 건강보험료가 10만이면, ltcRate 0.1281 → 12,810원
    const result = calculateInsurance(2_857_142, {
      ...SAMPLE_RATES,
      healthRate: 0.035, // 100,000원 발생
      ltcRate: 0.1281,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.health).toBe(100_000);
      expect(result.data.ltc).toBe(12_810);
    }
  });
});
