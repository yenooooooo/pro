import { describe, expect, it } from "vitest";
import { checkBudgets } from "./budget-check";

const CATEGORIES = [
  { id: "c1", name: "법인카드", budget_monthly: 10_000_000 },
  { id: "c2", name: "복리후생", budget_monthly: 2_000_000 },
  { id: "c3", name: "기타", budget_monthly: null },
  { id: "c4", name: "예산없음", budget_monthly: 0 },
];

describe("checkBudgets", () => {
  it("한도의 50% 미만이면 ok", () => {
    const r = checkBudgets(
      [{ categoryId: "c1", amount: 3_000_000 }],
      CATEGORIES,
    );
    const c1 = r.find((x) => x.categoryId === "c1");
    expect(c1?.status).toBe("ok");
    expect(c1?.ratio).toBeCloseTo(0.3, 2);
  });

  it("한도의 80~100%면 warn", () => {
    const r = checkBudgets(
      [{ categoryId: "c2", amount: 1_700_000 }],
      CATEGORIES,
    );
    const c2 = r.find((x) => x.categoryId === "c2");
    expect(c2?.status).toBe("warn");
    expect(c2?.ratio).toBeCloseTo(0.85, 2);
  });

  it("한도 100% 이상이면 over", () => {
    const r = checkBudgets(
      [
        { categoryId: "c2", amount: 1_500_000 },
        { categoryId: "c2", amount: 700_000 },
      ],
      CATEGORIES,
    );
    const c2 = r.find((x) => x.categoryId === "c2");
    expect(c2?.status).toBe("over");
    expect(c2?.used).toBe(2_200_000);
    expect(c2?.ratio).toBeCloseTo(1.1, 2);
  });

  it("budget_monthly가 null/0이면 점검 대상 제외", () => {
    const r = checkBudgets(
      [
        { categoryId: "c3", amount: 999_999_999 },
        { categoryId: "c4", amount: 999_999_999 },
      ],
      CATEGORIES,
    );
    expect(r.find((x) => x.categoryId === "c3")).toBeUndefined();
    expect(r.find((x) => x.categoryId === "c4")).toBeUndefined();
  });

  it("categoryId 없는 지출은 무시", () => {
    const r = checkBudgets(
      [{ categoryId: null, amount: 5_000_000 }],
      CATEGORIES,
    );
    const c1 = r.find((x) => x.categoryId === "c1");
    expect(c1?.used).toBe(0);
    expect(c1?.status).toBe("ok");
  });

  it("정렬: over → warn → ok, 같은 status면 ratio 내림차순", () => {
    const r = checkBudgets(
      [
        { categoryId: "c1", amount: 11_000_000 }, // over (110%)
        { categoryId: "c2", amount: 1_700_000 }, // warn (85%)
      ],
      CATEGORIES,
    );
    expect(r[0].categoryId).toBe("c1"); // over 먼저
    expect(r[1].categoryId).toBe("c2"); // warn 다음
  });
});
