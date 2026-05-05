-- ============================================================
-- 0010 — 데모용 1년치 시나리오 데이터
--
-- 기존 seed.sql 의 3개월(2026-02~04) 데이터에 더해 9개월(2025-05~2026-01)
-- 분량의 attendance / payroll / expenses 를 generate_series 로 일괄 생성.
--
-- 멱등성: ON CONFLICT DO NOTHING. 재실행해도 중복 INSERT 없음.
--
-- 데모 계정으로 입장한 면접관/방문자에게 풍성한 1년치 운영 모습 (트렌드 차트,
-- 부서별 인건비, 결산 이력) 을 즉시 보여주기 위한 데이터.
-- ============================================================

-- ── 1. attendance — 9개월 평일별 자동 생성 ────────────────────────
-- 직원당 평일마다 정규 8h + 랜덤 OT 0~3h (월말 추가 OT 시즌성)
DO $$
DECLARE
  emp record;
  d date;
BEGIN
  FOR emp IN SELECT id FROM chongmu.employees WHERE deleted_at IS NULL LOOP
    FOR d IN
      SELECT day::date
      FROM generate_series(
        '2025-05-01'::date,
        '2026-01-31'::date,
        '1 day'::interval
      ) day
      WHERE EXTRACT(DOW FROM day) BETWEEN 1 AND 5  -- 평일만
    LOOP
      INSERT INTO chongmu.attendance (
        employee_id, work_date,
        check_in, check_out,
        regular_hours, overtime_hours, night_hours, holiday_hours
      ) VALUES (
        emp.id,
        d,
        '09:00'::time,
        ('18:00'::time + (FLOOR(RANDOM() * 4) || ' hours')::interval)::time,
        8.0,
        -- OT: 0~3시간, 월말(25일 이후) 시 평균 1.5h 추가
        ROUND(
          (RANDOM() * 3.0 + CASE WHEN EXTRACT(DAY FROM d) >= 25 THEN 1.5 ELSE 0 END)::numeric,
          1
        ),
        -- 야간(22시 이후) — 월에 2~3회만
        CASE WHEN RANDOM() < 0.08 THEN ROUND((RANDOM() * 2.0)::numeric, 1) ELSE 0 END,
        0.0
      )
      ON CONFLICT (employee_id, work_date) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ── 2. payroll — 9개월치 (2025-05 ~ 2026-01) ────────────────────────
-- 기본급 + 평균 OT 시간 × 통상시급 × 1.5 + 식대 200,000
-- 12월은 연말 보너스로 기본급 50% 추가
INSERT INTO chongmu.payroll (
  employee_id, pay_year, pay_month,
  base_salary, overtime_pay, night_pay, holiday_pay,
  meal_allowance, position_allowance, other_allowance,
  gross_pay,
  pension_deduction, health_deduction, ltc_deduction, employment_deduction,
  income_tax, local_income_tax, other_deduction,
  total_deduction, net_pay,
  status
)
SELECT
  e.id,
  EXTRACT(YEAR FROM month_start)::int,
  EXTRACT(MONTH FROM month_start)::int,
  e.base_salary,
  -- OT pay (통상시급 × 평균 30시간 × 1.5)
  ROUND((e.base_salary / 209.0 * 30 * 1.5)::numeric, 0)::int,
  -- 야간 (작은 금액)
  ROUND((e.base_salary / 209.0 * 3 * 0.5)::numeric, 0)::int,
  0,
  200000,                                                                -- 식대
  CASE WHEN EXTRACT(MONTH FROM month_start) IN (3,9) THEN 100000 ELSE 0 END, -- 분기 직책수당
  -- 12월 보너스
  CASE WHEN EXTRACT(MONTH FROM month_start) = 12 THEN ROUND(e.base_salary * 0.5)::int ELSE 0 END,
  -- gross
  e.base_salary
    + ROUND((e.base_salary / 209.0 * 30 * 1.5)::numeric, 0)::int
    + ROUND((e.base_salary / 209.0 * 3 * 0.5)::numeric, 0)::int
    + 200000
    + (CASE WHEN EXTRACT(MONTH FROM month_start) IN (3,9) THEN 100000 ELSE 0 END)
    + (CASE WHEN EXTRACT(MONTH FROM month_start) = 12 THEN ROUND(e.base_salary * 0.5)::int ELSE 0 END),
  -- 4대보험 (보수월액의 약 9.4% 합)
  ROUND(e.base_salary * 0.045)::int,
  ROUND(e.base_salary * 0.03545)::int,
  ROUND(e.base_salary * 0.000167)::int,
  ROUND(e.base_salary * 0.009)::int,
  -- 소득세 추정 (단순 8%)
  ROUND(e.base_salary * 0.08)::int,
  ROUND(e.base_salary * 0.008)::int,
  0,
  -- total_deduction
  ROUND(e.base_salary * 0.045)::int
    + ROUND(e.base_salary * 0.03545)::int
    + ROUND(e.base_salary * 0.000167)::int
    + ROUND(e.base_salary * 0.009)::int
    + ROUND(e.base_salary * 0.08)::int
    + ROUND(e.base_salary * 0.008)::int,
  -- net_pay = gross - deductions
  (e.base_salary
    + ROUND((e.base_salary / 209.0 * 30 * 1.5)::numeric, 0)::int
    + ROUND((e.base_salary / 209.0 * 3 * 0.5)::numeric, 0)::int
    + 200000
    + (CASE WHEN EXTRACT(MONTH FROM month_start) IN (3,9) THEN 100000 ELSE 0 END)
    + (CASE WHEN EXTRACT(MONTH FROM month_start) = 12 THEN ROUND(e.base_salary * 0.5)::int ELSE 0 END))
   - (ROUND(e.base_salary * 0.045)::int
    + ROUND(e.base_salary * 0.03545)::int
    + ROUND(e.base_salary * 0.000167)::int
    + ROUND(e.base_salary * 0.009)::int
    + ROUND(e.base_salary * 0.08)::int
    + ROUND(e.base_salary * 0.008)::int),
  'paid'
FROM chongmu.employees e
CROSS JOIN generate_series('2025-05-01'::date, '2026-01-01'::date, '1 month'::interval) AS month_start
WHERE e.deleted_at IS NULL
ON CONFLICT (employee_id, pay_year, pay_month) DO NOTHING;

-- ── 3. expenses — 9개월치 풍성하게 ────────────────────────
-- 매월 약 8건, 시즌성 (3월·9월 회식 증가, 12월 송년회, 5월 워크샵)
DO $$
DECLARE
  cat_food uuid;
  cat_office uuid;
  cat_rent uuid;
  cat_travel uuid;
  cat_marketing uuid;
  cat_misc uuid;
  vendor_random uuid;
  d date;
  amt int;
  tax_rate numeric;
BEGIN
  SELECT id INTO cat_food FROM chongmu.expense_categories WHERE name LIKE '%식%' OR name LIKE '%복리%' LIMIT 1;
  SELECT id INTO cat_office FROM chongmu.expense_categories WHERE name LIKE '%비품%' OR name LIKE '%사무%' LIMIT 1;
  SELECT id INTO cat_rent FROM chongmu.expense_categories WHERE name LIKE '%임대%' LIMIT 1;
  SELECT id INTO cat_travel FROM chongmu.expense_categories WHERE name LIKE '%여비%' OR name LIKE '%교통%' LIMIT 1;
  SELECT id INTO cat_marketing FROM chongmu.expense_categories WHERE name LIKE '%광고%' OR name LIKE '%마케%' LIMIT 1;
  SELECT id INTO cat_misc FROM chongmu.expense_categories WHERE name LIKE '%기타%' LIMIT 1;

  FOR d IN
    SELECT day::date
    FROM generate_series('2025-05-01'::date, '2026-01-31'::date, '1 day'::interval) day
    WHERE RANDOM() < 0.25  -- 약 25% 확률로 지출 발생 (월 ~7건)
  LOOP
    SELECT id INTO vendor_random FROM chongmu.vendors ORDER BY RANDOM() LIMIT 1;

    -- 임대료 매월 1일
    IF EXTRACT(DAY FROM d) = 1 AND cat_rent IS NOT NULL THEN
      amt := 3500000;
      INSERT INTO chongmu.expenses (
        expense_date, category_id, vendor_id, amount, vat,
        payment_method, description, is_taxable
      ) VALUES (
        d, cat_rent, vendor_random, amt, ROUND(amt * 0.1)::int,
        'transfer', '월 사무실 임대료', true
      );
      CONTINUE;
    END IF;

    -- 일반 지출 (카테고리 랜덤)
    amt := (FLOOR(RANDOM() * 800000) + 50000)::int;

    -- 시즌성 부스트
    IF EXTRACT(MONTH FROM d) = 12 AND RANDOM() < 0.3 THEN
      -- 12월 송년회
      INSERT INTO chongmu.expenses (
        expense_date, category_id, vendor_id, amount, vat,
        payment_method, description, is_taxable
      ) VALUES (
        d, cat_food, vendor_random, 1500000, 150000,
        'card', '부서 송년회비', true
      );
    ELSIF EXTRACT(MONTH FROM d) = 5 AND RANDOM() < 0.2 THEN
      -- 5월 워크샵
      INSERT INTO chongmu.expenses (
        expense_date, category_id, vendor_id, amount, vat,
        payment_method, description, is_taxable
      ) VALUES (
        d, cat_travel, vendor_random, 2200000, 220000,
        'card', '전사 워크샵 비용', true
      );
    ELSE
      -- 일반
      INSERT INTO chongmu.expenses (
        expense_date, category_id, vendor_id, amount, vat,
        payment_method, description, is_taxable
      ) VALUES (
        d,
        CASE FLOOR(RANDOM() * 5)::int
          WHEN 0 THEN cat_food
          WHEN 1 THEN cat_office
          WHEN 2 THEN cat_travel
          WHEN 3 THEN cat_marketing
          ELSE cat_misc
        END,
        vendor_random,
        amt,
        ROUND(amt * 0.1)::int,
        CASE FLOOR(RANDOM() * 4)::int
          WHEN 0 THEN 'card'
          WHEN 1 THEN 'cash'
          WHEN 2 THEN 'transfer'
          ELSE 'card'
        END,
        '시나리오 운영 지출',
        RANDOM() < 0.85
      );
    END IF;
  END LOOP;
END $$;

-- ── 4. closing_history — 9개월 결산 진행률 (모두 완료) ────────────────────────
INSERT INTO chongmu.closing_history (year, month, task_id, is_done, completed_at)
SELECT
  EXTRACT(YEAR FROM month_start)::int,
  EXTRACT(MONTH FROM month_start)::int,
  t.id,
  true,
  (month_start + INTERVAL '8 days' + (RANDOM() * INTERVAL '5 days'))
FROM chongmu.closing_tasks t
CROSS JOIN generate_series('2025-05-01'::date, '2026-01-01'::date, '1 month'::interval) AS month_start
ON CONFLICT (year, month, task_id) DO NOTHING;
