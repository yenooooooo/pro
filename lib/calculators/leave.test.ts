import { describe, expect, it } from "vitest";
import { calculateAnnualLeave } from "./leave";

describe("calculateAnnualLeave — hire_date 모드 (입사일 기준)", () => {
  it("입사 1개월 미만은 0일", () => {
    const result = calculateAnnualLeave(
      new Date("2026-04-01"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(0);
      expect(result.basis).toBe("monthly");
      expect(result.monthsAccrued).toBe(0);
    }
  });

  it("입사 1개월 차에 1일 발생", () => {
    const result = calculateAnnualLeave(
      new Date("2026-03-26"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(1);
      expect(result.basis).toBe("monthly");
    }
  });

  it("입사 6개월 차에 6일", () => {
    const result = calculateAnnualLeave(
      new Date("2025-10-26"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(6);
      expect(result.monthsAccrued).toBe(6);
    }
  });

  it("입사 11개월 차에 11일", () => {
    const result = calculateAnnualLeave(
      new Date("2025-05-26"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(11);
    }
  });

  it("입사 1년 미만이면 11일을 초과하지 않는다", () => {
    // 만 11개월 + 28일 (아직 12개월 도래 전)
    const result = calculateAnnualLeave(
      new Date("2025-04-28"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(11);
      expect(result.basis).toBe("monthly");
    }
  });

  it("정확히 1년 차에 15일로 전환", () => {
    const result = calculateAnnualLeave(
      new Date("2025-04-26"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(15);
      expect(result.yearsOfService).toBe(1);
      expect(result.basis).toBe("annual");
    }
  });

  it("2년차도 15일 (3년 미만)", () => {
    const result = calculateAnnualLeave(
      new Date("2024-04-26"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(15);
      expect(result.yearsOfService).toBe(2);
    }
  });

  it("3년차에 16일", () => {
    const result = calculateAnnualLeave(
      new Date("2023-04-26"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(16);
    }
  });

  it("5년차에 17일", () => {
    const result = calculateAnnualLeave(
      new Date("2021-04-26"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(17);
    }
  });

  it("7년차에 18일", () => {
    const result = calculateAnnualLeave(
      new Date("2019-04-26"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(18);
    }
  });

  it("21년차에 25일 (상한 도달)", () => {
    const result = calculateAnnualLeave(
      new Date("2005-04-26"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(25);
    }
  });

  it("25년차에도 25일을 초과하지 않는다 (상한)", () => {
    const result = calculateAnnualLeave(
      new Date("2001-04-26"),
      new Date("2026-04-26"),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(25);
    }
  });

  it("기준일이 입사일보다 빠르면 실패", () => {
    const result = calculateAnnualLeave(
      new Date("2026-04-26"),
      new Date("2026-04-25"),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/기준일/);
    }
  });
});

describe("calculateAnnualLeave — fiscal_year 모드 (회계연도 기준)", () => {
  it("같은 회계연도 입사 직원은 월차 누적", () => {
    // 2026-03-15 입사, base 2026-04-26 → 만 1개월
    const result = calculateAnnualLeave(
      new Date("2026-03-15"),
      new Date("2026-04-26"),
      "fiscal_year",
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(1);
      expect(result.basis).toBe("monthly");
    }
  });

  it("회계연도 시작 시점에 1년 미만이면 월차", () => {
    // 2025-08-01 입사, base 2026-04-26.
    // 회계연도(2026) 시작 시점(2026-01-01)에 입사 5개월 → 1년 미만.
    // base 시점 만 8개월.
    const result = calculateAnnualLeave(
      new Date("2025-08-01"),
      new Date("2026-04-26"),
      "fiscal_year",
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.basis).toBe("monthly");
      expect(result.days).toBe(8);
    }
  });

  it("회계연도 시작 시점에 1년 이상이면 연단위 부여", () => {
    // 2020-06-15 입사, base 2026-04-26.
    // 회계연도(2026) 시작 2026-01-01 기준 5년 6개월 → 5년차 → 17일.
    const result = calculateAnnualLeave(
      new Date("2020-06-15"),
      new Date("2026-04-26"),
      "fiscal_year",
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(17);
      expect(result.yearsOfService).toBe(5);
      expect(result.basis).toBe("annual");
    }
  });

  it("회계연도 모드도 25일 상한", () => {
    const result = calculateAnnualLeave(
      new Date("1995-04-26"),
      new Date("2026-04-26"),
      "fiscal_year",
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toBe(25);
    }
  });
});
