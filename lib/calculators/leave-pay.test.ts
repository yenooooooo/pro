import { describe, expect, it } from "vitest";
import { calculateLeavePay } from "./leave-pay";

describe("calculateLeavePay", () => {
  it("월 300만 + 미사용 5일 → 574,163원", () => {
    const result = calculateLeavePay({
      baseSalary: 3_000_000,
      unusedDays: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 통상시급 14354.07 × 8h × 5일 = 574,162.7 → round 574,163
      expect(result.data.pay).toBe(574_163);
      expect(result.data.dailyOrdinaryWage).toBe(114_833);
    }
  });

  it("미사용 0일이면 0원", () => {
    const result = calculateLeavePay({
      baseSalary: 3_000_000,
      unusedDays: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pay).toBe(0);
    }
  });

  it("반차(0.5일) 허용", () => {
    const result = calculateLeavePay({
      baseSalary: 3_000_000,
      unusedDays: 0.5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 14354.07 × 8 × 0.5 = 57,416
      expect(result.data.pay).toBe(57_416);
    }
  });

  it("직책수당이 통상임금 포함되면 시급 가산", () => {
    // 기본 300만 + 직책 50만 = 통상시급 (3,500,000)/209 = 16,746.4
    const result = calculateLeavePay({
      baseSalary: 3_000_000,
      unusedDays: 5,
      extraMonthlyOrdinaryAllowance: 500_000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 3,500,000 / 209 × 8 × 5 = 669,856.46... → round 669,856
      expect(result.data.pay).toBe(669_856);
    }
  });

  it("기본급 0 또는 음수면 실패", () => {
    expect(calculateLeavePay({ baseSalary: 0, unusedDays: 5 }).success).toBe(false);
    expect(calculateLeavePay({ baseSalary: -1, unusedDays: 5 }).success).toBe(false);
  });

  it("음수 일수면 실패", () => {
    const result = calculateLeavePay({ baseSalary: 3_000_000, unusedDays: -1 });
    expect(result.success).toBe(false);
  });

  it("dailyHours 커스텀 (예: 7시간)", () => {
    const result = calculateLeavePay({
      baseSalary: 3_000_000,
      unusedDays: 5,
      dailyHours: 7,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 14354.07 × 7 × 5 = 502,392.34 → round 502,392
      expect(result.data.pay).toBe(502_392);
    }
  });
});
