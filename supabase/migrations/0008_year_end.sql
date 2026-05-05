-- ============================================================
-- 0008 — 연말정산 (year-end tax settlement)
--
-- 직원별 연말정산 공제 항목을 보관해 연도별 정산 자료를 생성.
-- 한국 연말정산 표준 항목 + 메모 필드.
--
-- 근거: 소득세법 시행령 제45조 (인적공제 + 특별공제)
-- ============================================================

CREATE TABLE IF NOT EXISTS chongmu.year_end_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES chongmu.employees(id) ON DELETE CASCADE,
  year int NOT NULL,
  -- 인적공제
  spouse boolean NOT NULL DEFAULT false,           -- 배우자 공제
  children_count int NOT NULL DEFAULT 0,           -- 부양자녀 수
  elder_count int NOT NULL DEFAULT 0,              -- 65세 이상 부양가족
  disabled_count int NOT NULL DEFAULT 0,           -- 장애인 부양가족
  -- 특별공제 (원)
  insurance_premium integer NOT NULL DEFAULT 0,    -- 보장성보험료
  medical_expense integer NOT NULL DEFAULT 0,      -- 의료비
  education_expense integer NOT NULL DEFAULT 0,    -- 교육비
  donation integer NOT NULL DEFAULT 0,             -- 기부금
  housing_loan integer NOT NULL DEFAULT 0,         -- 주택자금
  pension_account integer NOT NULL DEFAULT 0,      -- 연금저축/IRP
  credit_card integer NOT NULL DEFAULT 0,          -- 신용카드 사용액
  cash_receipt integer NOT NULL DEFAULT 0,         -- 현금영수증
  -- 자동 계산값 (서버에서 채움 — 캐싱)
  total_income integer NOT NULL DEFAULT 0,         -- 총급여
  determined_tax integer NOT NULL DEFAULT 0,       -- 결정세액
  prepaid_tax integer NOT NULL DEFAULT 0,          -- 기납부세액
  refund_amount integer NOT NULL DEFAULT 0,        -- 환급액 (음수면 추가납부)
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, year)
);

CREATE INDEX IF NOT EXISTS year_end_year_idx
  ON chongmu.year_end_settlements (year);
CREATE INDEX IF NOT EXISTS year_end_employee_idx
  ON chongmu.year_end_settlements (employee_id);

ALTER TABLE chongmu.year_end_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_year_end" ON chongmu.year_end_settlements;
CREATE POLICY "auth_all_year_end"
  ON chongmu.year_end_settlements
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.year_end_settlements TO authenticated;
GRANT ALL ON chongmu.year_end_settlements TO service_role;

CREATE TRIGGER year_end_set_updated_at
  BEFORE UPDATE ON chongmu.year_end_settlements
  FOR EACH ROW EXECUTE FUNCTION chongmu.set_updated_at();

NOTIFY pgrst, 'reload schema';
