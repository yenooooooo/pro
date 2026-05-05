/**
 * 퇴직급여 충당부채 계산.
 *
 * 근거: 근로자퇴직급여보장법 제8조
 *  - 1년 이상 근속자에게 계속근로 1년에 대해 30일분 평균임금 지급
 *  - 충당부채 = 누적 발생 퇴직급여 잔액 (재무제표 부채 항목)
 *
 * 단순 모델 (정밀 회계는 외부 PB 시스템 필요):
 *   평균임금 ≈ 직원 base_salary (월) → 일평균 = base / 30
 *   충당금 = 일평균 × 30 × 근속연수(소수)
 *          = base_salary × 근속연수
 *
 * 1년 미만은 0. 퇴사자는 제외.
 */

export type RetirementProvision = {
  employee_id: string;
  employee_no: string | null;
  name: string;
  department: string;
  hire_date: string;
  base_salary: number;
  /** 근속 일수 */
  tenure_days: number;
  /** 근속 연수 (소수, days/365.25) */
  tenure_years: number;
  /** 누적 충당금 (원) */
  provision: number;
  /** DB/DC/IRP 가입 유형 (현재는 단순 표시) */
  plan_type: "DB" | "DC" | "IRP" | "none";
};

export function calcProvision(args: {
  hire_date: string;
  base_salary: number;
  baseDate?: Date;
}): { tenure_days: number; tenure_years: number; provision: number } {
  const baseDate = args.baseDate ?? new Date();
  const hire = new Date(args.hire_date);
  const days = Math.max(
    0,
    Math.floor((baseDate.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const years = days / 365.25;
  // 1년 미만은 충당금 0 (법정 의무 없음)
  const provision = years >= 1 ? Math.round(args.base_salary * years) : 0;
  return { tenure_days: days, tenure_years: years, provision };
}
