-- ============================================================
-- 0016 — 출장 정산 풀 모듈
--
-- business_trips: 출장 마스터 (요청자, 기간, 목적지, 예산, 상태)
-- trip_expenses: 출장 중 발생한 영수증별 지출 (카테고리, 금액, 사진)
--
-- 흐름:
--   1. 신청 (status='requested')
--   2. (선택) 결재 → status='approved'
--   3. 출장 진행 → status='in_progress'
--   4. 영수증 업로드 → trip_expenses 행 생성 (AI OCR)
--   5. 정산 → status='settled' + 총액 계산
--   6. 환급 → status='reimbursed'
-- ============================================================

CREATE TYPE chongmu.trip_status AS ENUM (
  'requested',     -- 신청 (작성 중)
  'approved',      -- 결재 승인
  'rejected',      -- 결재 반려
  'in_progress',   -- 출장 진행 중
  'settled',       -- 정산 완료 (환급 대기)
  'reimbursed',    -- 환급 완료
  'cancelled'
);

CREATE TYPE chongmu.trip_expense_category AS ENUM (
  'transport',  -- 교통 (항공·기차·택시·렌터카)
  'lodging',    -- 숙박
  'meal',       -- 식비
  'misc'        -- 기타
);

-- ── business_trips ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chongmu.business_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES chongmu.employees(id) ON DELETE RESTRICT,
  title text NOT NULL,
  destination text NOT NULL,
  purpose text,
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  budget integer NOT NULL DEFAULT 0 CHECK (budget >= 0),
  status chongmu.trip_status NOT NULL DEFAULT 'requested',
  approval_request_id uuid REFERENCES chongmu.approval_requests(id) ON DELETE SET NULL,
  total_settled integer NOT NULL DEFAULT 0,
  reimbursement_amount integer,             -- 환급 금액 (예산 - 정산액 또는 그 반대)
  settled_at timestamptz,
  reimbursed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_trips_employee_idx
  ON chongmu.business_trips (employee_id, start_date DESC);
CREATE INDEX IF NOT EXISTS business_trips_status_idx
  ON chongmu.business_trips (status);
CREATE INDEX IF NOT EXISTS business_trips_period_idx
  ON chongmu.business_trips (start_date, end_date);

ALTER TABLE chongmu.business_trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_business_trips" ON chongmu.business_trips;
CREATE POLICY "auth_business_trips"
  ON chongmu.business_trips
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.business_trips TO authenticated;
GRANT ALL ON chongmu.business_trips TO service_role;

CREATE TRIGGER business_trips_set_updated_at
  BEFORE UPDATE ON chongmu.business_trips
  FOR EACH ROW EXECUTE FUNCTION chongmu.set_updated_at();

-- ── trip_expenses ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chongmu.trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES chongmu.business_trips(id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  category chongmu.trip_expense_category NOT NULL DEFAULT 'misc',
  description text,
  vendor text,                               -- 가맹점명 (OCR 추출)
  amount integer NOT NULL CHECK (amount >= 0),
  vat integer NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'card',
  receipt_url text,                          -- Storage 경로
  ocr_metadata jsonb DEFAULT '{}'::jsonb,    -- 원본 OCR 결과
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_expenses_trip_idx
  ON chongmu.trip_expenses (trip_id, expense_date);
CREATE INDEX IF NOT EXISTS trip_expenses_category_idx
  ON chongmu.trip_expenses (category);

ALTER TABLE chongmu.trip_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_trip_expenses" ON chongmu.trip_expenses;
CREATE POLICY "auth_trip_expenses"
  ON chongmu.trip_expenses
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.trip_expenses TO authenticated;
GRANT ALL ON chongmu.trip_expenses TO service_role;

CREATE TRIGGER trip_expenses_set_updated_at
  BEFORE UPDATE ON chongmu.trip_expenses
  FOR EACH ROW EXECUTE FUNCTION chongmu.set_updated_at();

-- ── 정산 자동 갱신 함수 (trip_expenses 변경 시 trip.total_settled 재계산) ──
CREATE OR REPLACE FUNCTION chongmu.recalc_trip_total()
RETURNS TRIGGER AS $$
DECLARE
  trip_uuid uuid;
BEGIN
  trip_uuid := COALESCE(NEW.trip_id, OLD.trip_id);

  UPDATE chongmu.business_trips
  SET total_settled = COALESCE((
    SELECT SUM(amount + vat)
    FROM chongmu.trip_expenses
    WHERE trip_id = trip_uuid
  ), 0)
  WHERE id = trip_uuid;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS recalc_trip_total_trigger ON chongmu.trip_expenses;
CREATE TRIGGER recalc_trip_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON chongmu.trip_expenses
  FOR EACH ROW EXECUTE FUNCTION chongmu.recalc_trip_total();

NOTIFY pgrst, 'reload schema';
