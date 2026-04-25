-- supabase/migrations/0002_rls_policies.sql
-- MVP RLS — 인증된 사용자(관리자 1인)만 모든 CRUD.
-- 멀티테넌시·역할 구분(payroll 열람 제한 등)은 v2.
-- 근거: CLAUDE.md §8, PLAN.md §1.3.

-- ─────────────────────────────────────────
-- 매크로 대신 테이블별 명시 — 추후 정책 분리 용이.
-- ─────────────────────────────────────────

alter table departments enable row level security;
create policy "auth_all" on departments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table positions enable row level security;
create policy "auth_all" on positions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table employees enable row level security;
create policy "auth_all" on employees for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table attendance enable row level security;
create policy "auth_all" on attendance for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table insurance_rates enable row level security;
create policy "auth_all" on insurance_rates for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table income_tax_table enable row level security;
create policy "auth_all" on income_tax_table for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table payroll enable row level security;
create policy "auth_all" on payroll for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table leave_balances enable row level security;
create policy "auth_all" on leave_balances for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table leave_requests enable row level security;
create policy "auth_all" on leave_requests for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table vendors enable row level security;
create policy "auth_all" on vendors for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table expense_categories enable row level security;
create policy "auth_all" on expense_categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table expenses enable row level security;
create policy "auth_all" on expenses for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table assets enable row level security;
create policy "auth_all" on assets for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table closing_tasks enable row level security;
create policy "auth_all" on closing_tasks for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table closing_history enable row level security;
create policy "auth_all" on closing_history for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
