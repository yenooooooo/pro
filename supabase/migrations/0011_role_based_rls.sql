-- ============================================================
-- 0011 — 역할별 RLS 정책 강화
--
-- 0009 RBAC 마이그레이션 도입 후 user_roles 테이블 기반으로
-- 민감 테이블 접근을 역할별로 제한.
--
-- 정책:
--   payroll, year_end_settlements: admin / finance / employee(본인) 만 SELECT
--   approval_requests, approval_steps: 본인이 발의자 또는 결재자 + admin/finance/hr
--   audit_logs: admin 만 SELECT (다른 역할은 본인 audit 만)
--   employees: admin / hr 는 모두, finance/employee 는 제한
--
-- 백워드 호환:
--   기존 'auth.role() = authenticated' 정책 유지하되 더 제한적인 정책 추가.
--   user_roles 에 행이 없는 사용자는 admin 폴백 (MVP 1인 운영 가정).
-- ============================================================

-- 헬퍼: 사용자 역할 조회 (RLS 정책 안에서 사용)
CREATE OR REPLACE FUNCTION chongmu.user_role_of(uid uuid)
RETURNS chongmu.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM chongmu.user_roles WHERE user_id = uid LIMIT 1),
    'admin'::chongmu.user_role  -- 폴백
  )
$$;

GRANT EXECUTE ON FUNCTION chongmu.user_role_of(uuid) TO authenticated;

-- ── payroll: admin/finance 전체 SELECT, employee 본인 데이터만 ────
DROP POLICY IF EXISTS "rbac_select_payroll" ON chongmu.payroll;
CREATE POLICY "rbac_select_payroll"
  ON chongmu.payroll
  FOR SELECT TO authenticated
  USING (
    chongmu.user_role_of(auth.uid()) IN ('admin', 'finance')
    OR (
      chongmu.user_role_of(auth.uid()) = 'employee'
      AND employee_id IN (
        SELECT id FROM chongmu.employees WHERE email = auth.email()
      )
    )
  );

DROP POLICY IF EXISTS "rbac_modify_payroll" ON chongmu.payroll;
CREATE POLICY "rbac_modify_payroll"
  ON chongmu.payroll
  FOR ALL TO authenticated
  USING (chongmu.user_role_of(auth.uid()) IN ('admin', 'finance'))
  WITH CHECK (chongmu.user_role_of(auth.uid()) IN ('admin', 'finance'));

-- ── year_end_settlements: admin/hr 전체, employee 본인 ────
DROP POLICY IF EXISTS "rbac_year_end" ON chongmu.year_end_settlements;
CREATE POLICY "rbac_year_end"
  ON chongmu.year_end_settlements
  FOR ALL TO authenticated
  USING (
    chongmu.user_role_of(auth.uid()) IN ('admin', 'hr')
    OR employee_id IN (
      SELECT id FROM chongmu.employees WHERE email = auth.email()
    )
  )
  WITH CHECK (
    chongmu.user_role_of(auth.uid()) IN ('admin', 'hr')
  );

-- ── employees: admin/hr 전체, finance 는 급여 관련 컬럼 제외 (RLS는 행단위라
-- 컬럼별 제한은 view 또는 column-level GRANT 로 별도 관리). employee 는 본인만 ────
DROP POLICY IF EXISTS "rbac_select_employees" ON chongmu.employees;
CREATE POLICY "rbac_select_employees"
  ON chongmu.employees
  FOR SELECT TO authenticated
  USING (
    chongmu.user_role_of(auth.uid()) IN ('admin', 'hr', 'finance')
    OR email = auth.email()
  );

DROP POLICY IF EXISTS "rbac_modify_employees" ON chongmu.employees;
CREATE POLICY "rbac_modify_employees"
  ON chongmu.employees
  FOR ALL TO authenticated
  USING (chongmu.user_role_of(auth.uid()) IN ('admin', 'hr'))
  WITH CHECK (chongmu.user_role_of(auth.uid()) IN ('admin', 'hr'));

-- ── approval_requests: 발의자/결재자 본인 + admin ────
DROP POLICY IF EXISTS "rbac_approval_requests" ON chongmu.approval_requests;
CREATE POLICY "rbac_approval_requests"
  ON chongmu.approval_requests
  FOR ALL TO authenticated
  USING (
    chongmu.user_role_of(auth.uid()) = 'admin'
    OR requester_email = auth.email()
    OR id IN (
      SELECT request_id FROM chongmu.approval_steps WHERE approver_email = auth.email()
    )
  )
  WITH CHECK (
    chongmu.user_role_of(auth.uid()) = 'admin'
    OR requester_email = auth.email()
  );

DROP POLICY IF EXISTS "rbac_approval_steps" ON chongmu.approval_steps;
CREATE POLICY "rbac_approval_steps"
  ON chongmu.approval_steps
  FOR ALL TO authenticated
  USING (
    chongmu.user_role_of(auth.uid()) = 'admin'
    OR approver_email = auth.email()
    OR request_id IN (
      SELECT id FROM chongmu.approval_requests WHERE requester_email = auth.email()
    )
  )
  WITH CHECK (
    chongmu.user_role_of(auth.uid()) = 'admin'
    OR approver_email = auth.email()
  );

-- ── audit_logs: 본인 액션 + admin ────
DROP POLICY IF EXISTS "auth_select_audit_logs" ON chongmu.audit_logs;
CREATE POLICY "rbac_select_audit_logs"
  ON chongmu.audit_logs
  FOR SELECT TO authenticated
  USING (
    chongmu.user_role_of(auth.uid()) = 'admin'
    OR user_id = auth.uid()
  );

-- ── 비고: 정책 강화 후에도 service_role 키는 모든 정책 우회 ────
-- 서버 사이드 스크립트(마이그레이션·배치) 는 service_role 사용 권장.

NOTIFY pgrst, 'reload schema';
