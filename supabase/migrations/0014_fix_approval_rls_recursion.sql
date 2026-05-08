-- ============================================================
-- 0014 — approval RLS 무한 재귀 수정
--
-- 0011 의 rbac_approval_requests / rbac_approval_steps 정책이
-- 서로를 참조해 SELECT 시 무한 재귀 ("infinite recursion detected").
--
-- 해결: SECURITY DEFINER 헬퍼 함수로 RLS 우회 → 재귀 차단.
-- ============================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "rbac_approval_requests" ON chongmu.approval_requests;
DROP POLICY IF EXISTS "rbac_approval_steps" ON chongmu.approval_steps;

-- ── 헬퍼 함수 (SECURITY DEFINER → 정책 우회) ────────────────────
CREATE OR REPLACE FUNCTION chongmu.is_approver_of_request(req_id uuid, email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chongmu.approval_steps
    WHERE request_id = req_id AND approver_email = email
  )
$$;

CREATE OR REPLACE FUNCTION chongmu.is_requester_of_step(step_request_id uuid, email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chongmu.approval_requests
    WHERE id = step_request_id AND requester_email = email
  )
$$;

GRANT EXECUTE ON FUNCTION chongmu.is_approver_of_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION chongmu.is_requester_of_step(uuid, text) TO authenticated;

-- ── 재작성된 정책 (헬퍼 함수 활용) ────────────────────────────
CREATE POLICY "rbac_approval_requests"
  ON chongmu.approval_requests
  FOR ALL TO authenticated
  USING (
    chongmu.user_role_of(auth.uid()) = 'admin'
    OR requester_email = auth.email()
    OR chongmu.is_approver_of_request(id, auth.email())
  )
  WITH CHECK (
    chongmu.user_role_of(auth.uid()) = 'admin'
    OR requester_email = auth.email()
  );

CREATE POLICY "rbac_approval_steps"
  ON chongmu.approval_steps
  FOR ALL TO authenticated
  USING (
    chongmu.user_role_of(auth.uid()) = 'admin'
    OR approver_email = auth.email()
    OR chongmu.is_requester_of_step(request_id, auth.email())
  )
  WITH CHECK (
    chongmu.user_role_of(auth.uid()) = 'admin'
    OR approver_email = auth.email()
  );

NOTIFY pgrst, 'reload schema';
