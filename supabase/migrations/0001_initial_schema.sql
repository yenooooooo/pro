-- supabase/migrations/0001_initial_schema.sql
-- 총무PRO 초기 스키마 — `chongmu` 전용 스키마에 격리.
-- 동일 Supabase 프로젝트의 다른 앱(public 스키마)과 충돌 회피.
-- 근거: PLAN.md §1.1, CLAUDE.md §5·§6.
-- 원칙:
--   1) id uuid pk + created_at + updated_at(트리거) 통일
--   2) 금액은 integer(원) 또는 numeric(...). float 금지.
--   3) FK는 ON DELETE RESTRICT 기본. assets.assigned_to만 SET NULL.
--   4) 상태값은 text + CHECK (PostgreSQL ENUM 회피).
--   5) 4대보험 요율은 보수월액 기준 근로자 부담률 — insurance_rates 주석 참조.
--   6) ★ 모든 객체는 chongmu 스키마에 생성. public은 건드리지 않음.
--   7) Supabase Dashboard > Settings > API > Exposed schemas 에 'chongmu' 추가 필수.

create schema if not exists chongmu;
set search_path = chongmu, public;

-- ─────────────────────────────────────────
-- 공통: updated_at 자동 갱신 트리거 함수
-- ─────────────────────────────────────────
create or replace function chongmu.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────
-- 부서
-- ─────────────────────────────────────────
create table chongmu.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 직급
-- ─────────────────────────────────────────
create table chongmu.positions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level int not null default 1,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 직원
-- 주의: 주민등록번호는 저장하지 않는다 (CLAUDE.md §8).
-- 계좌번호는 저장하되 화면에서 마스킹.
-- ─────────────────────────────────────────
create table chongmu.employees (
  id uuid primary key default gen_random_uuid(),
  employee_no text not null unique,
  name text not null,
  department_id uuid references chongmu.departments(id) on delete restrict,
  position_id uuid references chongmu.positions(id) on delete restrict,
  hire_date date not null,
  resign_date date,
  birth_date date,
  phone text,
  email text,
  bank_name text,
  bank_account text,
  base_salary integer not null check (base_salary >= 0),
  dependents int not null default 1 check (dependents between 1 and 11),
  status text not null default 'active'
    check (status in ('active', 'leave', 'resigned')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employees_department_idx on chongmu.employees(department_id);
create index employees_status_active_idx on chongmu.employees(status) where deleted_at is null;

create trigger employees_set_updated_at
  before update on chongmu.employees
  for each row execute function chongmu.set_updated_at();

-- ─────────────────────────────────────────
-- 근태
-- ─────────────────────────────────────────
create table chongmu.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references chongmu.employees(id) on delete restrict,
  work_date date not null,
  check_in time,
  check_out time,
  regular_hours numeric(5,2) not null default 0 check (regular_hours >= 0),
  overtime_hours numeric(5,2) not null default 0 check (overtime_hours >= 0),
  night_hours numeric(5,2) not null default 0 check (night_hours >= 0),
  holiday_hours numeric(5,2) not null default 0 check (holiday_hours >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

create index attendance_work_date_idx on chongmu.attendance(work_date);

create trigger attendance_set_updated_at
  before update on chongmu.attendance
  for each row execute function chongmu.set_updated_at();

-- ─────────────────────────────────────────
-- 4대보험 요율 (연도별)
-- 모든 rate 컬럼은 "보수월액 기준 근로자 부담률".
-- 예) pension_rate = 0.047500 → 보수월액 × 4.75% = 근로자 본인 부담 국민연금.
-- ltc_rate는 한국 공식발표값(보수월액 0.9448% 총)의 절반 = 0.004724.
-- 근거 URL은 insurance_rates.source 컬럼에 행별로 기록.
-- ─────────────────────────────────────────
create table chongmu.insurance_rates (
  id uuid primary key default gen_random_uuid(),
  year int not null unique,
  pension_rate numeric(7,6) not null,
  health_rate numeric(7,6) not null,
  ltc_rate numeric(7,6) not null,
  employment_rate numeric(7,6) not null,
  pension_min_base integer,
  pension_max_base integer,
  effective_from date,
  source text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 근로소득 간이세액표 (국세청)
-- ─────────────────────────────────────────
create table chongmu.income_tax_table (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  min_salary integer not null check (min_salary >= 0),
  max_salary integer not null,
  dependents int not null check (dependents between 1 and 11),
  tax integer not null check (tax >= 0),
  created_at timestamptz not null default now(),
  check (max_salary > min_salary)
);

create index income_tax_table_lookup_idx on chongmu.income_tax_table(year, dependents, min_salary);

-- ─────────────────────────────────────────
-- 급여 (월별)
-- ─────────────────────────────────────────
create table chongmu.payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references chongmu.employees(id) on delete restrict,
  pay_year int not null,
  pay_month int not null check (pay_month between 1 and 12),
  base_salary integer not null,
  overtime_pay integer not null default 0,
  night_pay integer not null default 0,
  holiday_pay integer not null default 0,
  meal_allowance integer not null default 0,
  position_allowance integer not null default 0,
  other_allowance integer not null default 0,
  gross_pay integer not null,
  pension_deduction integer not null default 0,
  health_deduction integer not null default 0,
  ltc_deduction integer not null default 0,
  employment_deduction integer not null default 0,
  income_tax integer not null default 0,
  local_income_tax integer not null default 0,
  other_deduction integer not null default 0,
  total_deduction integer not null,
  net_pay integer not null,
  status text not null default 'draft'
    check (status in ('draft', 'confirmed', 'paid')),
  calculated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, pay_year, pay_month)
);

create index payroll_period_idx on chongmu.payroll(pay_year, pay_month);
create index payroll_status_idx on chongmu.payroll(status);

create trigger payroll_set_updated_at
  before update on chongmu.payroll
  for each row execute function chongmu.set_updated_at();

-- ─────────────────────────────────────────
-- 연차 잔여
-- ─────────────────────────────────────────
create table chongmu.leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references chongmu.employees(id) on delete restrict,
  year int not null,
  total_granted numeric(5,1) not null check (total_granted >= 0),
  total_used numeric(5,1) not null default 0 check (total_used >= 0),
  remaining numeric(5,1) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, year)
);

create trigger leave_balances_set_updated_at
  before update on chongmu.leave_balances
  for each row execute function chongmu.set_updated_at();

-- ─────────────────────────────────────────
-- 연차 사용 기록
-- ─────────────────────────────────────────
create table chongmu.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references chongmu.employees(id) on delete restrict,
  leave_type text not null check (leave_type in ('annual', 'sick', 'family', 'other')),
  start_date date not null,
  end_date date not null,
  days numeric(3,1) not null check (days > 0),
  reason text,
  status text not null default 'approved'
    check (status in ('approved', 'rejected', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index leave_requests_employee_idx on chongmu.leave_requests(employee_id);
create index leave_requests_period_idx on chongmu.leave_requests(start_date, end_date);

create trigger leave_requests_set_updated_at
  before update on chongmu.leave_requests
  for each row execute function chongmu.set_updated_at();

-- ─────────────────────────────────────────
-- 거래처
-- ─────────────────────────────────────────
create table chongmu.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_no text,
  category text check (category in ('partner', 'supplier', 'customer', 'other')),
  contact_person text,
  phone text,
  email text,
  contract_start date,
  contract_end date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vendors_contract_end_idx on chongmu.vendors(contract_end);

create trigger vendors_set_updated_at
  before update on chongmu.vendors
  for each row execute function chongmu.set_updated_at();

-- ─────────────────────────────────────────
-- 지출 카테고리
-- ─────────────────────────────────────────
create table chongmu.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  budget_monthly integer check (budget_monthly is null or budget_monthly >= 0),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 지출
-- ─────────────────────────────────────────
create table chongmu.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category_id uuid references chongmu.expense_categories(id) on delete restrict,
  vendor_id uuid references chongmu.vendors(id) on delete restrict,
  amount integer not null check (amount >= 0),
  vat integer not null default 0 check (vat >= 0),
  payment_method text not null
    check (payment_method in ('card', 'cash', 'transfer', 'other')),
  description text,
  receipt_url text,
  is_taxable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_date_idx on chongmu.expenses(expense_date);
create index expenses_category_idx on chongmu.expenses(category_id);
create index expenses_vendor_idx on chongmu.expenses(vendor_id);

create trigger expenses_set_updated_at
  before update on chongmu.expenses
  for each row execute function chongmu.set_updated_at();

-- ─────────────────────────────────────────
-- 자산 (정액법 감가상각)
-- ─────────────────────────────────────────
create table chongmu.assets (
  id uuid primary key default gen_random_uuid(),
  asset_no text unique,
  name text not null,
  category text check (category in ('it_device', 'furniture', 'vehicle', 'equipment', 'other')),
  acquisition_date date,
  acquisition_cost integer check (acquisition_cost is null or acquisition_cost >= 0),
  useful_life int check (useful_life is null or useful_life > 0),
  assigned_to uuid references chongmu.employees(id) on delete set null,
  location text,
  status text not null default 'in_use'
    check (status in ('in_use', 'repair', 'disposed', 'sold')),
  memo text,
  disposed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_status_idx on chongmu.assets(status);
create index assets_assigned_to_idx on chongmu.assets(assigned_to);

create trigger assets_set_updated_at
  before update on chongmu.assets
  for each row execute function chongmu.set_updated_at();

-- ─────────────────────────────────────────
-- 월말결산 체크리스트 템플릿
-- ─────────────────────────────────────────
create table chongmu.closing_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  order_no int not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 월별 결산 진행 이력
-- ─────────────────────────────────────────
create table chongmu.closing_history (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  task_id uuid not null references chongmu.closing_tasks(id) on delete restrict,
  is_done boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references chongmu.employees(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, month, task_id)
);

create index closing_history_period_idx on chongmu.closing_history(year, month);

create trigger closing_history_set_updated_at
  before update on chongmu.closing_history
  for each row execute function chongmu.set_updated_at();
