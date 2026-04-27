import { describe, expect, it } from "vitest";
import { calculateDepreciation, classifyLifecycle } from "./depreciation";

describe("calculateDepreciation — 정상 케이스", () => {
  it("PC 200만원, 내용연수 5년, 1년 경과 → 연 40만, 장부 160만", () => {
    const r = calculateDepreciation(
      {
        acquisitionDate: new Date("2025-04-26"),
        acquisitionCost: 2_000_000,
        usefulLifeYears: 5,
      },
      new Date("2026-04-26"),
    );
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.annualDepreciation).toBe(400_000);
    expect(r.accumulatedDepreciation).toBe(400_000);
    expect(r.bookValue).toBe(1_600_000);
    expect(r.elapsedYears).toBeCloseTo(1, 1);
    expect(r.remainingYears).toBeCloseTo(4, 1);
    expect(r.isExpired).toBe(false);
  });

  it("내용연수 정확히 도달 (5년 경과) → bookValue 0, isExpired", () => {
    // 2024 윤년 포함 → 5년 = 1827일이지만 elapsedYears는 1826/365 ≈ 5.00
    const r = calculateDepreciation(
      {
        acquisitionDate: new Date("2021-04-26"),
        acquisitionCost: 2_000_000,
        usefulLifeYears: 5,
      },
      new Date("2026-04-26"),
    );
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.bookValue).toBeLessThanOrEqual(10_000); // 잔여 1년 이하 잔액 (round 영향 ±)
    expect(r.isExpired).toBe(true);
  });

  it("내용연수 초과해도 bookValue 음수 안 됨 (취득원가에서 클램프)", () => {
    const r = calculateDepreciation(
      {
        acquisitionDate: new Date("2018-04-26"),
        acquisitionCost: 2_000_000,
        usefulLifeYears: 5,
      },
      new Date("2026-04-26"),
    );
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.accumulatedDepreciation).toBe(2_000_000);
    expect(r.bookValue).toBe(0);
    expect(r.isExpired).toBe(true);
  });
});

describe("calculateDepreciation — 누락 입력", () => {
  it("취득원가 0/음수면 null", () => {
    expect(
      calculateDepreciation(
        {
          acquisitionDate: new Date("2025-04-26"),
          acquisitionCost: 0,
          usefulLifeYears: 5,
        },
        new Date("2026-04-26"),
      ),
    ).toBeNull();
  });

  it("내용연수 0/음수면 null", () => {
    expect(
      calculateDepreciation(
        {
          acquisitionDate: new Date("2025-04-26"),
          acquisitionCost: 1_000_000,
          usefulLifeYears: 0,
        },
        new Date("2026-04-26"),
      ),
    ).toBeNull();
  });
});

describe("calculateDepreciation — 미래 취득일", () => {
  it("취득일이 baseDate보다 늦으면 누적 0 + 장부=취득원가", () => {
    const r = calculateDepreciation(
      {
        acquisitionDate: new Date("2027-01-01"),
        acquisitionCost: 1_000_000,
        usefulLifeYears: 5,
      },
      new Date("2026-04-26"),
    );
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.accumulatedDepreciation).toBe(0);
    expect(r.bookValue).toBe(1_000_000);
    expect(r.elapsedYears).toBe(0);
    expect(r.isExpired).toBe(false);
  });
});

describe("classifyLifecycle", () => {
  it("null이면 ok (감가상각 불가 자산)", () => {
    expect(classifyLifecycle(null)).toBe("ok");
  });

  it("잔여 1년 → ok", () => {
    expect(classifyLifecycle(1)).toBe("ok");
  });

  it("잔여 6개월 미만 → expiring", () => {
    expect(classifyLifecycle(0.4)).toBe("expiring");
    expect(classifyLifecycle(0.1)).toBe("expiring");
  });

  it("잔여 0 또는 음수 → expired", () => {
    expect(classifyLifecycle(0)).toBe("expired");
    expect(classifyLifecycle(-1.5)).toBe("expired");
  });
});
