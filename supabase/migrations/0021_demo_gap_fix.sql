-- ============================================================
-- 0021 — 데이터 갭 종합 메우기
--
-- 검사 후 부족한 영역만 보강. 모두 idempotent (이미 있으면 skip).
--
-- 1. assets 10건 (없을 때만)
-- 2. leave_balances 2026 (각 활성 직원, 일부는 사용률 < 30% 로 촉진 대상)
-- 3. financial_facts 2026-05 (임원 대시보드 재무지표)
-- 4. vendors 추가 (5건 미만이면)
-- ============================================================

-- 1. ASSETS 10건 (테이블이 비어있으면)
DO $$
DECLARE
  v_emp_id uuid;
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM chongmu.assets;
  IF v_count > 0 THEN
    RAISE NOTICE '자산 % 건 이미 존재 — skip', v_count;
    RETURN;
  END IF;

  -- 활성 직원 1명 (담당자 배정용)
  SELECT id INTO v_emp_id FROM chongmu.employees
  WHERE status='active' ORDER BY hire_date LIMIT 1;

  -- IT 기기 5대 (각 직원 분배)
  INSERT INTO chongmu.assets (asset_no, name, category, acquisition_date, acquisition_cost, useful_life, assigned_to, location, status, memo) VALUES
    ('A001', 'MacBook Pro 14" M3', 'it_device', '2024-03-15', 3500000, 4, v_emp_id, '본사 5F', 'in_use', '개발팀 메인 노트북'),
    ('A002', 'Dell Monitor 27" 4K', 'it_device', '2024-03-15', 850000, 5, v_emp_id, '본사 5F', 'in_use', NULL),
    ('A003', 'iMac M3 24"', 'it_device', '2023-08-10', 2200000, 4, NULL, '본사 4F', 'in_use', '디자이너 공용'),
    ('A004', 'iPad Pro 12.9"', 'it_device', '2024-06-20', 1800000, 4, NULL, '회의실 A', 'in_use', '회의용'),
    ('A005', 'HP LaserJet Pro', 'it_device', '2022-01-15', 450000, 5, NULL, '본사 5F', 'in_use', '복합기 (만료 임박)');

  -- 사무가구 3대
  INSERT INTO chongmu.assets (asset_no, name, category, acquisition_date, acquisition_cost, useful_life, assigned_to, location, status) VALUES
    ('A006', '사무용 책상 (대형)', 'furniture', '2023-01-15', 350000, 8, NULL, '본사 5F', 'in_use'),
    ('A007', '회의 테이블', 'furniture', '2022-12-01', 1200000, 10, NULL, '회의실 A', 'in_use'),
    ('A008', '책장 세트', 'furniture', '2023-04-10', 280000, 8, NULL, '본사 4F', 'in_use');

  -- 차량 1대
  INSERT INTO chongmu.assets (asset_no, name, category, acquisition_date, acquisition_cost, useful_life, location, status, memo) VALUES
    ('A009', '업무용 차량 (소나타)', 'vehicle', '2022-06-01', 32000000, 5, '주차장 B-12', 'in_use', '영업팀 공용 / 만료 임박');

  -- 폐기 처리된 자산 (시연용 — 폐기 상태 시각화)
  INSERT INTO chongmu.assets (asset_no, name, category, acquisition_date, acquisition_cost, useful_life, status, disposed_at, memo) VALUES
    ('A010', '구형 노트북 (Lenovo)', 'it_device', '2019-03-01', 1200000, 4, 'disposed', '2024-03-15', '내용연수 만료로 폐기');

  RAISE NOTICE '자산 10건 생성 완료';
END $$;

-- 2. LEAVE_BALANCES 2026 (각 활성 직원)
DO $$
DECLARE
  v_emp record;
  v_granted numeric;
  v_used numeric;
  v_count int;
  v_idx int := 0;
BEGIN
  SELECT COUNT(*) INTO v_count FROM chongmu.leave_balances WHERE year = 2026;
  IF v_count > 0 THEN
    RAISE NOTICE '2026 leave_balances % 건 이미 존재 — skip', v_count;
    RETURN;
  END IF;

  FOR v_emp IN
    SELECT id, hire_date FROM chongmu.employees
    WHERE status='active' AND deleted_at IS NULL
    ORDER BY hire_date
  LOOP
    v_idx := v_idx + 1;

    -- 발생 일수 (1년 미만 월차 ~ 3년차+ 가산)
    DECLARE
      v_years numeric;
    BEGIN
      v_years := EXTRACT(EPOCH FROM (CURRENT_DATE - v_emp.hire_date)) / (365.25 * 86400);
      IF v_years < 1 THEN
        v_granted := LEAST(11, FLOOR(v_years * 12));
      ELSIF v_years < 3 THEN
        v_granted := 15;
      ELSE
        v_granted := LEAST(25, 15 + FLOOR((v_years - 1) / 2));
      END IF;
    END;

    -- 사용률 분포: 첫 3명 < 20% (촉진 대상), 그 외 50~80%
    IF v_idx <= 3 THEN
      v_used := ROUND(v_granted * (0.05 + RANDOM() * 0.15), 1); -- 5~20%
    ELSE
      v_used := ROUND(v_granted * (0.4 + RANDOM() * 0.4), 1);   -- 40~80%
    END IF;

    INSERT INTO chongmu.leave_balances (employee_id, year, total_granted, total_used, remaining)
    VALUES (v_emp.id, 2026, v_granted, v_used, v_granted - v_used)
    ON CONFLICT (employee_id, year) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'leave_balances 2026 생성 완료';
END $$;

-- 3. FINANCIAL_FACTS — 임원 대시보드 재무지표
-- 2026-05 (현재) 와 2026-04 (전월 비교용) 입력
INSERT INTO chongmu.financial_facts (
  year, month,
  current_assets, total_assets,
  current_liabilities, total_liabilities,
  cash_and_equivalents, inventory, receivables, payables,
  notes
) VALUES
  (2026, 4,
    850000000,   -- 유동자산 8.5억
    1450000000,  -- 자산총계 14.5억
    320000000,   -- 유동부채 3.2억
    580000000,   -- 부채총계 5.8억
    420000000,   -- 현금성 4.2억
    150000000,   -- 재고 1.5억
    180000000,   -- 매출채권 1.8억
    220000000,   -- 매입채무 2.2억
    '시연용 자동 입력'
  ),
  (2026, 5,
    920000000,   -- 유동자산 9.2억 (성장)
    1520000000,  -- 자산총계
    310000000,   -- 유동부채 (감소)
    560000000,   -- 부채총계 (감소)
    480000000,   -- 현금성
    155000000,
    195000000,
    215000000,
    '시연용 자동 입력'
  )
ON CONFLICT (year, month) DO NOTHING;

-- 4. VENDORS 추가 (5건 미만이면)
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM chongmu.vendors;
  IF v_count >= 5 THEN
    RAISE NOTICE '거래처 % 건 충분 — skip', v_count;
    RETURN;
  END IF;

  INSERT INTO chongmu.vendors (name, business_no, category, contact_person, phone, email, contract_start, contract_end, memo) VALUES
    ('AWS Korea', '120-86-12345', 'supplier', '클라우드팀', '02-1234-5678', 'sales@aws.co.kr', '2025-09-01', '2026-08-31', '클라우드 서비스 (만료 임박)'),
    ('오피스플러스', '215-81-23456', 'supplier', '김영업', '02-2345-6789', NULL, '2025-04-15', '2026-04-14', 'OA 비품 공급 (만료됨)'),
    ('시큐리티프로', '305-86-34567', 'partner', '박과장', '02-3456-7890', NULL, '2025-06-01', '2026-05-31', '경비 용역 (D-30)'),
    ('네오비트', '410-81-45678', 'customer', '이대표', '02-4567-8901', 'ceo@neobit.kr', '2025-01-01', '2026-12-31', '주요 고객사'),
    ('한솔디자인', '125-43-56789', 'partner', '최실장', '02-5678-9012', NULL, NULL, NULL, '디자인 외주')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '거래처 5건 추가 완료';
END $$;

-- 검증
DO $$
DECLARE
  v_assets int; v_lb int; v_ff int; v_vendors int;
BEGIN
  SELECT COUNT(*) INTO v_assets FROM chongmu.assets;
  SELECT COUNT(*) INTO v_lb FROM chongmu.leave_balances WHERE year=2026;
  SELECT COUNT(*) INTO v_ff FROM chongmu.financial_facts;
  SELECT COUNT(*) INTO v_vendors FROM chongmu.vendors;

  RAISE NOTICE '=== 0021 갭 메우기 완료 ===';
  RAISE NOTICE '자산: %건', v_assets;
  RAISE NOTICE 'leave_balances 2026: %건', v_lb;
  RAISE NOTICE 'financial_facts: %건', v_ff;
  RAISE NOTICE 'vendors: %건', v_vendors;
END $$;

NOTIFY pgrst, 'reload schema';
