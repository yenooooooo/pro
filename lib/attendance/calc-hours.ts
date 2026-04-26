/**
 * 출/퇴근 시간으로 정상근로·연장근로 자동 계산.
 *
 * 근거:
 *  - 근로기준법 제50조 — 1일 8시간 법정근로
 *  - 근로기준법 제53조 — 연장근로
 *  - 근로기준법 제54조 — 휴게시간 (4h+ 30분, 8h+ 1시간)
 *
 * 한계:
 *  - 자정을 넘기는 야간 근무는 별도 입력으로 처리 (caller가 night_hours 직접 기입).
 *  - 본 함수는 같은 날 within HH:MM 범위에서 작동.
 */

export type CalcHoursInput = {
  /** "HH:MM" 또는 "HH:MM:SS" */
  checkIn: string;
  checkOut: string;
};

export type CalcHoursSuccess = {
  success: true;
  regularHours: number;
  overtimeHours: number;
  /** 출근~퇴근 총 경과 (참고용, 휴게 포함). */
  elapsedHours: number;
  /** 차감된 휴게시간. */
  breakHours: number;
};

export type CalcHoursFailure = {
  success: false;
  error: string;
};

export type CalcHoursResult = CalcHoursSuccess | CalcHoursFailure;

const STANDARD_WORK_HOURS = 8;

export function calcDailyHours(input: CalcHoursInput): CalcHoursResult {
  const inMin = parseTimeToMinutes(input.checkIn);
  const outMin = parseTimeToMinutes(input.checkOut);

  if (inMin === null) {
    return { success: false, error: "출근 시간 형식이 올바르지 않습니다." };
  }
  if (outMin === null) {
    return { success: false, error: "퇴근 시간 형식이 올바르지 않습니다." };
  }
  if (outMin <= inMin) {
    return {
      success: false,
      error: "퇴근 시간은 출근 시간보다 늦어야 합니다. 자정을 넘기는 근무는 야간 근로를 직접 입력하세요.",
    };
  }

  const elapsed = (outMin - inMin) / 60;
  const breakHrs = breakHours(elapsed);
  const effective = Math.max(0, elapsed - breakHrs);
  const regular = Math.min(STANDARD_WORK_HOURS, effective);
  const overtime = Math.max(0, effective - STANDARD_WORK_HOURS);

  return {
    success: true,
    regularHours: round(regular),
    overtimeHours: round(overtime),
    elapsedHours: round(elapsed),
    breakHours: breakHrs,
  };
}

function breakHours(elapsed: number): number {
  if (elapsed >= 8) return 1;
  if (elapsed >= 4) return 0.5;
  return 0;
}

function parseTimeToMinutes(s: string): number | null {
  if (typeof s !== "string") return null;
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return null;
  const [h, m] = s.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
