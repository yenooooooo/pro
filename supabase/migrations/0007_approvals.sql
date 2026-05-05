-- ============================================================
-- 0007 — 전자결재 시스템
--
-- approval_requests: 결재 요청 (지출/구매/휴가/일반)
-- approval_steps: 결재선 단계별 (결재자/순서/상태/처리시각)
--
-- 휴가는 별도 leave_requests 와 분리. 본 테이블은 일반 사무 결재용.
-- ============================================================

CREATE TYPE chongmu.approval_kind AS ENUM (
  'expense',     -- 지출 발의
  'purchase',    -- 구매 발의
  'business_trip', -- 출장
  'general'      -- 일반 결재
);

CREATE TYPE chongmu.approval_status AS ENUM (
  'draft',     -- 작성 중
  'pending',   -- 결재 진행 중
  'approved',  -- 최종 승인
  'rejected',  -- 반려 (어느 단계에서든)
  'cancelled'  -- 발의자 취소
);

CREATE TYPE chongmu.approval_step_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'skipped'
);

CREATE TABLE IF NOT EXISTS chongmu.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind chongmu.approval_kind NOT NULL,
  title text NOT NULL,
  description text,
  amount integer,            -- 지출/구매 시 금액 (원)
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  requester_id uuid REFERENCES chongmu.employees(id) ON DELETE SET NULL,
  requester_email text,
  status chongmu.approval_status NOT NULL DEFAULT 'draft',
  current_step int NOT NULL DEFAULT 1, -- 1부터 시작, 모든 단계 끝나면 status='approved'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS approval_requests_status_idx
  ON chongmu.approval_requests (status);
CREATE INDEX IF NOT EXISTS approval_requests_requester_idx
  ON chongmu.approval_requests (requester_id);

CREATE TABLE IF NOT EXISTS chongmu.approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES chongmu.approval_requests(id) ON DELETE CASCADE,
  step_no int NOT NULL CHECK (step_no >= 1),
  approver_id uuid REFERENCES chongmu.employees(id) ON DELETE SET NULL,
  approver_email text NOT NULL, -- 사용자 삭제 후에도 누가 결재했는지 보존
  approver_role text,           -- "팀장", "부장" 등
  status chongmu.approval_step_status NOT NULL DEFAULT 'pending',
  comment text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, step_no)
);

CREATE INDEX IF NOT EXISTS approval_steps_request_idx
  ON chongmu.approval_steps (request_id);

ALTER TABLE chongmu.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chongmu.approval_steps ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 모두에게 R/W 허용 (MVP — RBAC는 #12에서 강화)
DROP POLICY IF EXISTS "auth_all_approvals_req" ON chongmu.approval_requests;
CREATE POLICY "auth_all_approvals_req"
  ON chongmu.approval_requests
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_all_approvals_step" ON chongmu.approval_steps;
CREATE POLICY "auth_all_approvals_step"
  ON chongmu.approval_steps
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.approval_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.approval_steps TO authenticated;
GRANT ALL ON chongmu.approval_requests, chongmu.approval_steps TO service_role;

-- updated_at 자동 갱신
CREATE TRIGGER approval_requests_set_updated_at
  BEFORE UPDATE ON chongmu.approval_requests
  FOR EACH ROW EXECUTE FUNCTION chongmu.set_updated_at();

NOTIFY pgrst, 'reload schema';
