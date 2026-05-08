-- ============================================================
-- 0019 — 데모용 확장 시드 (빈 페이지 채우기)
--
-- 7종 도메인 데이터 자동 생성:
--   1. 휴가 신청 이력 15건
--   2. 결재 7건 (지출/구매/출장 mix)
--   3. 연말정산 5명
--   4. 계약서 8건 (만료 임박 포함)
--   5. 출장 4건 + 영수증
--   6. 2025년 부서×월 매출
--   7. 자동 분개 (급여 일부 + 지출 일부)
--
-- 멱등성: 모든 INSERT 가 ON CONFLICT DO NOTHING 또는 EXISTS 검사.
-- 직원 ID는 동적으로 조회 (employee_no 기반).
-- ============================================================

-- ──────────────────────────────────────────
-- 1. 휴가 신청 이력 15건
-- ──────────────────────────────────────────
DO $$
DECLARE
  emp record;
  i int;
  start_d date;
  days_n int;
  status_pick text;
BEGIN
  i := 0;
  FOR emp IN
    SELECT id, name FROM chongmu.employees
    WHERE status='active' AND deleted_at IS NULL
    ORDER BY hire_date
    LIMIT 15
  LOOP
    -- 이미 휴가 신청 있는 직원은 skip
    IF EXISTS (SELECT 1 FROM chongmu.leave_requests WHERE employee_id = emp.id) THEN
      CONTINUE;
    END IF;

    -- 랜덤 신청일 (최근 6개월 내)
    start_d := (CURRENT_DATE - (FLOOR(RANDOM() * 180)::int))::date;
    days_n := FLOOR(RANDOM() * 4 + 1)::int;  -- 1~4일

    -- 상태 분배: 70% 승인, 20% 대기, 10% 반려
    IF RANDOM() < 0.7 THEN
      status_pick := 'approved';
    ELSIF RANDOM() < 0.9 THEN
      status_pick := 'pending';
    ELSE
      status_pick := 'rejected';
    END IF;

    INSERT INTO chongmu.leave_requests (
      employee_id, leave_type, start_date, end_date, days, reason, status
    ) VALUES (
      emp.id,
      CASE FLOOR(RANDOM() * 4)::int
        WHEN 0 THEN 'annual'
        WHEN 1 THEN 'annual'
        WHEN 2 THEN 'sick'
        ELSE 'family'
      END,
      start_d,
      (start_d + (days_n - 1))::date,
      days_n,
      CASE FLOOR(RANDOM() * 4)::int
        WHEN 0 THEN '개인 휴가'
        WHEN 1 THEN '병원 진료'
        WHEN 2 THEN '경조사'
        ELSE '연차 사용'
      END,
      status_pick
    );

    i := i + 1;
    EXIT WHEN i >= 15;
  END LOOP;
END $$;

-- ──────────────────────────────────────────
-- 2. 결재 7건
-- ──────────────────────────────────────────
DO $$
DECLARE
  emp_id uuid;
  emp_email text;
  req_id uuid;
  cur_status chongmu.approval_status;
  cur_kind chongmu.approval_kind;
  cur_title text;
  cur_amount int;
  cnt int;
BEGIN
  -- 첫 직원 ID 사용 (모든 결재 발의자)
  SELECT id, email INTO emp_id, emp_email
  FROM chongmu.employees
  WHERE status='active' AND email IS NOT NULL
  ORDER BY hire_date LIMIT 1;

  IF emp_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO cnt FROM chongmu.approval_requests;
  IF cnt > 0 THEN
    RETURN; -- 이미 결재 있으면 skip
  END IF;

  -- 결재 7건 생성
  FOR i IN 1..7 LOOP
    -- 다양한 유형
    cur_kind := (ARRAY['expense','purchase','business_trip','general'])[FLOOR(RANDOM()*4 + 1)::int]::chongmu.approval_kind;

    -- 상태 분포: 4 승인, 2 진행중, 1 반려
    IF i <= 4 THEN
      cur_status := 'approved';
    ELSIF i <= 6 THEN
      cur_status := 'pending';
    ELSE
      cur_status := 'rejected';
    END IF;

    cur_title := CASE cur_kind
      WHEN 'expense' THEN '협력사 미팅 식대'
      WHEN 'purchase' THEN '개발팀 노트북 구매'
      WHEN 'business_trip' THEN '서울 본사 출장'
      ELSE '내부 워크샵 비용'
    END;
    cur_amount := (FLOOR(RANDOM() * 4 + 1) * 500000)::int;

    INSERT INTO chongmu.approval_requests (
      kind, title, description, amount,
      requester_id, requester_email,
      status, current_step, completed_at
    ) VALUES (
      cur_kind,
      cur_title,
      '시연용 자동 생성 결재 건',
      cur_amount,
      emp_id, emp_email,
      cur_status,
      CASE WHEN cur_status IN ('approved','rejected') THEN 2 ELSE 1 END,
      CASE WHEN cur_status IN ('approved','rejected') THEN now() - (FLOOR(RANDOM() * 30) || ' days')::interval ELSE NULL END
    ) RETURNING id INTO req_id;

    -- 결재선 2단계
    INSERT INTO chongmu.approval_steps (request_id, step_no, approver_email, approver_role, status, decided_at, comment)
    VALUES
      (req_id, 1, 'demo@nexus-erp.app', '팀장',
       CASE WHEN cur_status = 'pending' THEN 'pending'::chongmu.approval_step_status ELSE 'approved'::chongmu.approval_step_status END,
       CASE WHEN cur_status = 'pending' THEN NULL ELSE now() - INTERVAL '5 days' END,
       CASE WHEN cur_status = 'approved' THEN '승인합니다.' WHEN cur_status = 'rejected' THEN '예산 검토 필요' ELSE NULL END),
      (req_id, 2, 'admin@nexus-erp.app', '부장',
       CASE WHEN cur_status = 'approved' THEN 'approved'::chongmu.approval_step_status
            WHEN cur_status = 'rejected' THEN 'rejected'::chongmu.approval_step_status
            ELSE 'pending'::chongmu.approval_step_status END,
       CASE WHEN cur_status IN ('approved','rejected') THEN now() - INTERVAL '2 days' ELSE NULL END,
       CASE WHEN cur_status = 'approved' THEN '최종 승인.' WHEN cur_status = 'rejected' THEN '반려: 예산 초과' ELSE NULL END);
  END LOOP;
END $$;

-- ──────────────────────────────────────────
-- 3. 연말정산 5명 (2025년 귀속)
-- ──────────────────────────────────────────
DO $$
DECLARE
  emp record;
  total_inc int;
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM chongmu.year_end_settlements WHERE year=2025;
  IF cnt > 0 THEN RETURN; END IF;

  FOR emp IN
    SELECT id, base_salary FROM chongmu.employees
    WHERE status='active' AND deleted_at IS NULL
    ORDER BY base_salary DESC LIMIT 5
  LOOP
    total_inc := emp.base_salary * 12;

    INSERT INTO chongmu.year_end_settlements (
      employee_id, year,
      spouse, children_count, elder_count, disabled_count,
      insurance_premium, medical_expense, education_expense, donation,
      housing_loan, pension_account, credit_card, cash_receipt,
      total_income, determined_tax, prepaid_tax, refund_amount,
      notes
    ) VALUES (
      emp.id, 2025,
      RANDOM() < 0.5,                                 -- 배우자
      FLOOR(RANDOM() * 3)::int,                       -- 자녀 0~2
      FLOOR(RANDOM() * 2)::int,                       -- 65세 이상 0~1
      0,
      FLOOR(RANDOM() * 800000 + 200000)::int,         -- 보험료
      FLOOR(RANDOM() * 1500000)::int,                 -- 의료비
      FLOOR(RANDOM() * 3000000)::int,                 -- 교육비
      FLOOR(RANDOM() * 500000)::int,                  -- 기부금
      0,                                              -- 주택
      FLOOR(RANDOM() * 4000000 + 1000000)::int,       -- 연금
      FLOOR(RANDOM() * 15000000 + 5000000)::int,      -- 카드
      FLOOR(RANDOM() * 3000000)::int,                 -- 현금영수증
      total_inc,
      ROUND(total_inc * 0.07)::int,                   -- 결정세액 ~7%
      ROUND(total_inc * 0.075)::int,                  -- 기납부 ~7.5%
      ROUND(total_inc * 0.005)::int,                  -- 환급 ~0.5%
      '시연 자동 입력'
    );
  END LOOP;
END $$;

-- ──────────────────────────────────────────
-- 4. 계약서 8건
-- ──────────────────────────────────────────
DO $$
DECLARE
  v_id uuid;
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM chongmu.contracts;
  IF cnt > 0 THEN RETURN; END IF;

  -- 임대차 (만료 D-15)
  SELECT id INTO v_id FROM chongmu.vendors LIMIT 1;
  INSERT INTO chongmu.contracts (vendor_id, title, contract_type, amount, start_date, end_date, signed_date, parties, status, notes)
  VALUES (v_id, '본사 사무실 임대차', 'lease', 36000000, CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE - INTERVAL '11 months', ARRAY['Nexus ERP', '랜드마크 빌딩'], 'active', '연 36백만원, 자동연장 조항 있음');

  -- 용역 (활성)
  SELECT id INTO v_id FROM chongmu.vendors OFFSET 1 LIMIT 1;
  INSERT INTO chongmu.contracts (vendor_id, title, contract_type, amount, start_date, end_date, signed_date, parties, status, notes)
  VALUES (v_id, '클라우드 서비스 (AWS)', 'service', 24000000, CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', CURRENT_DATE - INTERVAL '6 months', ARRAY['Nexus ERP', 'AWS Korea'], 'active', NULL);

  -- 공급 (활성)
  SELECT id INTO v_id FROM chongmu.vendors OFFSET 2 LIMIT 1;
  INSERT INTO chongmu.contracts (vendor_id, title, contract_type, amount, start_date, end_date, signed_date, parties, status, notes)
  VALUES (v_id, 'OA 비품 공급 계약', 'supply', 12000000, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '9 months', CURRENT_DATE - INTERVAL '3 months', ARRAY['Nexus ERP', '오피스플러스'], 'active', NULL);

  -- NDA (활성)
  SELECT id INTO v_id FROM chongmu.vendors OFFSET 3 LIMIT 1;
  INSERT INTO chongmu.contracts (vendor_id, title, contract_type, amount, start_date, end_date, signed_date, parties, status, notes)
  VALUES (v_id, '비밀유지 계약 (NDA)', 'nda', NULL, CURRENT_DATE - INTERVAL '2 years', CURRENT_DATE + INTERVAL '3 years', CURRENT_DATE - INTERVAL '2 years', ARRAY['Nexus ERP', '협력사 A'], 'active', '5년 만료');

  -- 만료 임박 (D-25)
  SELECT id INTO v_id FROM chongmu.vendors OFFSET 4 LIMIT 1;
  INSERT INTO chongmu.contracts (vendor_id, title, contract_type, amount, start_date, end_date, signed_date, parties, status, notes)
  VALUES (v_id, '경비 용역 계약', 'service', 6000000, CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE + INTERVAL '25 days', CURRENT_DATE - INTERVAL '11 months', ARRAY['Nexus ERP', '시큐리티프로'], 'active', '갱신 협의 필요');

  -- 만료됨
  SELECT id INTO v_id FROM chongmu.vendors OFFSET 5 LIMIT 1;
  INSERT INTO chongmu.contracts (vendor_id, title, contract_type, amount, start_date, end_date, signed_date, parties, status, notes)
  VALUES (v_id, '소프트웨어 라이센스 (구버전)', 'service', 8000000, CURRENT_DATE - INTERVAL '13 months', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE - INTERVAL '13 months', ARRAY['Nexus ERP', 'SoftCo'], 'expired', '교체 완료');

  -- 차량 임대 (활성)
  INSERT INTO chongmu.contracts (vendor_id, title, contract_type, amount, start_date, end_date, signed_date, parties, status, notes)
  VALUES (NULL, '업무용 차량 리스 3대', 'lease', 18000000, CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE + INTERVAL '32 months', CURRENT_DATE - INTERVAL '4 months', ARRAY['Nexus ERP', 'KT 렌탈'], 'active', '36개월 운용리스');

  -- 근로 (활성)
  INSERT INTO chongmu.contracts (vendor_id, title, contract_type, amount, start_date, end_date, signed_date, parties, status, notes)
  VALUES (NULL, '계약직 디자이너 (1년)', 'employment', 36000000, CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE + INTERVAL '7 months', CURRENT_DATE - INTERVAL '5 months', ARRAY['Nexus ERP', '계약직 직원 A'], 'active', NULL);
END $$;

-- ──────────────────────────────────────────
-- 5. 출장 4건 + 영수증
-- ──────────────────────────────────────────
DO $$
DECLARE
  emp_id uuid;
  trip_id uuid;
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM chongmu.business_trips;
  IF cnt > 0 THEN RETURN; END IF;

  -- 출장자 1
  SELECT id INTO emp_id FROM chongmu.employees WHERE status='active' ORDER BY hire_date LIMIT 1;
  IF emp_id IS NULL THEN RETURN; END IF;

  -- 정산 완료 출장
  INSERT INTO chongmu.business_trips (employee_id, title, destination, purpose, start_date, end_date, budget, status, total_settled, reimbursement_amount, settled_at)
  VALUES (emp_id, '서울 협력사 미팅', '서울 강남구', '신규 사업 미팅', CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE - INTERVAL '38 days', 800000, 'reimbursed', 752000, 48000, CURRENT_DATE - INTERVAL '35 days')
  RETURNING id INTO trip_id;

  INSERT INTO chongmu.trip_expenses (trip_id, expense_date, category, description, vendor, amount, vat, payment_method) VALUES
    (trip_id, CURRENT_DATE - INTERVAL '40 days', 'transport', 'KTX 왕복', '한국철도공사', 100000, 10000, 'card'),
    (trip_id, CURRENT_DATE - INTERVAL '40 days', 'lodging', '비즈니스 호텔 1박', '신라스테이 서울', 150000, 15000, 'card'),
    (trip_id, CURRENT_DATE - INTERVAL '40 days', 'meal', '저녁 식사', '한식당 강남점', 60000, 6000, 'card'),
    (trip_id, CURRENT_DATE - INTERVAL '39 days', 'meal', '점심 식사', '카페 골목', 30000, 3000, 'card'),
    (trip_id, CURRENT_DATE - INTERVAL '39 days', 'transport', '택시', '카카오T', 28000, 2800, 'card');

  -- 진행 중 출장
  SELECT id INTO emp_id FROM chongmu.employees WHERE status='active' ORDER BY hire_date OFFSET 1 LIMIT 1;
  INSERT INTO chongmu.business_trips (employee_id, title, destination, purpose, start_date, end_date, budget, status, total_settled)
  VALUES (emp_id, '도쿄 컨퍼런스 참석', '일본 도쿄', 'Tech 컨퍼런스 참석 + 협력사 미팅', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '2 days', 3500000, 'in_progress', 1200000)
  RETURNING id INTO trip_id;

  INSERT INTO chongmu.trip_expenses (trip_id, expense_date, category, description, vendor, amount, vat, payment_method) VALUES
    (trip_id, CURRENT_DATE - INTERVAL '3 days', 'transport', '항공권 왕복', '대한항공', 800000, 0, 'card'),
    (trip_id, CURRENT_DATE - INTERVAL '2 days', 'lodging', '비즈니스 호텔 3박', 'Tokyo Bay Hotel', 400000, 0, 'card');

  -- 신청만 (승인 대기)
  SELECT id INTO emp_id FROM chongmu.employees WHERE status='active' ORDER BY hire_date OFFSET 2 LIMIT 1;
  INSERT INTO chongmu.business_trips (employee_id, title, destination, purpose, start_date, end_date, budget, status)
  VALUES (emp_id, '부산 영업 출장', '부산 해운대구', '신규 거래처 미팅', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '8 days', 600000, 'requested');

  -- 정산 대기 (영수증 다 모았는데 정산 미완)
  SELECT id INTO emp_id FROM chongmu.employees WHERE status='active' ORDER BY hire_date OFFSET 3 LIMIT 1;
  INSERT INTO chongmu.business_trips (employee_id, title, destination, purpose, start_date, end_date, budget, status, total_settled)
  VALUES (emp_id, '대전 본부 방문', '대전 유성구', '본부 임원 회의', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '6 days', 500000, 'in_progress', 480000)
  RETURNING id INTO trip_id;

  INSERT INTO chongmu.trip_expenses (trip_id, expense_date, category, description, vendor, amount, vat, payment_method) VALUES
    (trip_id, CURRENT_DATE - INTERVAL '7 days', 'transport', 'KTX', '한국철도공사', 80000, 8000, 'card'),
    (trip_id, CURRENT_DATE - INTERVAL '7 days', 'lodging', '비즈니스 호텔', '롯데시티호텔 대전', 130000, 13000, 'card'),
    (trip_id, CURRENT_DATE - INTERVAL '7 days', 'meal', '저녁', '대전 한식당', 70000, 7000, 'card'),
    (trip_id, CURRENT_DATE - INTERVAL '6 days', 'meal', '점심', '카페', 25000, 2500, 'card'),
    (trip_id, CURRENT_DATE - INTERVAL '6 days', 'transport', '택시', '카카오T', 28000, 2800, 'card'),
    (trip_id, CURRENT_DATE - INTERVAL '6 days', 'transport', 'KTX', '한국철도공사', 80000, 8000, 'card');
END $$;

-- ──────────────────────────────────────────
-- 6. 매출 — 2025년 부서×월
-- ──────────────────────────────────────────
DO $$
DECLARE
  dept record;
  m int;
  base_amount int;
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM chongmu.revenue;
  IF cnt > 0 THEN RETURN; END IF;

  FOR dept IN SELECT id, name FROM chongmu.departments LOOP
    -- 부서별 기준 매출 (개발 가장 큼, 영업 보통, 경영지원 작음)
    base_amount := CASE
      WHEN dept.name LIKE '%개발%' THEN 80000000
      WHEN dept.name LIKE '%영업%' THEN 60000000
      WHEN dept.name LIKE '%경영%' THEN 15000000
      ELSE 30000000
    END;

    -- 12개월 분포
    FOR m IN 1..12 LOOP
      INSERT INTO chongmu.revenue (year, month, department_id, amount, vat, notes)
      VALUES (
        2025, m, dept.id,
        -- 시즌성 추가 (3·6·9·12월 +20%)
        ROUND(
          base_amount *
          (1 + (RANDOM() - 0.5) * 0.2) *
          (CASE WHEN m IN (3,6,9,12) THEN 1.2 ELSE 1 END)
        )::int,
        ROUND(base_amount * 0.1)::int,
        '시연 자동 생성'
      )
      ON CONFLICT (year, month, department_id) DO NOTHING;
    END LOOP;

    -- 2026년도 1~5월 까지
    FOR m IN 1..5 LOOP
      INSERT INTO chongmu.revenue (year, month, department_id, amount, vat, notes)
      VALUES (
        2026, m, dept.id,
        ROUND(base_amount * (1 + (RANDOM() - 0.3) * 0.25))::int,
        ROUND(base_amount * 0.1)::int,
        '시연 자동 생성'
      )
      ON CONFLICT (year, month, department_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ──────────────────────────────────────────
-- 7. 자동 분개 — 급여 5건 + 지출 5건
-- ──────────────────────────────────────────
DO $$
DECLARE
  v_account_payroll uuid;       -- 5110 급여
  v_account_payable uuid;       -- 2010 미지급금
  v_account_withhold uuid;      -- 2030 예수금
  v_account_rent uuid;          -- 5410 임차료
  v_account_meal uuid;          -- 5210 복리후생비
  v_account_supply uuid;        -- 5610 소모품비
  v_account_cash uuid;          -- 1010 현금
  v_entry uuid;
  v_payroll record;
  v_expense record;
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM chongmu.journal_entries;
  IF cnt > 0 THEN RETURN; END IF;

  SELECT id INTO v_account_payroll FROM chongmu.chart_of_accounts WHERE code='5110';
  SELECT id INTO v_account_payable FROM chongmu.chart_of_accounts WHERE code='2010';
  SELECT id INTO v_account_withhold FROM chongmu.chart_of_accounts WHERE code='2030';
  SELECT id INTO v_account_rent FROM chongmu.chart_of_accounts WHERE code='5410';
  SELECT id INTO v_account_meal FROM chongmu.chart_of_accounts WHERE code='5210';
  SELECT id INTO v_account_supply FROM chongmu.chart_of_accounts WHERE code='5610';
  SELECT id INTO v_account_cash FROM chongmu.chart_of_accounts WHERE code='1010';

  IF v_account_payroll IS NULL THEN RETURN; END IF;

  -- 급여 분개 5건 (가장 최근 급여)
  FOR v_payroll IN
    SELECT id, pay_year, pay_month, gross_pay, total_deduction, net_pay
    FROM chongmu.payroll
    WHERE status='paid'
    ORDER BY pay_year DESC, pay_month DESC
    LIMIT 5
  LOOP
    INSERT INTO chongmu.journal_entries (entry_date, description, source_type, source_id)
    VALUES (
      (v_payroll.pay_year || '-' || LPAD(v_payroll.pay_month::text, 2, '0') || '-25')::date,
      v_payroll.pay_year || '년 ' || v_payroll.pay_month || '월 급여',
      'payroll',
      v_payroll.id
    ) RETURNING id INTO v_entry;

    INSERT INTO chongmu.journal_lines (entry_id, line_no, account_id, side, amount, description) VALUES
      (v_entry, 1, v_account_payroll, 'debit', v_payroll.gross_pay, '급여'),
      (v_entry, 2, v_account_withhold, 'credit', v_payroll.total_deduction, '예수금 (4대보험·소득세)'),
      (v_entry, 3, v_account_payable, 'credit', v_payroll.net_pay, '실지급');
  END LOOP;

  -- 지출 분개 5건 (다양한 카테고리)
  FOR v_expense IN
    SELECT e.id, e.expense_date, e.amount, e.vat, e.payment_method,
           c.name AS cat_name
    FROM chongmu.expenses e
    LEFT JOIN chongmu.expense_categories c ON c.id = e.category_id
    WHERE e.amount > 0
    ORDER BY e.expense_date DESC
    LIMIT 5
  LOOP
    INSERT INTO chongmu.journal_entries (entry_date, description, source_type, source_id)
    VALUES (
      v_expense.expense_date,
      COALESCE(v_expense.cat_name, '지출') || ' 비용',
      'expense',
      v_expense.id
    ) RETURNING id INTO v_entry;

    -- 카테고리별 비용 계정
    DECLARE
      v_expense_account uuid;
      v_credit_account uuid;
    BEGIN
      v_expense_account := CASE
        WHEN v_expense.cat_name ILIKE '%임대%' THEN v_account_rent
        WHEN v_expense.cat_name ILIKE '%식%' OR v_expense.cat_name ILIKE '%복리%' THEN v_account_meal
        WHEN v_expense.cat_name ILIKE '%비품%' OR v_expense.cat_name ILIKE '%소모%' THEN v_account_supply
        ELSE v_account_supply
      END;
      v_credit_account := CASE
        WHEN v_expense.payment_method = 'cash' THEN v_account_cash
        ELSE v_account_payable
      END;

      INSERT INTO chongmu.journal_lines (entry_id, line_no, account_id, side, amount) VALUES
        (v_entry, 1, v_expense_account, 'debit', v_expense.amount),
        (v_entry, 2, v_credit_account, 'credit', v_expense.amount + v_expense.vat);

      IF v_expense.vat > 0 THEN
        -- VAT 라인은 부가세 대급 계정 없음 (간소화) → 비용에 포함
        UPDATE chongmu.journal_lines
        SET amount = v_expense.amount + v_expense.vat
        WHERE entry_id = v_entry AND line_no = 1;
      END IF;
    END;
  END LOOP;
END $$;

-- ──────────────────────────────────────────
-- 검증 메시지
-- ──────────────────────────────────────────
DO $$
DECLARE
  v_leaves int; v_approvals int; v_year_end int;
  v_contracts int; v_trips int; v_revenue int; v_journal int;
BEGIN
  SELECT COUNT(*) INTO v_leaves FROM chongmu.leave_requests;
  SELECT COUNT(*) INTO v_approvals FROM chongmu.approval_requests;
  SELECT COUNT(*) INTO v_year_end FROM chongmu.year_end_settlements;
  SELECT COUNT(*) INTO v_contracts FROM chongmu.contracts;
  SELECT COUNT(*) INTO v_trips FROM chongmu.business_trips;
  SELECT COUNT(*) INTO v_revenue FROM chongmu.revenue;
  SELECT COUNT(*) INTO v_journal FROM chongmu.journal_entries;

  RAISE NOTICE '=== 0019 데모 시드 완료 ===';
  RAISE NOTICE '휴가신청: %건', v_leaves;
  RAISE NOTICE '결재: %건', v_approvals;
  RAISE NOTICE '연말정산: %건', v_year_end;
  RAISE NOTICE '계약서: %건', v_contracts;
  RAISE NOTICE '출장: %건', v_trips;
  RAISE NOTICE '매출: %행', v_revenue;
  RAISE NOTICE '분개: %건', v_journal;
END $$;

NOTIFY pgrst, 'reload schema';
