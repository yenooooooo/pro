import { describe, expect, it } from "vitest";
import { calculateGrossPay, validateMinimumWage } from "./payroll";

describe("calculateGrossPay — 기본 계산", () => {
  it("기본급만 있을 때 통상시급은 baseSalary/209", () => {
    const result = calculateGrossPay({ baseSalary: 3_000_000 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.regularHourlyWage).toBeCloseTo(3_000_000 / 209, 2);
      expect(result.data.grossPay).toBe(3_000_000);
      expect(result.data.taxableIncome).toBe(3_000_000);
      expect(result.data.prorationFactor).toBe(1);
    }
  });

  it("기본급 0 또는 음수면 실패", () => {
    expect(calculateGrossPay({ baseSalary: 0 }).success).toBe(false);
    expect(calculateGrossPay({ baseSalary: -100 }).success).toBe(false);
  });

  it("CLAUDE.md §6.4 검증 케이스: 월 300만 + 연장 10h + 식대 20만", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      overtimeHours: 10,
      mealAllowance: 200_000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 통상시급 14,354원/h, 연장 10h × 1.5 = 215,311원
      expect(result.data.overtimePay).toBe(215_311);
      // 총지급 = 3,000,000 + 215,311 + 200,000
      expect(result.data.grossPay).toBe(3_415_311);
      // 식대 20만 전액 비과세
      expect(result.data.nonTaxableTotal).toBe(200_000);
      // 과세소득 = 3,215,311
      expect(result.data.taxableIncome).toBe(3_215_311);
    }
  });
});

describe("calculateGrossPay — 비과세 한도", () => {
  it("식대 25만 중 20만만 비과세, 5만은 과세", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      mealAllowance: 250_000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nonTaxableTotal).toBe(200_000);
      expect(result.data.grossPay).toBe(3_250_000);
      expect(result.data.taxableIncome).toBe(3_050_000);
    }
  });

  it("자가운전 + 육아수당 비과세 합산 (각 20만 한도)", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      mealAllowance: 200_000,
      carAllowance: 200_000,
      childcareAllowance: 200_000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 식대 + 자가운전 + 육아 각 20만 비과세 = 60만
      expect(result.data.nonTaxableTotal).toBe(600_000);
      expect(result.data.grossPay).toBe(3_600_000);
      expect(result.data.taxableIncome).toBe(3_000_000);
    }
  });

  it("자가운전 30만은 20만만 비과세 (10만 과세)", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      carAllowance: 300_000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nonTaxableTotal).toBe(200_000);
      expect(result.data.taxableIncome).toBe(3_100_000);
    }
  });
});

describe("calculateGrossPay — 수당 가산", () => {
  it("야간 4h: 가산분 0.5x만 별도 산정", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      nightHours: 4,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 14354.0669 × 4 × 0.5 = 28,708
      expect(result.data.nightPay).toBe(28_708);
    }
  });

  it("휴일 10h: 8h × 1.5 + 2h × 2.0", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      holidayHours: 10,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 8h × 1.5 = 172,249 + 2h × 2.0 = 57,416 → 229,665
      expect(result.data.holidayPay).toBe(229_665);
    }
  });

  it("휴일 8h 정확: 모두 1.5x", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      holidayHours: 8,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 14354.0669 × 8 × 1.5 = 172,249
      expect(result.data.holidayPay).toBe(172_249);
    }
  });
});

describe("calculateGrossPay — 포괄임금제", () => {
  it("inclusiveOvertimeHours만큼 연장에서 차감", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      overtimeHours: 30,
      inclusiveOvertimeHours: 20,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 실효 연장 10h만 산정 → 215,311원
      expect(result.data.overtimePay).toBe(215_311);
    }
  });

  it("inclusive가 실제보다 많으면 0 (음수 방지)", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      overtimeHours: 5,
      inclusiveOvertimeHours: 20,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.overtimePay).toBe(0);
    }
  });
});

describe("calculateGrossPay — 일할계산", () => {
  it("workedDays/standardWorkDays 비율로 기본급·직책수당·기타수당 비례", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      positionAllowance: 200_000,
      otherAllowance: 100_000,
      mealAllowance: 200_000, // 일할 미적용
      workedDays: 10,
      standardWorkDays: 20,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prorationFactor).toBe(0.5);
      expect(result.data.baseSalaryProrated).toBe(1_500_000);
      expect(result.data.positionAllowance).toBe(100_000);
      expect(result.data.otherAllowance).toBe(50_000);
      // 식대는 일할 미적용 (실제 발생액)
      expect(result.data.mealAllowance).toBe(200_000);
    }
  });

  it("workedDays만 지정하면 실패", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      workedDays: 10,
    });
    expect(result.success).toBe(false);
  });

  it("workedDays > standardWorkDays면 실패", () => {
    const result = calculateGrossPay({
      baseSalary: 3_000_000,
      workedDays: 25,
      standardWorkDays: 20,
    });
    expect(result.success).toBe(false);
  });
});

describe("validateMinimumWage", () => {
  it("통상시급이 최저시급 이상이면 통과", () => {
    // 2026 가정 최저시급 10,000원 (실제값 아님 — 호출자가 주입)
    const result = validateMinimumWage(3_000_000, 10_000);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.regularHourlyWage).toBeCloseTo(14354.07, 1);
    }
  });

  it("통상시급 미달이면 실패 + 메시지에 두 값 포함", () => {
    // 기본급 100만 → 통상시급 약 4,785원
    const result = validateMinimumWage(1_000_000, 10_000);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/4785|4,785/);
      expect(result.error).toMatch(/10000|10,000/);
    }
  });

  it("음수 입력은 실패", () => {
    expect(validateMinimumWage(-1, 10_000).success).toBe(false);
    expect(validateMinimumWage(3_000_000, -1).success).toBe(false);
    expect(validateMinimumWage(0, 10_000).success).toBe(false);
  });
});
