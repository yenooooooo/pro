import { describe, it, expect } from "vitest";
import { calculateAnnualLeave } from "./leave";

describe("calculateAnnualLeave — placeholder", () => {
  it("Phase 3.2 전까지는 미구현 에러를 반환한다", () => {
    const result = calculateAnnualLeave(new Date("2025-01-01"), new Date("2026-04-23"));
    expect(result.success).toBe(false);
  });
});
