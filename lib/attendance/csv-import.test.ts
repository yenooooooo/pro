import { describe, expect, it } from "vitest";
import { parseAttendanceCSV } from "./csv-import";

describe("parseAttendanceCSV — 정상 케이스", () => {
  it("최소 헤더 + 1행 파싱", () => {
    const csv = [
      "사번,일자,출근,퇴근",
      "DEV-1042,2026-04-01,09:00,18:00",
    ].join("\n");
    const r = parseAttendanceCSV(csv);
    expect("fatal" in r).toBe(false);
    if (!("fatal" in r)) {
      expect(r.rows).toHaveLength(1);
      expect(r.rows[0]).toMatchObject({
        employeeNo: "DEV-1042",
        workDate: "2026-04-01",
        checkIn: "09:00",
        checkOut: "18:00",
        nightHours: 0,
        holidayHours: 0,
        note: null,
      });
      expect(r.errors).toHaveLength(0);
    }
  });

  it("전체 헤더 + 다중 행", () => {
    const csv = [
      "사번,일자,출근,퇴근,야간,휴일,비고",
      "DEV-1042,2026-04-01,09:00,18:00,0,0,",
      "DEV-1042,2026-04-02,09:00,20:00,2,0,거래처 미팅",
    ].join("\r\n");
    const r = parseAttendanceCSV(csv);
    if (!("fatal" in r)) {
      expect(r.rows).toHaveLength(2);
      expect(r.rows[1].nightHours).toBe(2);
      expect(r.rows[1].note).toBe("거래처 미팅");
    }
  });

  it("BOM 포함 파일 허용", () => {
    const csv =
      "﻿사번,일자,출근,퇴근\nDEV-1042,2026-04-01,09:00,18:00";
    const r = parseAttendanceCSV(csv);
    if (!("fatal" in r)) {
      expect(r.rows).toHaveLength(1);
    }
  });

  it("따옴표로 감싼 비고 안의 콤마 처리", () => {
    const csv = [
      "사번,일자,출근,퇴근,비고",
      'DEV-1042,2026-04-01,09:00,18:00,"외근, 거래처 A"',
    ].join("\n");
    const r = parseAttendanceCSV(csv);
    if (!("fatal" in r)) {
      expect(r.rows[0].note).toBe("외근, 거래처 A");
    }
  });

  it("따옴표 이스케이프(\"\") 처리", () => {
    const csv = [
      "사번,일자,출근,퇴근,비고",
      'DEV-1042,2026-04-01,09:00,18:00,"그는 ""야근"" 했다"',
    ].join("\n");
    const r = parseAttendanceCSV(csv);
    if (!("fatal" in r)) {
      expect(r.rows[0].note).toBe('그는 "야근" 했다');
    }
  });

  it("빈 줄은 스킵", () => {
    const csv = [
      "사번,일자,출근,퇴근",
      "",
      "DEV-1042,2026-04-01,09:00,18:00",
      "",
    ].join("\n");
    const r = parseAttendanceCSV(csv);
    if (!("fatal" in r)) {
      expect(r.rows).toHaveLength(1);
    }
  });
});

describe("parseAttendanceCSV — 에러 케이스", () => {
  it("빈 파일은 fatal", () => {
    const r = parseAttendanceCSV("");
    expect("fatal" in r).toBe(true);
  });

  it("필수 헤더 누락은 fatal", () => {
    const csv = ["사번,출근,퇴근", "DEV-1042,09:00,18:00"].join("\n");
    const r = parseAttendanceCSV(csv);
    expect("fatal" in r).toBe(true);
    if ("fatal" in r) {
      expect(r.fatal).toMatch(/일자/);
    }
  });

  it("일자 형식 오류는 행 단위 errors에 기록", () => {
    const csv = [
      "사번,일자,출근,퇴근",
      "DEV-1042,2026/04/01,09:00,18:00",
      "DEV-1042,2026-04-02,09:00,18:00",
    ].join("\n");
    const r = parseAttendanceCSV(csv);
    if (!("fatal" in r)) {
      expect(r.rows).toHaveLength(1);
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0].lineNumber).toBe(2);
      expect(r.errors[0].error).toMatch(/일자/);
    }
  });

  it("시간 형식 오류는 행 단위 errors", () => {
    const csv = [
      "사번,일자,출근,퇴근",
      "DEV-1042,2026-04-01,9시,18:00",
    ].join("\n");
    const r = parseAttendanceCSV(csv);
    if (!("fatal" in r)) {
      expect(r.rows).toHaveLength(0);
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0].error).toMatch(/출근/);
    }
  });

  it("사번 누락은 행 errors", () => {
    const csv = [
      "사번,일자,출근,퇴근",
      ",2026-04-01,09:00,18:00",
    ].join("\n");
    const r = parseAttendanceCSV(csv);
    if (!("fatal" in r)) {
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0].error).toMatch(/사번/);
    }
  });

  it("야간 시간이 음수면 errors", () => {
    const csv = [
      "사번,일자,출근,퇴근,야간",
      "DEV-1042,2026-04-01,09:00,18:00,-1",
    ].join("\n");
    const r = parseAttendanceCSV(csv);
    if (!("fatal" in r)) {
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0].error).toMatch(/야간/);
    }
  });
});
