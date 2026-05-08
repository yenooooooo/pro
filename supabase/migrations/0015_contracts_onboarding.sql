-- ============================================================
-- 0015 — 계약서 + 온보딩/오프보딩 체크리스트
--
-- K3: chongmu.contracts (계약서 OCR + 만료 알림)
-- K4: chongmu.onboarding_templates + chongmu.onboarding_tasks (직원별 진행)
-- K5: 오프보딩은 onboarding_tasks 의 kind='offboarding' 으로 통합
-- ============================================================

-- ── K3: 계약서 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chongmu.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES chongmu.vendors(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  contract_type text CHECK (contract_type IN (
    'service', 'supply', 'lease', 'employment', 'nda', 'other'
  )),
  amount integer,                              -- 계약 금액 (원, 선택)
  currency text DEFAULT 'KRW',
  start_date date,
  end_date date,
  signed_date date,
  parties text[] DEFAULT '{}',                 -- 당사자 (회사명 배열)
  file_url text,                               -- Storage 경로 (PDF/이미지)
  ocr_extracted jsonb DEFAULT '{}'::jsonb,     -- Gemini 추출 결과 원본
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'terminated', 'draft')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_vendor_idx
  ON chongmu.contracts (vendor_id);
CREATE INDEX IF NOT EXISTS contracts_end_date_idx
  ON chongmu.contracts (end_date) WHERE end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS contracts_status_idx
  ON chongmu.contracts (status);

ALTER TABLE chongmu.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_contracts" ON chongmu.contracts;
CREATE POLICY "auth_contracts"
  ON chongmu.contracts
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.contracts TO authenticated;
GRANT ALL ON chongmu.contracts TO service_role;

CREATE TRIGGER contracts_set_updated_at
  BEFORE UPDATE ON chongmu.contracts
  FOR EACH ROW EXECUTE FUNCTION chongmu.set_updated_at();

-- ── K4/K5: 온보딩/오프보딩 ─────────────────────────────────
-- 표준 템플릿 (회사 가이드라인) — onboarding_templates
CREATE TABLE IF NOT EXISTS chongmu.onboarding_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('onboarding', 'offboarding')),
  title text NOT NULL,
  description text,
  order_no int NOT NULL,
  category text CHECK (category IN ('asset', 'account', 'insurance', 'system', 'document', 'other')),
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, order_no)
);

ALTER TABLE chongmu.onboarding_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_onboarding_templates" ON chongmu.onboarding_templates;
CREATE POLICY "auth_onboarding_templates"
  ON chongmu.onboarding_templates
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.onboarding_templates TO authenticated;
GRANT ALL ON chongmu.onboarding_templates TO service_role;

-- 직원별 진행 — onboarding_tasks
CREATE TABLE IF NOT EXISTS chongmu.onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES chongmu.employees(id) ON DELETE CASCADE,
  template_id uuid REFERENCES chongmu.onboarding_templates(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('onboarding', 'offboarding')),
  title text NOT NULL,                          -- 템플릿 삭제돼도 제목 보존
  description text,
  category text,
  is_done boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES chongmu.employees(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_tasks_employee_idx
  ON chongmu.onboarding_tasks (employee_id, kind);
CREATE INDEX IF NOT EXISTS onboarding_tasks_done_idx
  ON chongmu.onboarding_tasks (is_done);

ALTER TABLE chongmu.onboarding_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_onboarding_tasks" ON chongmu.onboarding_tasks;
CREATE POLICY "auth_onboarding_tasks"
  ON chongmu.onboarding_tasks
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.onboarding_tasks TO authenticated;
GRANT ALL ON chongmu.onboarding_tasks TO service_role;

CREATE TRIGGER onboarding_tasks_set_updated_at
  BEFORE UPDATE ON chongmu.onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION chongmu.set_updated_at();

-- ── 표준 템플릿 시드 ────────────────────────────────────────
INSERT INTO chongmu.onboarding_templates (kind, order_no, title, description, category, required) VALUES
  ('onboarding', 1, '입사 서류 수령', '근로계약서·개인정보 동의서·서약서 수령', 'document', true),
  ('onboarding', 2, '계좌 정보 등록', '급여 입금 계좌·신원 확인', 'account', true),
  ('onboarding', 3, '4대보험 가입 신고', '국민연금/건강보험/고용보험/산재 가입 신고 (10일 이내)', 'insurance', true),
  ('onboarding', 4, '자산 지급', '노트북·모니터·키보드·유심 등 업무 자산 지급', 'asset', true),
  ('onboarding', 5, '사내 시스템 계정 생성', '이메일·메신저·ERP·이슈 트래커 등', 'system', true),
  ('onboarding', 6, '출입증/명함 발급', '출입증 등록·명함 인쇄', 'document', false),
  ('onboarding', 7, '오리엔테이션', '회사 소개·복리후생 안내·팀 소개', 'other', true),
  ('offboarding', 1, '퇴사 통보 확인', '퇴사 의사 서면 확인 (예: 사직서)', 'document', true),
  ('offboarding', 2, '인수인계서 작성', '담당 업무·자료 위치·진행 중 안건', 'document', true),
  ('offboarding', 3, '자산 회수', '노트북·모니터·유심·출입증 회수', 'asset', true),
  ('offboarding', 4, '잔여 연차 정산', '미사용 연차 수당 계산', 'other', true),
  ('offboarding', 5, '퇴직금 산정', '평균임금 × 30 × 근속/365', 'other', true),
  ('offboarding', 6, '4대보험 상실 신고', '퇴사일로부터 14일 이내', 'insurance', true),
  ('offboarding', 7, '시스템 계정 비활성화', '이메일·메신저·ERP·VPN 권한 회수', 'system', true),
  ('offboarding', 8, '명함·출입증 폐기', '회사 식별 자료 회수·폐기', 'document', false)
ON CONFLICT (kind, order_no) DO NOTHING;

NOTIFY pgrst, 'reload schema';
