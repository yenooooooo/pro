import { describe, expect, it } from "vitest";
import { calculateIncomeTax, type IncomeTaxRow } from "./income-tax";

const TABLE_2026: IncomeTaxRow[] = [
  // 1인 가구 (본인만)
  { year: 2026, minSalary: 2_500_000, maxSalary: 2_520_000, dependents: 1, tax: 41_630 },
  { year: 2026, minSalary: 3_000_000, maxSalary: 3_020_000, dependents: 1, tax: 84_850 },
  { year: 2026, minSalary: 3_020_000, maxSalary: 3_040_000, dependents: 1, tax: 86_500 },
  // 4인 가구
  { year: 2026, minSalary: 3_000_000, maxSalary: 3_020_000, dependents: 4, tax: 28_600 },
  // 다른 연도 — 매칭되면 안 됨
  { year: 2025, minSalary: 3_000_000, maxSalary: 3_020_000, dependents: 1, tax: 99_999 },
];

describe("calculateIncomeTax — 표 조회", () => {
  it("월급여 300만 + 1인 가구 → 매칭 row의 세액 반환", () => {
    const result = calculateIncomeTax(3_000_000, 1, TABLE_2026, 2026);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.incomeTax).toBe(84_850);
      // 지방소득세 = 84,850 × 0.1 = 8,485 → 10원 절사 = 8,480
      expect(result.data.localIncomeTax).toBe(8_480);
      expect(result.data.matchedRow.year).toBe(2026);
      expect(result.data.matchedRow.dependents).toBe(1);
    }
  });

  it("같은 월급여라도 부양가족수에 따라 세액 다름", () => {
    const onePerson = calculateIncomeTax(3_010_000, 1, TABLE_2026, 2026);
    const fourPersons = calculateIncomeTax(3_010_000, 4, TABLE_2026, 2026);
    expect(onePerson.success).toBe(true);
    expect(fourPersons.success).toBe(true);
    if (onePerson.success && fourPersons.success) {
      expect(onePerson.data.incomeTax).toBe(84_850);
      expect(fourPersons.data.incomeTax).toBe(28_600);
    }
  });

  it("정확히 minSalary 경계는 포함, maxSalary 경계는 제외", () => {
    // minSalary 정확
    const atMin = calculateIncomeTax(3_020_000, 1, TABLE_2026, 2026);
    expect(atMin.success).toBe(true);
    if (atMin.success) {
      // 3,020,000은 두 번째 row의 maxSalary이자 세 번째 row의 minSalary → 세 번째 row 매칭
      expect(atMin.data.incomeTax).toBe(86_500);
    }
  });
});

describe("calculateIncomeTax — 지방소득세 절사", () => {
  it("소득세 41,630원 → 지방소득세 4,160원 (10원 절사)", () => {
    const result = calculateIncomeTax(2_510_000, 1, TABLE_2026, 2026);
    expect(result.success).toBe(true);
    if (result.success) {
      // 41,630 × 0.1 = 4163 → floor(/10)*10 = 4160
      expect(result.data.localIncomeTax).toBe(4_160);
    }
  });

  it("소득세 86,500원 → 지방소득세 8,650원 (절사 영향 없음)", () => {
    const result = calculateIncomeTax(3_030_000, 1, TABLE_2026, 2026);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.localIncomeTax).toBe(8_650);
    }
  });
});

describe("calculateIncomeTax — 매칭 실패 / 검증", () => {
  it("연도 불일치 → 매칭 실패", () => {
    const result = calculateIncomeTax(3_000_000, 1, TABLE_2026, 2027);
    expect(result.success).toBe(false);
  });

  it("구간 밖(과세소득이 표 어떤 구간에도 없음) → 실패", () => {
    const result = calculateIncomeTax(50_000_000, 1, TABLE_2026, 2026);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/구간/);
    }
  });

  it("부양가족수 매칭 실패 → 실패", () => {
    // dependents 11은 표에 없음
    const result = calculateIncomeTax(3_000_000, 11, TABLE_2026, 2026);
    expect(result.success).toBe(false);
  });

  it("빈 표 → 실패", () => {
    const result = calculateIncomeTax(3_000_000, 1, [], 2026);
    expect(result.success).toBe(false);
  });

  it("음수 과세소득 → 실패", () => {
    const result = calculateIncomeTax(-1, 1, TABLE_2026, 2026);
    expect(result.success).toBe(false);
  });

  it("부양가족 0 또는 음수 → 실패", () => {
    expect(calculateIncomeTax(3_000_000, 0, TABLE_2026, 2026).success).toBe(false);
    expect(calculateIncomeTax(3_000_000, -1, TABLE_2026, 2026).success).toBe(false);
  });
});
