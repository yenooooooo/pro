-- ============================================================
-- 0018 — G2 회계 시스템 골격 (Accounting Scaffold)
--
-- 풀 회계 시스템 (분개·원장·시산표·재무제표) 기반.
-- 본 마이그레이션은 핵심 테이블 + 표준 계정과목 시드만 포함.
-- 자동 분개 룰·재무제표 자동 생성은 lib/accounting/ 에서 처리.
--
-- 회계 등식: 자산 = 부채 + 자본
-- 분개 등식: 차변 합계 = 대변 합계
-- ============================================================

-- ── 계정과목 (Chart of Accounts) ──────────────────────────
CREATE TABLE IF NOT EXISTS chongmu.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,                  -- 예: '1010' (현금), '5110' (급여)
  name text NOT NULL,                          -- 한글명
  name_en text,                                -- 영문명
  type text NOT NULL CHECK (type IN (
    'asset',       -- 자산
    'liability',   -- 부채
    'equity',      -- 자본
    'revenue',     -- 수익
    'expense'      -- 비용
  )),
  /** 정상 잔액 방향: 자산·비용=차변(debit), 부채·자본·수익=대변(credit) */
  normal_side text NOT NULL CHECK (normal_side IN ('debit', 'credit')),
  parent_id uuid REFERENCES chongmu.chart_of_accounts(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coa_type_idx
  ON chongmu.chart_of_accounts (type);

-- ── 분개 (Journal Entries) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS chongmu.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  entry_no text,                               -- '202604-001' 같은 일련번호
  description text NOT NULL,
  /** 자동 분개의 출처 */
  source_type text CHECK (source_type IN (
    'manual', 'payroll', 'expense', 'asset', 'revenue', 'closing'
  )),
  source_id uuid,                              -- 원천 데이터의 id (예: payroll.id)
  is_posted boolean NOT NULL DEFAULT false,    -- 마감 처리 여부
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_entries_date_idx
  ON chongmu.journal_entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS journal_entries_source_idx
  ON chongmu.journal_entries (source_type, source_id);

CREATE TRIGGER journal_entries_set_updated_at
  BEFORE UPDATE ON chongmu.journal_entries
  FOR EACH ROW EXECUTE FUNCTION chongmu.set_updated_at();

-- ── 분개 라인 (Journal Lines) ──────────────────────────────
-- 한 분개에 차변·대변 라인 N개 (보통 2~수십개).
-- 합계 검증: 같은 entry_id 의 debit 합 = credit 합.
CREATE TABLE IF NOT EXISTS chongmu.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES chongmu.journal_entries(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  account_id uuid NOT NULL REFERENCES chongmu.chart_of_accounts(id) ON DELETE RESTRICT,
  side text NOT NULL CHECK (side IN ('debit', 'credit')),
  amount integer NOT NULL CHECK (amount >= 0),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, line_no)
);

CREATE INDEX IF NOT EXISTS journal_lines_entry_idx
  ON chongmu.journal_lines (entry_id);
CREATE INDEX IF NOT EXISTS journal_lines_account_idx
  ON chongmu.journal_lines (account_id);

-- ── 분개 등식 검증 함수 ────────────────────────────────────
-- 한 분개의 차변 합 = 대변 합 검증. 화면에서 호출.
CREATE OR REPLACE FUNCTION chongmu.is_balanced_entry(eid uuid)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    SUM(CASE WHEN side='debit' THEN amount ELSE 0 END), 0
  ) = COALESCE(
    SUM(CASE WHEN side='credit' THEN amount ELSE 0 END), 0
  )
  FROM chongmu.journal_lines
  WHERE entry_id = eid;
$$;

-- RLS
ALTER TABLE chongmu.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chongmu.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chongmu.journal_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_coa" ON chongmu.chart_of_accounts;
CREATE POLICY "auth_coa"
  ON chongmu.chart_of_accounts
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_journal_entries" ON chongmu.journal_entries;
CREATE POLICY "auth_journal_entries"
  ON chongmu.journal_entries
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_journal_lines" ON chongmu.journal_lines;
CREATE POLICY "auth_journal_lines"
  ON chongmu.journal_lines
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON
  chongmu.chart_of_accounts, chongmu.journal_entries, chongmu.journal_lines
  TO authenticated;
GRANT ALL ON
  chongmu.chart_of_accounts, chongmu.journal_entries, chongmu.journal_lines
  TO service_role;

-- ── 표준 계정과목 시드 (한국 일반기업회계기준 약식) ──────────
INSERT INTO chongmu.chart_of_accounts (code, name, name_en, type, normal_side) VALUES
  -- 자산 (1xxx)
  ('1010', '현금', 'Cash', 'asset', 'debit'),
  ('1020', '보통예금', 'Bank Account', 'asset', 'debit'),
  ('1110', '매출채권', 'Accounts Receivable', 'asset', 'debit'),
  ('1210', '재고자산', 'Inventory', 'asset', 'debit'),
  ('1510', '비품', 'Office Equipment', 'asset', 'debit'),
  ('1520', '차량운반구', 'Vehicles', 'asset', 'debit'),
  ('1599', '감가상각누계액', 'Accumulated Depreciation', 'asset', 'credit'),

  -- 부채 (2xxx)
  ('2010', '미지급금', 'Accounts Payable', 'liability', 'credit'),
  ('2020', '미지급비용', 'Accrued Expenses', 'liability', 'credit'),
  ('2030', '예수금', 'Withholding Liability', 'liability', 'credit'),
  ('2040', '미지급세금', 'Taxes Payable', 'liability', 'credit'),
  ('2110', '단기차입금', 'Short-term Debt', 'liability', 'credit'),
  ('2210', '퇴직급여충당부채', 'Retirement Provision', 'liability', 'credit'),

  -- 자본 (3xxx)
  ('3010', '자본금', 'Capital Stock', 'equity', 'credit'),
  ('3020', '이익잉여금', 'Retained Earnings', 'equity', 'credit'),

  -- 수익 (4xxx)
  ('4010', '매출', 'Sales Revenue', 'revenue', 'credit'),
  ('4020', '서비스매출', 'Service Revenue', 'revenue', 'credit'),

  -- 비용 (5xxx)
  ('5110', '급여', 'Salary Expense', 'expense', 'debit'),
  ('5111', '상여금', 'Bonus Expense', 'expense', 'debit'),
  ('5120', '퇴직급여', 'Retirement Benefit', 'expense', 'debit'),
  ('5210', '복리후생비', 'Welfare Expense', 'expense', 'debit'),
  ('5310', '지급수수료', 'Service Fee', 'expense', 'debit'),
  ('5410', '임차료', 'Rent Expense', 'expense', 'debit'),
  ('5510', '여비교통비', 'Travel Expense', 'expense', 'debit'),
  ('5610', '소모품비', 'Supplies Expense', 'expense', 'debit'),
  ('5710', '광고선전비', 'Advertising Expense', 'expense', 'debit'),
  ('5810', '감가상각비', 'Depreciation Expense', 'expense', 'debit'),
  ('5910', '기타비용', 'Other Expenses', 'expense', 'debit')
ON CONFLICT (code) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- G3 멀티테넌시 인프라 (스텁)
-- ──────────────────────────────────────────────────────────
-- 미래의 v2 멀티테넌시 도입을 위한 companies 테이블만 미리 마련.
-- 모든 기존 테이블에 company_id 추가는 v2 별도 마이그레이션 (큰 작업).
-- 본 마이그레이션은 회사 정보 1개 등록 가능한 정도까지만.

CREATE TABLE IF NOT EXISTS chongmu.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_no text UNIQUE,                     -- 사업자등록번호
  representative text,                          -- 대표자
  address text,
  phone text,
  email text,
  fiscal_year_start_month int DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chongmu.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_companies" ON chongmu.companies;
CREATE POLICY "auth_companies"
  ON chongmu.companies
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.companies TO authenticated;
GRANT ALL ON chongmu.companies TO service_role;

CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON chongmu.companies
  FOR EACH ROW EXECUTE FUNCTION chongmu.set_updated_at();

-- 기본 회사 1개 자동 생성 (v1 단일 회사 가정)
INSERT INTO chongmu.companies (name, business_no, fiscal_year_start_month)
VALUES ('Nexus ERP 운영회사', NULL, 1)
ON CONFLICT (business_no) DO NOTHING;

NOTIFY pgrst, 'reload schema';
