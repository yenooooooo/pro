-- ============================================================
-- 0020 — 2026년 2~5월 데이터 확장
--
-- 0010 (시드 ~ 2026-01) 과 0019 (매출 ~ 2026-05) 사이 갭 메꾸기.
-- 임원 대시보드의 '이번 달' 비용/ROI 가 0원으로 보이는 문제 해결.
--
-- 추가:
--   - attendance: 2026-02 ~ 2026-05 (4개월)
--   - payroll:    2026-02 ~ 2026-05 (4개월)
--   - expenses:   2026-02 ~ 2026-05
--   - closing_history: 2026-02 ~ 2026-05 (모두 완료)
-- ============================================================

-- 1. attendance 2026-02 ~ 2026-05
DO $$
DECLARE emp record; d date;
BEGIN
  FOR emp IN SELECT id FROM chongmu.employees WHERE deleted_at IS NULL LOOP
    FOR d IN
      SELECT day::date
      FROM generate_series('2026-02-01'::date, '2026-05-31'::date, '1 day'::interval) day
      WHERE EXTRACT(DOW FROM day) BETWEEN 1 AND 5
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
        ROUND((RANDOM() * 3.0 + CASE WHEN EXTRACT(DAY FROM d) >= 25 THEN 1.5 ELSE 0 END)::numeric, 1),
        CASE WHEN RANDOM() < 0.08 THEN ROUND((RANDOM() * 2.0)::numeric, 1) ELSE 0 END,
        0.0
      )
      ON CONFLICT (employee_id, work_date) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 2. payroll 2026-02 ~ 2026-05
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
  ROUND((e.base_salary / 209.0 * 30 * 1.5)::numeric, 0)::int,
  ROUND((e.base_salary / 209.0 * 3 * 0.5)::numeric, 0)::int,
  0,
  200000,
  CASE WHEN EXTRACT(MONTH FROM month_start) IN (3,9) THEN 100000 ELSE 0 END,
  0,
  e.base_salary
    + ROUND((e.base_salary / 209.0 * 30 * 1.5)::numeric, 0)::int
    + ROUND((e.base_salary / 209.0 * 3 * 0.5)::numeric, 0)::int
    + 200000
    + (CASE WHEN EXTRACT(MONTH FROM month_start) IN (3,9) THEN 100000 ELSE 0 END),
  ROUND(e.base_salary * 0.045)::int,
  ROUND(e.base_salary * 0.03545)::int,
  ROUND(e.base_salary * 0.000167)::int,
  ROUND(e.base_salary * 0.009)::int,
  ROUND(e.base_salary * 0.08)::int,
  ROUND(e.base_salary * 0.008)::int,
  0,
  ROUND(e.base_salary * 0.045)::int
    + ROUND(e.base_salary * 0.03545)::int
    + ROUND(e.base_salary * 0.000167)::int
    + ROUND(e.base_salary * 0.009)::int
    + ROUND(e.base_salary * 0.08)::int
    + ROUND(e.base_salary * 0.008)::int,
  (e.base_salary
    + ROUND((e.base_salary / 209.0 * 30 * 1.5)::numeric, 0)::int
    + ROUND((e.base_salary / 209.0 * 3 * 0.5)::numeric, 0)::int
    + 200000
    + (CASE WHEN EXTRACT(MONTH FROM month_start) IN (3,9) THEN 100000 ELSE 0 END))
   - (ROUND(e.base_salary * 0.045)::int
    + ROUND(e.base_salary * 0.03545)::int
    + ROUND(e.base_salary * 0.000167)::int
    + ROUND(e.base_salary * 0.009)::int
    + ROUND(e.base_salary * 0.08)::int
    + ROUND(e.base_salary * 0.008)::int),
  -- 5월(현재월)은 draft 1건, 나머지는 paid (시연 임팩트)
  CASE WHEN EXTRACT(MONTH FROM month_start) = 5 THEN 'draft' ELSE 'paid' END
FROM chongmu.employees e
CROSS JOIN generate_series('2026-02-01'::date, '2026-05-01'::date, '1 month'::interval) AS month_start
WHERE e.deleted_at IS NULL
ON CONFLICT (employee_id, pay_year, pay_month) DO NOTHING;

-- 3. expenses 2026-02 ~ 2026-05
DO $$
DECLARE
  cat_food uuid; cat_office uuid; cat_rent uuid; cat_travel uuid; cat_marketing uuid; cat_misc uuid;
  vendor_random uuid; d date; amt int;
BEGIN
  SELECT id INTO cat_food FROM chongmu.expense_categories WHERE name LIKE '%식%' OR name LIKE '%복리%' LIMIT 1;
  SELECT id INTO cat_office FROM chongmu.expense_categories WHERE name LIKE '%비품%' OR name LIKE '%사무%' LIMIT 1;
  SELECT id INTO cat_rent FROM chongmu.expense_categories WHERE name LIKE '%임대%' LIMIT 1;
  SELECT id INTO cat_travel FROM chongmu.expense_categories WHERE name LIKE '%여비%' OR name LIKE '%교통%' LIMIT 1;
  SELECT id INTO cat_marketing FROM chongmu.expense_categories WHERE name LIKE '%광고%' OR name LIKE '%마케%' LIMIT 1;
  SELECT id INTO cat_misc FROM chongmu.expense_categories WHERE name LIKE '%기타%' LIMIT 1;

  FOR d IN
    SELECT day::date
    FROM generate_series('2026-02-01'::date, '2026-05-31'::date, '1 day'::interval) day
    WHERE RANDOM() < 0.25
  LOOP
    SELECT id INTO vendor_random FROM chongmu.vendors ORDER BY RANDOM() LIMIT 1;

    -- 임대료 매월 1일
    IF EXTRACT(DAY FROM d) = 1 AND cat_rent IS NOT NULL THEN
      amt := 3500000;
      INSERT INTO chongmu.expenses (expense_date, category_id, vendor_id, amount, vat, payment_method, description, is_taxable)
      VALUES (d, cat_rent, vendor_random, amt, ROUND(amt * 0.1)::int, 'transfer', '월 사무실 임대료', true);
      CONTINUE;
    END IF;

    amt := (FLOOR(RANDOM() * 800000) + 50000)::int;

    INSERT INTO chongmu.expenses (expense_date, category_id, vendor_id, amount, vat, payment_method, description, is_taxable)
    VALUES (
      d,
      CASE FLOOR(RANDOM() * 5)::int
        WHEN 0 THEN cat_food WHEN 1 THEN cat_office
        WHEN 2 THEN cat_travel WHEN 3 THEN cat_marketing
        ELSE cat_misc
      END,
      vendor_random, amt, ROUND(amt * 0.1)::int,
      CASE FLOOR(RANDOM() * 4)::int
        WHEN 0 THEN 'card' WHEN 1 THEN 'cash'
        WHEN 2 THEN 'transfer' ELSE 'card'
      END,
      '시연 운영 지출',
      RANDOM() < 0.85
    );
  END LOOP;
END $$;

-- 4. closing_history 2026-02 ~ 2026-04 (5월은 진행 중이라 일부만)
INSERT INTO chongmu.closing_history (year, month, task_id, is_done, completed_at)
SELECT
  EXTRACT(YEAR FROM month_start)::int,
  EXTRACT(MONTH FROM month_start)::int,
  t.id,
  true,
  (month_start + INTERVAL '8 days' + (RANDOM() * INTERVAL '5 days'))
FROM chongmu.closing_tasks t
CROSS JOIN generate_series('2026-02-01'::date, '2026-04-01'::date, '1 month'::interval) AS month_start
ON CONFLICT (year, month, task_id) DO NOTHING;

-- 5월: 8개 항목 중 5개만 완료 (진행률 시연용)
INSERT INTO chongmu.closing_history (year, month, task_id, is_done, completed_at)
SELECT 2026, 5, t.id,
  ROW_NUMBER() OVER (ORDER BY t.order_no) <= 5,
  CASE WHEN ROW_NUMBER() OVER (ORDER BY t.order_no) <= 5
       THEN now() - INTERVAL '3 days' ELSE NULL END
FROM chongmu.closing_tasks t
ON CONFLICT (year, month, task_id) DO NOTHING;

-- 검증
DO $$
DECLARE
  v_payroll_2026 int; v_expense_2026 int;
BEGIN
  SELECT COUNT(*) INTO v_payroll_2026
  FROM chongmu.payroll WHERE pay_year=2026;
  SELECT COUNT(*) INTO v_expense_2026
  FROM chongmu.expenses
  WHERE expense_date >= '2026-01-01' AND expense_date <= '2026-05-31';

  RAISE NOTICE '=== 0020 갭 메꾸기 완료 ===';
  RAISE NOTICE '2026년 급여 행: %건', v_payroll_2026;
  RAISE NOTICE '2026-01~05 지출 행: %건', v_expense_2026;
END $$;

NOTIFY pgrst, 'reload schema';
