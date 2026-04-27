/**
 * Phase 4.4 — calculator 체인 통합 테스트.
 *
 * 단일 함수 단위 테스트는 각 모듈의 *.test.ts에서 검증됨.
 * 본 파일은 payroll → insurance → income-tax → net_pay 흐름이
 * 실제 ERP에서 한 직원의 월급을 산정할 때 정확히 맞물리는지를 확인한다.
 *
 * 요율과 세액표는 시드 DB에서 들어올 값과 동일한 형태(InsuranceRates / IncomeTaxRow[])로
 * 인자 주입 → caller(API route)가 같은 데이터로 부르면 같은 결과가 나온다는 점을 보장.
 */

import { describe, expect, it } from "vitest";
import { calculateGrossPay } from "./payroll";
import { calculateInsurance, type InsuranceRates } from "./insurance";
import { calculateIncomeTax, type IncomeTaxRow } from "./income-tax";

// 검증용 단순화된 요율 (실제 2026 고시값과는 다를 수 있음 — 시드 데이터에서 갱신).
const RATES_2026: InsuranceRates = {
  year: 2026,
  pensionRate: 0.045,
  healthRate: 0.035,
  ltcRate: 0.1, // 건강보험료 대비
  employmentRate: 0.009,
  pensionMinBase: 380_000,
  pensionMaxBase: 6_170_000,
};

// 검증용 간이세액표 (1인 / 4인 가구 일부 구간).
const TAX_TABLE_2026: IncomeTaxRow[] = [
  // 1인 가구
  { year: 2026, minSalary: 2_400_000, maxSalary: 2_420_000, dependents: 1, tax: 35_140 },
  { year: 2026, minSalary: 3_200_000, maxSalary: 3_220_000, dependents: 1, tax: 105_000 },
  { year: 2026, minSalary: 3_400_000, maxSalary: 3_420_000, dependents: 1, tax: 132_530 },
  // 4인 가구 (배우자 + 자녀 2)
  { year: 2026, minSalary: 4_000_000, maxSalary: 4_020_000, dependents: 4, tax: 73_280 },
];

function runChain({
  baseSalary,
  overtimeHours = 0,
  nightHours = 0,
  holidayHours = 0,
  mealAllowance = 0,
  dependents,
}: {
  baseSalary: number;
  overtimeHours?: number;
  nightHours?: number;
  holidayHours?: number;
  mealAllowance?: number;
  dependents: number;
}) {
  const gross = calculateGrossPay({
    baseSalary,
    overtimeHours,
    nightHours,
    holidayHours,
    mealAllowance,
  });
  if (!gross.success) throw new Error(`grossPay 실패: ${gross.error}`);

  const ins = calculateInsurance(gross.data.taxableIncome, RATES_2026);
  if (!ins.success) throw new Error(`insurance 실패: ${ins.error}`);

  const tax = calculateIncomeTax(
    gross.data.taxableIncome,
    dependents,
    TAX_TABLE_2026,
    2026,
  );
  // 표 미매칭은 0원 처리 (API 동작과 일치).
  const incomeTax = tax.success ? tax.data.incomeTax : 0;
  const localIncomeTax = tax.success ? tax.data.localIncomeTax : 0;

  const totalDeduction =
    ins.data.pension +
    ins.data.health +
    ins.data.ltc +
    ins.data.employment +
    incomeTax +
    localIncomeTax;

  const netPay = gross.data.grossPay - totalDeduction;

  return {
    gross: gross.data,
    insurance: ins.data,
    incomeTax,
    localIncomeTax,
    totalDeduction,
    netPay,
    taxMatched: tax.success,
  };
}

describe("통합 — CLAUDE.md §6.4 검증 케이스", () => {
  it("월 300만 + 연장 10h + 식대 20만, 부양가족 1명", () => {
    const r = runChain({
      baseSalary: 3_000_000,
      overtimeHours: 10,
      mealAllowance: 200_000,
      dependents: 1,
    });

    // 지급
    expect(r.gross.grossPay).toBe(3_415_311);
    expect(r.gross.nonTaxableTotal).toBe(200_000); // 식대 비과세 한도 내
    expect(r.gross.taxableIncome).toBe(3_215_311);

    // 4대보험 (과세소득 3,215,311 기준)
    expect(r.insurance.pension).toBe(144_689); // × 0.045
    expect(r.insurance.health).toBe(112_536); // × 0.035
    expect(r.insurance.ltc).toBe(11_254); // health × 0.1
    expect(r.insurance.employment).toBe(28_938); // × 0.009
    expect(r.insurance.total).toBe(297_417);

    // 소득세 (1인 가구, 3,215,311 → 3,200,000~3,220,000 구간)
    expect(r.taxMatched).toBe(true);
    expect(r.incomeTax).toBe(105_000);
    expect(r.localIncomeTax).toBe(10_500); // 10,500원 (10원 절사 영향 없음)

    // 실지급액 = 3,415,311 - 297,417 - 105,000 - 10,500 = 3,002,394
    expect(r.totalDeduction).toBe(412_917);
    expect(r.netPay).toBe(3_002_394);
  });
});

describe("통합 — 부양가족수에 따른 세액 차이", () => {
  it("월 400만, 부양 4인 → 1인 가구 대비 세액 낮음", () => {
    const fourPersons = runChain({
      baseSalary: 4_000_000,
      mealAllowance: 200_000,
      dependents: 4,
    });
    // 과세소득 = 4,000,000 (식대 200,000 비과세)
    expect(fourPersons.gross.taxableIncome).toBe(4_000_000);
    expect(fourPersons.taxMatched).toBe(true);
    expect(fourPersons.incomeTax).toBe(73_280);
  });
});

describe("통합 — 표 미매칭 시 fallback", () => {
  it("표에 없는 구간이면 incomeTax 0, taxMatched=false", () => {
    const r = runChain({
      baseSalary: 5_000_000, // 표에 없는 구간
      mealAllowance: 200_000,
      dependents: 1,
    });
    expect(r.taxMatched).toBe(false);
    expect(r.incomeTax).toBe(0);
    expect(r.localIncomeTax).toBe(0);
    // 4대보험은 정상 계산
    expect(r.insurance.total).toBeGreaterThan(0);
    // net_pay는 일단 산정되지만 검토 필요 (UI에서 review 표시 트리거).
    expect(r.netPay).toBeGreaterThan(0);
  });
});

describe("통합 — 신입(낮은 월급) + 연장근로 많은 직원", () => {
  it("월 240만, 부양 1, 식대 20만 → 표 매칭 + 4대보험 모두 정상", () => {
    const r = runChain({
      baseSalary: 2_400_000,
      mealAllowance: 200_000,
      dependents: 1,
    });
    // 과세소득 = 2,400,000
    expect(r.gross.taxableIncome).toBe(2_400_000);
    expect(r.taxMatched).toBe(true);
    expect(r.incomeTax).toBe(35_140);
    // 4대보험은 과세소득 기준
    expect(r.insurance.pension).toBe(108_000); // 2,400,000 × 0.045
    expect(r.insurance.health).toBe(84_000);
  });

  it("야간·휴일 가산이 grossPay → 과세 → 보험·세까지 일관", () => {
    const r = runChain({
      baseSalary: 3_000_000,
      overtimeHours: 10,
      nightHours: 4,
      holidayHours: 8,
      mealAllowance: 200_000,
      dependents: 1,
    });
    // 통상시급 14,354.07원
    // 연장 215,311 + 야간 28,708 + 휴일 172,249 = 416,268
    // grossPay = 3,000,000 + 416,268 + 200,000 = 3,616,268
    expect(r.gross.overtimePay).toBe(215_311);
    expect(r.gross.nightPay).toBe(28_708);
    expect(r.gross.holidayPay).toBe(172_249);
    expect(r.gross.grossPay).toBe(3_616_268);
    expect(r.gross.taxableIncome).toBe(3_416_268);
    // 표는 3,400,000~3,420,000에만 있어 매칭 (taxableIncome 3,416,268가 구간 내)
    expect(r.taxMatched).toBe(true);
    expect(r.incomeTax).toBe(132_530);
  });
});
