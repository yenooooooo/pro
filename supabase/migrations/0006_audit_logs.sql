-- ============================================================
-- 0006 — 감사 로그 (audit_logs)
--
-- Phase 10.2 — 민감 행위(급여 확정·직원 정보 수정·계좌 변경·퇴사 처리 등)를 별도 테이블에 보존.
-- RLS: 인증된 사용자만 INSERT, SELECT 가능. UPDATE/DELETE는 금지(불변 로그).
--
-- 근거:
--   - CLAUDE.md §1.1 #4 (감사 로그)
--   - PLAN.md §10.2 (관측성)
-- ============================================================

CREATE TABLE IF NOT EXISTS chongmu.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,                            -- 사용자 삭제 후에도 표시용으로 보존
  action text NOT NULL,                       -- 'payroll.confirmed', 'employee.resigned' 등 도메인 액션 키
  entity_type text NOT NULL,                  -- 'payroll' | 'employee' | 'expense' | ...
  entity_id text,                             -- 대상 row id (배치 작업이면 null)
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, -- 추가 컨텍스트(이전값/변경값/요약 등)
  ip_address text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS audit_logs_occurred_at_idx
  ON chongmu.audit_logs (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx
  ON chongmu.audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx
  ON chongmu.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
  ON chongmu.audit_logs (entity_type, entity_id);

ALTER TABLE chongmu.audit_logs ENABLE ROW LEVEL SECURITY;

-- INSERT: 인증된 사용자만. user_id는 auth.uid()로 강제.
DROP POLICY IF EXISTS "auth_insert_audit_logs" ON chongmu.audit_logs;
CREATE POLICY "auth_insert_audit_logs"
  ON chongmu.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- SELECT: 인증된 사용자 모두(MVP 1인 관리자 가정). v2에 admin 역할 분리.
DROP POLICY IF EXISTS "auth_select_audit_logs" ON chongmu.audit_logs;
CREATE POLICY "auth_select_audit_logs"
  ON chongmu.audit_logs
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

-- UPDATE/DELETE 정책 없음 → 불변 로그.

-- 스키마 권한
GRANT USAGE ON SCHEMA chongmu TO authenticated, anon, service_role;
GRANT SELECT, INSERT ON chongmu.audit_logs TO authenticated;
GRANT ALL ON chongmu.audit_logs TO service_role;
