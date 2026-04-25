-- supabase/migrations/0002_rls_policies.sql
-- chongmu 스키마 테이블에 대한 RLS — 인증된 사용자(관리자 1인)만 모든 CRUD.
-- 멀티테넌시·역할 구분(payroll 열람 제한 등)은 v2.
-- 근거: CLAUDE.md §8, PLAN.md §1.3.

alter table chongmu.departments enable row level security;
create policy "auth_all" on chongmu.departments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.positions enable row level security;
create policy "auth_all" on chongmu.positions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.employees enable row level security;
create policy "auth_all" on chongmu.employees for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.attendance enable row level security;
create policy "auth_all" on chongmu.attendance for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.insurance_rates enable row level security;
create policy "auth_all" on chongmu.insurance_rates for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.income_tax_table enable row level security;
create policy "auth_all" on chongmu.income_tax_table for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.payroll enable row level security;
create policy "auth_all" on chongmu.payroll for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.leave_balances enable row level security;
create policy "auth_all" on chongmu.leave_balances for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.leave_requests enable row level security;
create policy "auth_all" on chongmu.leave_requests for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.vendors enable row level security;
create policy "auth_all" on chongmu.vendors for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.expense_categories enable row level security;
create policy "auth_all" on chongmu.expense_categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.expenses enable row level security;
create policy "auth_all" on chongmu.expenses for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.assets enable row level security;
create policy "auth_all" on chongmu.assets for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.closing_tasks enable row level security;
create policy "auth_all" on chongmu.closing_tasks for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table chongmu.closing_history enable row level security;
create policy "auth_all" on chongmu.closing_history for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
