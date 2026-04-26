import { describe, expect, it } from "vitest";
import { aggregateAttendance, type AttendanceInput } from "./aggregate";

function row(overrides: Partial<AttendanceInput>): AttendanceInput {
  return {
    employeeId: "emp-1",
    employeeNo: "E001",
    name: "홍길동",
    workDate: "2026-04-01",
    regularHours: 8,
    overtimeHours: 0,
    nightHours: 0,
    holidayHours: 0,
    ...overrides,
  };
}

describe("aggregateAttendance", () => {
  it("빈 입력은 빈 배열", () => {
    expect(aggregateAttendance([])).toEqual([]);
  });

  it("직원별로 시간을 합산한다", () => {
    const result = aggregateAttendance([
      row({ workDate: "2026-04-01", regularHours: 8 }),
      row({ workDate: "2026-04-02", regularHours: 8, overtimeHours: 2 }),
      row({ workDate: "2026-04-03", regularHours: 8, nightHours: 1 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].regularHours).toBe(24);
    expect(result[0].overtimeHours).toBe(2);
    expect(result[0].nightHours).toBe(1);
    expect(result[0].daysWorked).toBe(3);
  });

  it("0시간 행은 daysWorked에서 제외", () => {
    const result = aggregateAttendance([
      row({ workDate: "2026-04-01", regularHours: 8 }),
      row({
        workDate: "2026-04-02",
        regularHours: 0,
        overtimeHours: 0,
        nightHours: 0,
        holidayHours: 0,
      }),
    ]);
    expect(result[0].daysWorked).toBe(1);
  });

  it("주 52시간 이내면 exceededWeeks=0", () => {
    // 2026-04-06(월) ~ 2026-04-10(금): 5일 × 10시간 = 50h
    const result = aggregateAttendance([
      row({ workDate: "2026-04-06", regularHours: 8, overtimeHours: 2 }),
      row({ workDate: "2026-04-07", regularHours: 8, overtimeHours: 2 }),
      row({ workDate: "2026-04-08", regularHours: 8, overtimeHours: 2 }),
      row({ workDate: "2026-04-09", regularHours: 8, overtimeHours: 2 }),
      row({ workDate: "2026-04-10", regularHours: 8, overtimeHours: 2 }),
    ]);
    expect(result[0].maxWeeklyHours).toBe(50);
    expect(result[0].exceededWeeks).toBe(0);
  });

  it("한 주가 52시간을 넘으면 exceededWeeks 증가", () => {
    // 2026-04-06(월) ~ 2026-04-12(일): 6일 × 9h = 54h
    const result = aggregateAttendance([
      row({ workDate: "2026-04-06", regularHours: 8, overtimeHours: 1 }),
      row({ workDate: "2026-04-07", regularHours: 8, overtimeHours: 1 }),
      row({ workDate: "2026-04-08", regularHours: 8, overtimeHours: 1 }),
      row({ workDate: "2026-04-09", regularHours: 8, overtimeHours: 1 }),
      row({ workDate: "2026-04-10", regularHours: 8, overtimeHours: 1 }),
      row({ workDate: "2026-04-11", regularHours: 0, overtimeHours: 0, holidayHours: 9 }),
    ]);
    expect(result[0].maxWeeklyHours).toBe(54);
    expect(result[0].exceededWeeks).toBe(1);
  });

  it("주가 다르면 별도 계산 — 한 주만 초과 시 1주만 카운트", () => {
    // 첫째 주(03/30 월 ~ 04/05 일): 1일 60h (말도 안 되지만 테스트용)
    // 둘째 주(04/06 월 ~ 04/12 일): 1일 40h
    const result = aggregateAttendance([
      row({ workDate: "2026-04-01", regularHours: 8, overtimeHours: 52 }),
      row({ workDate: "2026-04-08", regularHours: 8, overtimeHours: 32 }),
    ]);
    expect(result[0].maxWeeklyHours).toBe(60);
    expect(result[0].exceededWeeks).toBe(1);
  });

  it("여러 직원을 이름 가나다 순으로 반환", () => {
    const result = aggregateAttendance([
      row({ employeeId: "b", name: "박철수", workDate: "2026-04-01" }),
      row({ employeeId: "a", name: "강민준", workDate: "2026-04-01" }),
      row({ employeeId: "c", name: "이서연", workDate: "2026-04-01" }),
    ]);
    expect(result.map((r) => r.name)).toEqual(["강민준", "박철수", "이서연"]);
  });
});
