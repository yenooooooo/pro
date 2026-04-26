/**
 * 근태 CSV 가져오기 — 파싱 + 검증.
 *
 * 포맷 (헤더 1행 필수, UTF-8 / BOM 허용):
 *   사번,일자,출근,퇴근,야간,휴일,비고
 *   DEV-1042,2026-04-01,09:00,18:00,0,0,
 *   DEV-1042,2026-04-02,09:00,20:00,,,거래처 미팅
 *
 * - 사번/일자/출근/퇴근: 필수
 * - 야간/휴일/비고: 선택 (헤더 없거나 셀이 비어도 OK)
 * - 일자: YYYY-MM-DD, 시간: HH:MM
 * - 정상/연장 시간은 INSERT 시 calcDailyHours로 자동 산출 (CSV에 안 받음).
 */

export type AttendanceCSVRow = {
  employeeNo: string;
  workDate: string;
  checkIn: string;
  checkOut: string;
  nightHours: number;
  holidayHours: number;
  note: string | null;
};

export type ParseError = { lineNumber: number; error: string };

export type ParseResult =
  | { fatal: string }
  | {
      rows: AttendanceCSVRow[];
      errors: ParseError[];
    };

const REQUIRED_HEADERS = ["사번", "일자", "출근", "퇴근"] as const;
const OPTIONAL_HEADERS = ["야간", "휴일", "비고"] as const;

export function parseAttendanceCSV(text: string): ParseResult {
  const matrix = parseCSVMatrix(text);
  if (matrix.length === 0) {
    return { fatal: "빈 파일입니다." };
  }

  const headerRow = matrix[0].map((c) => c.trim());
  for (const h of REQUIRED_HEADERS) {
    if (!headerRow.includes(h)) {
      return { fatal: `필수 헤더 누락: ${h}` };
    }
  }

  const idx = (name: string): number => headerRow.indexOf(name);
  const idxEmp = idx("사번");
  const idxDate = idx("일자");
  const idxIn = idx("출근");
  const idxOut = idx("퇴근");
  const idxNight = idx("야간");
  const idxHoliday = idx("휴일");
  const idxNote = idx("비고");

  const rows: AttendanceCSVRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const r = matrix[i];
    const lineNumber = i + 1;

    // 빈 줄 스킵
    if (r.every((c) => c.trim() === "")) continue;

    const employeeNo = (r[idxEmp] ?? "").trim();
    const workDate = (r[idxDate] ?? "").trim();
    const checkIn = (r[idxIn] ?? "").trim();
    const checkOut = (r[idxOut] ?? "").trim();
    const nightStr = idxNight >= 0 ? (r[idxNight] ?? "").trim() : "";
    const holidayStr = idxHoliday >= 0 ? (r[idxHoliday] ?? "").trim() : "";
    const note = idxNote >= 0 ? (r[idxNote] ?? "").trim() : "";

    if (!employeeNo) {
      errors.push({ lineNumber, error: "사번이 비어있습니다." });
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
      errors.push({
        lineNumber,
        error: `일자 형식 오류 (YYYY-MM-DD 필요): "${workDate}"`,
      });
      continue;
    }
    if (!/^\d{1,2}:\d{2}$/.test(checkIn)) {
      errors.push({
        lineNumber,
        error: `출근 시간 형식 오류 (HH:MM 필요): "${checkIn}"`,
      });
      continue;
    }
    if (!/^\d{1,2}:\d{2}$/.test(checkOut)) {
      errors.push({
        lineNumber,
        error: `퇴근 시간 형식 오류 (HH:MM 필요): "${checkOut}"`,
      });
      continue;
    }

    const nightHours = parseHoursCell(nightStr);
    if (nightHours === null) {
      errors.push({ lineNumber, error: `야간 시간 오류: "${nightStr}"` });
      continue;
    }
    const holidayHours = parseHoursCell(holidayStr);
    if (holidayHours === null) {
      errors.push({ lineNumber, error: `휴일 시간 오류: "${holidayStr}"` });
      continue;
    }

    rows.push({
      employeeNo,
      workDate,
      checkIn,
      checkOut,
      nightHours,
      holidayHours,
      note: note === "" ? null : note,
    });
  }

  return { rows, errors };
}

function parseHoursCell(s: string): number | null {
  if (s === "") return 0;
  const n = Number(s);
  if (Number.isNaN(n) || n < 0 || n > 24) return null;
  return n;
}

/**
 * RFC 4180 호환 CSV 파서 — BOM, CRLF, 따옴표 안 콤마/줄바꿈, "" 이스케이프 처리.
 * 라이브러리 의존 없이 단일 파일로 유지.
 */
function parseCSVMatrix(text: string): string[][] {
  let src = text;
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1); // BOM

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1;
      continue;
    }
    if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 1;
      continue;
    }
    cell += c;
    i += 1;
  }

  // 마지막 셀/행
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/** 양식 다운로드용 텍스트 (헤더 + 예시 1행). */
export const ATTENDANCE_CSV_TEMPLATE = [
  [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS].join(","),
  "DEV-1042,2026-04-01,09:00,18:00,0,0,",
].join("\r\n");
