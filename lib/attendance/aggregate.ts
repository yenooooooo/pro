/**
 * 근태 일별 행 → 직원별 월간 집계.
 *
 * 핵심: 주 52시간 검증을 ISO 주차(월~일) 기준으로 수행한다.
 * 근거: 근로기준법 제50조(법정 40h) + 제53조(연장 12h) = 주 52h 상한.
 */

import { getISOWeek, getISOWeekYear } from "date-fns";

export const WEEK52_THRESHOLD = 52;

export type AttendanceInput = {
  employeeId: string;
  employeeNo: string;
  name: string;
  workDate: string; // ISO yyyy-MM-dd
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
};

export type AttendanceAggregate = {
  id: string;
  employeeNo: string;
  name: string;
  daysWorked: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  /** 모든 ISO 주차 중 최대 주간 합산 시간. */
  maxWeeklyHours: number;
  /** 52시간을 초과한 주 수. */
  exceededWeeks: number;
};

export function aggregateAttendance(rows: AttendanceInput[]): AttendanceAggregate[] {
  type Bucket = AttendanceAggregate & { weekHours: Map<string, number> };
  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const dayTotal =
      row.regularHours + row.overtimeHours + row.nightHours + row.holidayHours;

    let bucket = buckets.get(row.employeeId);
    if (!bucket) {
      bucket = {
        id: row.employeeId,
        employeeNo: row.employeeNo,
        name: row.name,
        daysWorked: 0,
        regularHours: 0,
        overtimeHours: 0,
        nightHours: 0,
        holidayHours: 0,
        maxWeeklyHours: 0,
        exceededWeeks: 0,
        weekHours: new Map(),
      };
      buckets.set(row.employeeId, bucket);
    }

    if (dayTotal > 0) bucket.daysWorked += 1;
    bucket.regularHours += row.regularHours;
    bucket.overtimeHours += row.overtimeHours;
    bucket.nightHours += row.nightHours;
    bucket.holidayHours += row.holidayHours;

    const d = parseDate(row.workDate);
    if (d) {
      const weekKey = `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
      bucket.weekHours.set(weekKey, (bucket.weekHours.get(weekKey) ?? 0) + dayTotal);
    }
  }

  const aggregates: AttendanceAggregate[] = [];
  for (const bucket of buckets.values()) {
    let maxWeekly = 0;
    let exceeded = 0;
    for (const wh of bucket.weekHours.values()) {
      if (wh > maxWeekly) maxWeekly = wh;
      if (wh > WEEK52_THRESHOLD) exceeded += 1;
    }
    aggregates.push({
      id: bucket.id,
      employeeNo: bucket.employeeNo,
      name: bucket.name,
      daysWorked: bucket.daysWorked,
      regularHours: round(bucket.regularHours),
      overtimeHours: round(bucket.overtimeHours),
      nightHours: round(bucket.nightHours),
      holidayHours: round(bucket.holidayHours),
      maxWeeklyHours: round(maxWeekly),
      exceededWeeks: exceeded,
    });
  }

  aggregates.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return aggregates;
}

function parseDate(iso: string): Date | null {
  // yyyy-MM-dd 형태만 허용. UTC 자정으로 고정해 timezone drift 방지.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// numeric(5,2) round-trip 시 부동소수 잔차 제거.
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
