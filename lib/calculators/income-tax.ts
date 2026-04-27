/**
 * 근로소득세(원천징수) + 지방소득세 계산.
 *
 * 근거:
 *  - 소득세법 제134조 (원천징수)
 *  - 국세청 「근로소득 간이세액표」 — 매년 고시되는 표를 그대로 DB에 적재 (`income_tax_table`)
 *  - 지방세법 제93조 — 지방소득세 = 근로소득세 × 10%, 10원 단위 절사
 *
 * 본 함수는 표 조회만 수행한다. 표 적재는 별도 ETL 스크립트가 담당.
 * CLAUDE.md §6.3 / §11-1.
 */

export type IncomeTaxRow = {
  year: number;
  /** 월급여액 이상(원) — 구간 시작. */
  minSalary: number;
  /** 월급여액 미만(원) — 구간 끝. */
  maxSalary: number;
  /** 공제대상가족수 (1~11). */
  dependents: number;
  /** 해당 구간 × 가족수 조합의 원천징수 세액 (원). */
  tax: number;
};

export type IncomeTaxResult = {
  /** 근로소득세 (원). */
  incomeTax: number;
  /** 지방소득세 (원, 10원 단위 절사). */
  localIncomeTax: number;
  /** 매칭된 표 row. 디버그/감사 로그용. */
  matchedRow: IncomeTaxRow;
};

export type CalcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const LOCAL_INCOME_TAX_RATE = 0.1;
const LOCAL_TAX_FLOOR_UNIT = 10;

/**
 * 간이세액표 조회 + 지방소득세 산정.
 *
 * @param taxableIncome 과세소득(월급여액, 원). 비과세 차감 후 금액.
 * @param dependents   공제대상가족수 (본인 포함, 1 이상).
 * @param table        해당 연도 간이세액표 전체 row.
 * @param year         조회 연도. table에서 year 일치하는 row만 사용.
 */
export function calculateIncomeTax(
  taxableIncome: number,
  dependents: number,
  table: IncomeTaxRow[],
  year: number,
): CalcResult<IncomeTaxResult> {
  if (!Number.isFinite(taxableIncome) || taxableIncome < 0) {
    return { success: false, error: "과세소득은 0 이상이어야 합니다." };
  }
  if (!Number.isInteger(dependents) || dependents < 1) {
    return { success: false, error: "공제대상가족수는 1 이상의 정수여야 합니다." };
  }
  if (!Array.isArray(table) || table.length === 0) {
    return { success: false, error: "간이세액표가 비어 있습니다." };
  }

  const matched = table.find(
    (row) =>
      row.year === year &&
      row.dependents === dependents &&
      taxableIncome >= row.minSalary &&
      taxableIncome < row.maxSalary,
  );

  if (!matched) {
    return {
      success: false,
      error: `간이세액표(${year}년·가족 ${dependents}인) 구간에 매칭되는 행이 없습니다. 과세소득=${taxableIncome}`,
    };
  }

  const incomeTax = matched.tax;
  // 지방소득세 = 소득세 × 10%, 10원 미만 절사.
  const localIncomeTax =
    Math.floor((incomeTax * LOCAL_INCOME_TAX_RATE) / LOCAL_TAX_FLOOR_UNIT) * LOCAL_TAX_FLOOR_UNIT;

  return {
    success: true,
    data: {
      incomeTax,
      localIncomeTax,
      matchedRow: matched,
    },
  };
}
