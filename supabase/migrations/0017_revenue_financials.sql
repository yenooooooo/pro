-- ============================================================
-- 0017 — 매출 + 재무지표 데이터
--
-- R3 인건비 ROI 와 R5 재무지표 자동 계산을 위한 데이터.
-- - revenue: 월별·부서별 매출
-- - financial_facts: 재무지표 추정용 추가 입력값 (유동자산/부채 등)
--   * 회계 풀 시스템(G2) 도입 전까지 수동 입력 모드.
-- ============================================================

CREATE TABLE IF NOT EXISTS chongmu.revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  department_id uuid REFERENCES chongmu.departments(id) ON DELETE SET NULL,
  amount integer NOT NULL CHECK (amount >= 0),         -- 부가세 제외 순매출
  vat integer NOT NULL DEFAULT 0 CHECK (vat >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month, department_id)
);

CREATE INDEX IF NOT EXISTS revenue_period_idx
  ON chongmu.revenue (year DESC, month DESC);
CREATE INDEX IF NOT EXISTS revenue_dept_idx
  ON chongmu.revenue (department_id);

ALTER TABLE chongmu.revenue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_revenue" ON chongmu.revenue;
CREATE POLICY "auth_revenue"
  ON chongmu.revenue
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.revenue TO authenticated;
GRANT ALL ON chongmu.revenue TO service_role;

CREATE TRIGGER revenue_set_updated_at
  BEFORE UPDATE ON chongmu.revenue
  FOR EACH ROW EXECUTE FUNCTION chongmu.set_updated_at();

-- ── 재무지표 facts (월별 스냅샷) ────────────────────────────
CREATE TABLE IF NOT EXISTS chongmu.financial_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  current_assets integer,                  -- 유동자산
  total_assets integer,                    -- 자산총계
  current_liabilities integer,             -- 유동부채
  total_liabilities integer,               -- 부채총계
  cash_and_equivalents integer,            -- 현금성 자산
  inventory integer,                       -- 재고자산
  receivables integer,                     -- 매출채권
  payables integer,                        -- 매입채무
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

ALTER TABLE chongmu.financial_facts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_financial_facts" ON chongmu.financial_facts;
CREATE POLICY "auth_financial_facts"
  ON chongmu.financial_facts
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.financial_facts TO authenticated;
GRANT ALL ON chongmu.financial_facts TO service_role;

CREATE TRIGGER financial_facts_set_updated_at
  BEFORE UPDATE ON chongmu.financial_facts
  FOR EACH ROW EXECUTE FUNCTION chongmu.set_updated_at();

NOTIFY pgrst, 'reload schema';
