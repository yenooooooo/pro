-- ============================================================
-- 0009 — RBAC (Role-Based Access Control)
--
-- user_roles: auth.users 와 매핑되는 역할 테이블
--   admin    : 모든 권한
--   hr       : 직원·근태·연차·연말정산
--   finance  : 급여·지출·자산·결산·리포트
--   employee : 본인 정보·휴가 신청·급여명세서만
--
-- MVP는 1인 admin 가정. 본 마이그레이션은 v1.1 RBAC 도입의 기반.
-- 풀 RLS 정책 강화는 추후 마이그레이션에서.
-- ============================================================

CREATE TYPE chongmu.user_role AS ENUM (
  'admin',
  'hr',
  'finance',
  'employee'
);

CREATE TABLE IF NOT EXISTS chongmu.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role chongmu.user_role NOT NULL DEFAULT 'employee',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS user_roles_user_idx ON chongmu.user_roles (user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON chongmu.user_roles (role);

ALTER TABLE chongmu.user_roles ENABLE ROW LEVEL SECURITY;

-- 본인 역할만 조회 가능. 변경은 service_role 만.
DROP POLICY IF EXISTS "self_select_role" ON chongmu.user_roles;
CREATE POLICY "self_select_role"
  ON chongmu.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON chongmu.user_roles TO authenticated;
GRANT ALL ON chongmu.user_roles TO service_role;

-- 헬퍼 함수: 현재 사용자의 역할 반환
CREATE OR REPLACE FUNCTION chongmu.current_user_role()
RETURNS chongmu.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM chongmu.user_roles WHERE user_id = auth.uid()
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION chongmu.current_user_role() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 사용자 추가 시 자동으로 'employee' 역할 부여 (트리거)
-- ============================================================
CREATE OR REPLACE FUNCTION chongmu.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO chongmu.user_roles (user_id, role)
  VALUES (NEW.id, 'employee')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION chongmu.handle_new_user();
