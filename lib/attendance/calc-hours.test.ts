import { describe, expect, it } from "vitest";
import { calcDailyHours } from "./calc-hours";

describe("calcDailyHours", () => {
  it("9:00~18:00 (표준 근무) → 정상 8h, 연장 0", () => {
    const r = calcDailyHours({ checkIn: "09:00", checkOut: "18:00" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.regularHours).toBe(8);
      expect(r.overtimeHours).toBe(0);
      expect(r.elapsedHours).toBe(9);
      expect(r.breakHours).toBe(1);
    }
  });

  it("9:00~20:00 (2시간 연장) → 정상 8h, 연장 2h", () => {
    const r = calcDailyHours({ checkIn: "09:00", checkOut: "20:00" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.regularHours).toBe(8);
      expect(r.overtimeHours).toBe(2);
      expect(r.elapsedHours).toBe(11);
    }
  });

  it("9:00~18:30 (반시간 연장) → 정상 8h, 연장 0.5h", () => {
    const r = calcDailyHours({ checkIn: "09:00", checkOut: "18:30" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.regularHours).toBe(8);
      expect(r.overtimeHours).toBe(0.5);
    }
  });

  it("9:00~13:00 (4h 근무 — 30분 휴게) → 정상 3.5h", () => {
    const r = calcDailyHours({ checkIn: "09:00", checkOut: "13:00" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.regularHours).toBe(3.5);
      expect(r.overtimeHours).toBe(0);
      expect(r.breakHours).toBe(0.5);
    }
  });

  it("9:00~12:00 (3h — 휴게 없음) → 정상 3h", () => {
    const r = calcDailyHours({ checkIn: "09:00", checkOut: "12:00" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.regularHours).toBe(3);
      expect(r.breakHours).toBe(0);
    }
  });

  it("정확히 8h elapsed (9:00~17:00) → 1h 휴게 차감 → 정상 7h", () => {
    const r = calcDailyHours({ checkIn: "09:00", checkOut: "17:00" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.regularHours).toBe(7);
      expect(r.breakHours).toBe(1);
    }
  });

  it("출근 == 퇴근 → 실패", () => {
    const r = calcDailyHours({ checkIn: "09:00", checkOut: "09:00" });
    expect(r.success).toBe(false);
  });

  it("퇴근이 출근보다 빠르면 실패 (자정 넘김 미지원)", () => {
    const r = calcDailyHours({ checkIn: "22:00", checkOut: "06:00" });
    expect(r.success).toBe(false);
  });

  it("잘못된 시간 형식이면 실패", () => {
    expect(calcDailyHours({ checkIn: "abc", checkOut: "18:00" }).success).toBe(false);
    expect(calcDailyHours({ checkIn: "09:00", checkOut: "25:99" }).success).toBe(false);
  });

  it("HH:MM:SS 포맷도 허용", () => {
    const r = calcDailyHours({ checkIn: "09:00:00", checkOut: "18:00:00" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.regularHours).toBe(8);
    }
  });
});
