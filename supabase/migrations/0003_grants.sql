-- supabase/migrations/0003_grants.sql
-- chongmu 스키마 권한 부여.
-- Supabase의 anon/authenticated/service_role 역할은 새로 생성한 스키마에
-- USAGE 및 객체 권한을 자동으로 받지 않는다 (public 스키마만 기본 부여).
-- 실제 접근 통제는 0002의 RLS 정책이 담당하므로, 여기서는 권한만 트인다.

grant usage on schema chongmu to anon, authenticated, service_role;

grant all on all tables    in schema chongmu to anon, authenticated, service_role;
grant all on all sequences in schema chongmu to anon, authenticated, service_role;
grant all on all routines  in schema chongmu to anon, authenticated, service_role;

-- 이후 추가되는 새 객체도 자동으로 권한 부여
alter default privileges in schema chongmu
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema chongmu
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema chongmu
  grant all on routines to anon, authenticated, service_role;
