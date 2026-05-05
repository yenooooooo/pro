/**
 * Gemini 에 넘길 DB 스키마 컨텍스트 + 안전한 쿼리 화이트리스트.
 *
 * Gemini 가 직접 SQL 을 실행하지 않고 "어떤 도메인에서 무엇을 알고 싶은지"
 * 를 JSON 으로 반환하면, 우리가 화이트리스트 기반으로 read-only 쿼리만 실행한다.
 * SQL 인젝션 위험 0.
 */

export type AllowedTable =
  | "employees"
  | "departments"
  | "attendance"
  | "payroll"
  | "leave_balances"
  | "leave_requests"
  | "expenses"
  | "expense_categories"
  | "vendors"
  | "assets";

export const SCHEMA_CONTEXT = `당신은 한국 중소기업의 ERP 데이터를 분석하는 어시스턴트입니다.
사용자가 자연어로 질문하면 아래 스키마에서 답을 찾아야 합니다.
모든 테이블은 PostgreSQL chongmu 스키마에 있고, 답변은 한국어로 합니다.

### 핵심 테이블

employees: 직원 마스터
  - id, employee_no(사번), name(이름), department_id, position_id
  - hire_date(입사일), resign_date(퇴사일)
  - base_salary(기본급, 원), dependents(부양가족수)
  - status('active' | 'leave' | 'resigned')
  - bank_name, bank_account, email, phone, birth_date

departments: 부서
  - id, name (예: '개발', '경영지원', '영업')

positions: 직급
  - id, name, level

attendance: 일별 근태
  - employee_id, work_date
  - regular_hours(정규), overtime_hours(연장), night_hours(야간), holiday_hours(휴일)
  - check_in, check_out
  - 모두 hours 단위(소수)

payroll: 월별 급여 계산 결과
  - employee_id, pay_year, pay_month
  - base_salary, overtime_pay, night_pay, holiday_pay, meal_allowance, position_allowance, other_allowance
  - gross_pay(총지급), total_deduction(공제계), net_pay(실지급)
  - pension_deduction, health_deduction, ltc_deduction, employment_deduction
  - income_tax(소득세), local_income_tax(지방소득세)
  - status('draft' | 'confirmed' | 'paid')
  - 단위는 모두 원

leave_balances: 직원별 연차 잔여
  - employee_id, year, total_granted, total_used, remaining

leave_requests: 휴가 신청·사용 기록
  - employee_id, leave_type('annual'|'sick'|'family'|'other'), start_date, end_date, days, status

expenses: 지출
  - expense_date, amount(공급가), vat(부가세), payment_method
  - category_id (expense_categories), vendor_id (vendors), description

expense_categories: 지출 카테고리
  - name (예: '임대료', '식비', '비품')

vendors: 거래처
  - name, business_no, contact_person, contract_start, contract_end

assets: 고정자산
  - asset_no, name, category, acquisition_date, acquisition_cost, useful_life, status

### 응답 형식 (반드시 JSON 만)

{
  "intent": "describe" | "aggregate" | "list" | "compare" | "unknown",
  "table": "employees" | "attendance" | "payroll" | "leave_balances" | "leave_requests" | "expenses" | "vendors" | "assets" | null,
  "filters": [
    { "column": "...", "op": "eq"|"gt"|"gte"|"lt"|"lte"|"between"|"ilike", "value": ... }
  ],
  "aggregate": { "fn": "sum"|"avg"|"count"|"max"|"min", "column": "..." } | null,
  "groupBy": "..." | null,
  "limit": number | null,
  "join": ["departments" | "positions" | "expense_categories" | "vendors"] | null,
  "explanation": "한국어로 답변 (예: '개발팀 5명 평균 기본급은 3,200,000원입니다.')"
}

### 규칙
- 사용자가 부서명·직원명·카테고리명으로 질문하면 join 으로 해결
- 금액은 원 단위 그대로
- '이번 달', '지난달', '올해' 같은 상대 시간은 today 기준으로 변환
- 추론이 어렵거나 데이터가 부족하면 intent="unknown" + explanation 에 사유
- 답변은 데이터 행 수와 함께 인사이트 한 줄 (예: '강민준의 5월 연장근로는 28h 으로 동료 평균 12h 대비 2.3배 입니다.')`;

/** 사용자 입력에서 SQL injection 패턴 차단 */
export function isSafeQuery(s: string): boolean {
  if (s.length > 500) return false;
  const blacklist = [
    /;\s*drop\s+/i,
    /;\s*delete\s+/i,
    /;\s*update\s+/i,
    /;\s*insert\s+/i,
    /;\s*alter\s+/i,
    /--\s/,
    /\/\*/,
  ];
  return !blacklist.some((p) => p.test(s));
}
