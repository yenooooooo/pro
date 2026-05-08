/**
 * 법인카드 명세서 CSV 파서.
 *
 * 한국 카드사(신한·삼성·현대 등) 명세서는 형식이 통일되지 않으므로
 * 일반적인 CSV → 컬럼 자동 매핑 (날짜/가맹점/금액). 사용자가 미리보기
 * 단계에서 수정 가능.
 */

export type ParsedExpenseRow = {
  date: string;          // YYYY-MM-DD
  merchant: string;      // 가맹점
  amount: number;        // 원 단위 (정수)
  vat: number;           // 추정치 (총액의 1/11)
  raw: Record<string, string>;
};

export type CsvParseResult = {
  rows: ParsedExpenseRow[];
  warnings: string[];
};

/**
 * 단순 CSV 파서 (RFC 4180 일부 지원: 따옴표·콤마·이스케이프).
 */
function parseCsv(text: string): string[][] {
  const result: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === ",") {
          cells.push(cur);
          cur = "";
        } else if (ch === '"') {
          inQuotes = true;
        } else {
          cur += ch;
        }
      }
    }
    cells.push(cur);
    result.push(cells.map((c) => c.trim()));
  }
  return result;
}

const DATE_HEADERS = ["일자", "거래일", "결제일", "이용일자", "사용일자", "date"];
const MERCHANT_HEADERS = ["가맹점", "거래처", "이용처", "사용처", "상호명", "merchant", "vendor"];
const AMOUNT_HEADERS = ["금액", "이용금액", "결제금액", "사용금액", "amount", "total"];

function findIndex(header: string[], candidates: string[]): number {
  for (let i = 0; i < header.length; i++) {
    const h = header[i].toLowerCase().replace(/\s/g, "");
    if (candidates.some((c) => h.includes(c.toLowerCase()))) return i;
  }
  return -1;
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
  let m = trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYYMMDD
  m = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // 2026년 4월 23일
  m = trimmed.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  return null;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s원]/g, "").replace(/^￦/, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function parseCardStatementCsv(content: string): CsvParseResult {
  const warnings: string[] = [];
  // BOM 제거
  const cleaned = content.replace(/^\uFEFF/, "");
  const grid = parseCsv(cleaned);
  if (grid.length < 2) {
    return { rows: [], warnings: ["빈 파일이거나 헤더만 있습니다."] };
  }

  const header = grid[0];
  const dateIdx = findIndex(header, DATE_HEADERS);
  const merchantIdx = findIndex(header, MERCHANT_HEADERS);
  const amountIdx = findIndex(header, AMOUNT_HEADERS);

  if (dateIdx === -1) warnings.push("일자 컬럼을 찾지 못했습니다.");
  if (merchantIdx === -1) warnings.push("가맹점 컬럼을 찾지 못했습니다.");
  if (amountIdx === -1) warnings.push("금액 컬럼을 찾지 못했습니다.");

  const rows: ParsedExpenseRow[] = [];
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    const rawObj: Record<string, string> = {};
    header.forEach((h, i) => {
      rawObj[h] = cells[i] ?? "";
    });

    const dateRaw = dateIdx >= 0 ? cells[dateIdx] : "";
    const merchant = merchantIdx >= 0 ? cells[merchantIdx] : "";
    const amountRaw = amountIdx >= 0 ? cells[amountIdx] : "";

    const date = parseDate(dateRaw);
    const amount = parseAmount(amountRaw);

    if (!date || !amount || !merchant) continue; // 잘못된 행 skip

    // VAT 추정 = total / 11 (10% 부가세 가정)
    const vat = Math.round(amount / 11);
    const supplyAmount = amount - vat;

    rows.push({
      date,
      merchant: merchant.trim(),
      amount: supplyAmount,
      vat,
      raw: rawObj,
    });
  }

  if (rows.length === 0) {
    warnings.push("유효한 데이터 행이 없습니다.");
  }

  return { rows, warnings };
}
