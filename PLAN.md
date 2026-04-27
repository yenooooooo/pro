# PLAN.md — Nexus ERP 실행 계획서

> **프로덕션 완성형** 프로덕트를 목표로 한 Phase 기반 플랜. Phase별로 커밋 단위가 명확하게 나뉘도록 설계.
> **각 Phase 완료 시 체크박스 업데이트 + 간단한 회고 코멘트 작성.**
> 원래 "2주 MVP" 전제는 CLAUDE.md §1에 따라 폐기됨 — 14일 일정은 참고용이며, 완료 기준은 시간이 아니라 **품질**.

---

## 🎯 0. 프로젝트 목표 & 성공 기준

### 목표
중소기업 총무의 월간 반복 업무(직원·근태·급여·지출·자산·연차)를 하나의 웹 서비스로 통합. 엑셀 파일 10개 대신 웹앱 1개.

### MVP 성공 기준 (Definition of Done)
- [ ] 관리자 로그인 가능
- [ ] 직원 15명 샘플 데이터 기반 모든 기능 동작
- [ ] 1월 급여가 자동 계산되고 급여명세서 생성됨
- [ ] 연차 발생·사용 기록이 자동 반영됨
- [ ] 대시보드에 KPI 4종 + 차트 3종 표시
- [ ] Vercel에 배포되어 공개 URL 존재
- [ ] README에 스크린샷 4장 + 데모 GIF 포함
- [ ] 이력서·포트폴리오에 링크 추가
- [ ] **반응형 3 viewport(iPhone 14 Pro 393 / iPad Mini 768 / Desktop 1440)에서 핵심 플로우 5종(로그인·직원 조회·근태 입력·급여 계산·대시보드) 동작**

### 포트폴리오 어필 포인트
1. **법적 정확성**: 근로기준법·세법 기준으로 계산 (단순 사칙연산이 아님)
2. **데이터 연결성**: 각 모듈이 한 흐름으로 연결되어 ERP의 축소판 구조
3. **실무 이해**: 월말결산 체크리스트·연차 촉진 알림 등 "실제로 해본 사람만 아는" 기능
4. **코드 품질**: TypeScript strict + 순수 계산 함수 + 테스트

---

## 📅 1. 전체 타임라인 (14일)

| Day | Phase | 산출물 |
|---|---|---|
| 1 | Phase 0: 환경 세팅 | Next.js 초기화, Supabase 프로젝트, 레포 |
| 2 | Phase 1: DB 설계 | 마이그레이션 SQL, seed 데이터 |
| 3-4 | Phase 2: 인증 + 직원관리 | 로그인, 직원 CRUD |
| 5-6 | Phase 3: 근태 + 연차 | 근태 입력, 연차 자동계산 |
| 7-9 | Phase 4: 급여 (★핵심) | 급여 계산, 명세서 |
| 10 | Phase 5: 지출 + 거래처 + 자산 | 각 CRUD + 리스트 |
| 11 | Phase 6: 월말결산 + 대시보드 | 체크리스트, KPI, 차트 |
| 12 | Phase 7: 마감 + 배포 | 버그 수정, Vercel 배포 |
| 13 | Phase 8: 포트폴리오 자료 | README, 스크린샷, 시연 영상 |
| 14 | 예비일 | 리뷰 + 보완 |

---

## 🏗️ Phase 0 — 환경 세팅 (Day 1)

### 체크리스트
- [ ] Next.js 14 프로젝트 생성 (`create-next-app`, TypeScript, Tailwind, App Router)
- [ ] shadcn/ui 초기화
- [ ] Supabase 프로젝트 생성 (무료 tier)
- [ ] 환경변수 세팅 (`.env.local`)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)
- [ ] GitHub 레포 생성 + 첫 커밋
- [ ] Vercel 연동 (자동 배포)
- [ ] ESLint + Prettier 기본 설정
- [ ] 기본 디렉토리 구조 생성 (CLAUDE.md §4 참조)
- [ ] **stitch 디자인 토큰 주입** (CLAUDE.md §14) — `tailwind.config.ts`에 색·폰트·스페이싱 토큰 + `globals.css`에 shadcn HSL 변수 재정의 + `.glass-panel` 유틸리티
- [ ] **반응형 레이아웃 스켈레톤** (CLAUDE.md §15) — 사이드바(lg↑) / 아이콘바(md) / 하단탭(sm↓) 3모드 동작 확인
- [ ] 3가지 viewport(393 / 768 / 1440)에서 빈 페이지 렌더 OK 확인

### 설치할 패키지
```bash
# 기본
npm install @supabase/supabase-js @supabase/ssr
npm install react-hook-form zod @hookform/resolvers
npm install @tanstack/react-table recharts
npm install date-fns
npm install sonner  # 토스트
npm install lucide-react  # 아이콘
npm install clsx tailwind-merge class-variance-authority  # shadcn 필수

# 개발
npm install -D vitest @testing-library/react
npm install -D @types/node
```

### 디자인 시스템 참고
- `_design-references/` 5종의 `DESIGN.md`는 동일한 토큰 세트. CLAUDE.md §14에 핵심만 압축해 두었으므로 **주입 시 §14를 단일 출처로 사용**한다.
- 각 폴더의 `screen.png` + `code.html`은 해당 페이지의 레이아웃 레퍼런스:
  - `_design-references/01_dashboard/` → `app/(dashboard)/page.tsx`
  - `_design-references/02_payroll/` → `app/(dashboard)/payroll/page.tsx`
  - `_design-references/03_employees/` → `app/(dashboard)/employees/page.tsx`
  - `_design-references/04_closing/` → `app/(dashboard)/closing/page.tsx`
  - `_design-references/05_landing/` → `app/page.tsx` (로그인 전 랜딩)

---

## 🗄️ Phase 1 — 데이터베이스 설계 (Day 2)

### 1.1 테이블 정의 (핵심 발췌)

```sql
-- 부서
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- 직급
create table positions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level int default 1
);

-- 직원
create table employees (
  id uuid primary key default gen_random_uuid(),
  employee_no text unique not null,          -- 사번
  name text not null,
  department_id uuid references departments(id),
  position_id uuid references positions(id),
  hire_date date not null,
  resign_date date,
  birth_date date,
  phone text,
  email text,
  bank_name text,
  bank_account text,                          -- 화면에서는 마스킹
  base_salary integer not null,               -- 기본급 (원)
  dependents int default 1,                   -- 공제대상가족수
  status text check (status in ('active','leave','resigned')) default 'active',
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 근태
create table attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) not null,
  work_date date not null,
  check_in time,
  check_out time,
  regular_hours numeric(5,2) default 0,
  overtime_hours numeric(5,2) default 0,
  night_hours numeric(5,2) default 0,
  holiday_hours numeric(5,2) default 0,
  note text,
  created_at timestamptz default now(),
  unique(employee_id, work_date)
);

-- 4대보험 요율 (연도별)
create table insurance_rates (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  pension_rate numeric(5,4) not null,         -- 국민연금 (근로자)
  health_rate numeric(5,4) not null,          -- 건강보험 (근로자)
  ltc_rate numeric(5,4) not null,             -- 장기요양 (건강보험료 대비)
  employment_rate numeric(5,4) not null,      -- 고용보험 (근로자)
  pension_min_base integer,                   -- 국민연금 하한
  pension_max_base integer,                   -- 국민연금 상한
  unique(year)
);

-- 간이세액표
create table income_tax_table (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  min_salary integer not null,                -- 월급여 이상
  max_salary integer not null,                -- 월급여 미만
  dependents int not null,                    -- 공제대상가족수
  tax integer not null                        -- 세액
);

-- 급여 (월별)
create table payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) not null,
  pay_year int not null,
  pay_month int not null,                     -- 1~12
  base_salary integer not null,
  overtime_pay integer default 0,
  night_pay integer default 0,
  holiday_pay integer default 0,
  meal_allowance integer default 0,           -- 식대 (비과세 20만원까지)
  position_allowance integer default 0,
  other_allowance integer default 0,
  gross_pay integer not null,                 -- 총지급
  pension_deduction integer default 0,
  health_deduction integer default 0,
  ltc_deduction integer default 0,
  employment_deduction integer default 0,
  income_tax integer default 0,
  local_income_tax integer default 0,
  other_deduction integer default 0,
  total_deduction integer not null,
  net_pay integer not null,                   -- 실지급
  status text check (status in ('draft','confirmed','paid')) default 'draft',
  calculated_at timestamptz default now(),
  unique(employee_id, pay_year, pay_month)
);

-- 연차 잔여
create table leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) not null,
  year int not null,
  total_granted numeric(5,1) not null,        -- 발생 총량
  total_used numeric(5,1) default 0,
  remaining numeric(5,1) not null,
  unique(employee_id, year)
);

-- 연차 사용
create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) not null,
  leave_type text check (leave_type in ('annual','sick','family','other')) not null,
  start_date date not null,
  end_date date not null,
  days numeric(3,1) not null,
  reason text,
  status text check (status in ('approved','rejected','pending')) default 'approved',
  created_at timestamptz default now()
);

-- 거래처
create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_no text,                           -- 사업자번호
  contact_person text,
  phone text,
  email text,
  contract_start date,
  contract_end date,
  memo text,
  created_at timestamptz default now()
);

-- 지출 카테고리
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  budget_monthly integer                       -- 월 한도 (선택)
);

-- 지출
create table expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category_id uuid references expense_categories(id),
  vendor_id uuid references vendors(id),
  amount integer not null,
  vat integer default 0,
  payment_method text check (payment_method in ('card','cash','transfer','other')),
  description text,
  receipt_url text,                            -- Supabase Storage
  created_at timestamptz default now()
);

-- 자산
create table assets (
  id uuid primary key default gen_random_uuid(),
  asset_no text unique,
  name text not null,
  category text,                               -- IT기기/사무가구/차량 등
  acquisition_date date,
  acquisition_cost integer,
  useful_life int,                             -- 내용연수 (년)
  assigned_to uuid references employees(id),
  location text,
  status text check (status in ('in_use','repair','disposed','sold')) default 'in_use',
  memo text,
  created_at timestamptz default now()
);

-- 월말결산 체크리스트 템플릿
create table closing_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  order_no int not null,
  description text
);

-- 월별 결산 이력
create table closing_history (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null,
  task_id uuid references closing_tasks(id),
  is_done boolean default false,
  completed_at timestamptz,
  unique(year, month, task_id)
);
```

### 1.2 Seed 데이터 (필수)

`supabase/seed.sql`에 포함:
- 부서 3개 (경영지원, 영업, 개발)
- 직급 5개 (사원~이사)
- 직원 15명 (부서별 분산, 입사일 2020~2025 다양하게)
- 2026년 1월 1일 기준 `insurance_rates` 1행 (**실제 값은 공식 사이트에서 확인 후 반영**)
- 간이세액표 (1인 가구 기준 샘플 20행 이상)
- 지출 카테고리 10개 (임대료/공과금/비품/접대비/복리후생/교육/법인카드/통신/여비교통/기타)
- 거래처 8개
- 지출 3개월치 (약 60건)
- 근태 3개월치 (직원당 월 20~22일)
- 월말결산 체크리스트 템플릿 8개 항목

### 1.3 RLS 정책

```sql
-- 인증된 사용자만 모든 테이블 접근
alter table employees enable row level security;
create policy "auth_all" on employees for all using (auth.role() = 'authenticated');
-- (모든 테이블에 동일 적용. MVP에서는 단순화)
```

---

## 🔐 Phase 2 — 인증 + 직원관리 (Day 3-4)

### 2.1 인증
- [ ] `/login` 페이지 (이메일 + 비밀번호)
- [ ] Supabase Auth 미들웨어
- [ ] 비인증 시 `/login` 리디렉트
- [ ] 로그아웃 버튼

### 2.2 레이아웃
- [ ] 사이드바 (대시보드/직원/근태/급여/연차/지출/거래처/자산/월말결산/설정)
- [ ] 상단바 (현재 페이지명, 사용자 메뉴)

### 2.3 직원관리
- [ ] 직원 리스트 (TanStack Table, 페이지네이션, 검색, 부서 필터)
- [ ] 직원 상세 페이지 (탭: 기본정보 / 근태이력 / 급여이력 / 연차)
- [ ] 직원 등록 폼 (Zod 검증)
- [ ] 직원 수정 / 퇴사 처리 (soft delete)
- [ ] 계좌번호 마스킹 표시

---

## ⏰ Phase 3 — 근태 + 연차 (Day 5-6)

### 3.1 근태
- [ ] 근태 입력 페이지 (월 캘린더 뷰 or 테이블 뷰)
- [ ] 일괄 입력 (직원 선택 → 출근시간 → 저장)
- [ ] CSV 업로드 (선택)
- [ ] 연장시간 자동 계산 (출근~퇴근 - 9시간 초과분)
- [ ] 야간·휴일 근로 수동 입력
- [ ] 주 52시간 초과 감지 → 경고 표시

### 3.2 연차
- [ ] `lib/calculators/leave.ts`에 법정 계산 함수 작성 + 유닛 테스트
- [ ] 연초에 전 직원 연차 자동 부여 배치 (API 엔드포인트로 구현)
- [ ] 연차 사용 신청/기록 페이지
- [ ] 잔여 연차 표시 (직원 상세 페이지)
- [ ] 사용률 80% 미만 직원 자동 감지 → 연차 촉진 대상 리스트

### 3.3 테스트 케이스 (필수)
```
- 입사 6개월 차: 6개 발생 확인
- 입사 1년 차: 11개 → 1년 경과 시 15개로 전환
- 입사 5년 차: 17개
- 입사 25년 차: 25개 (상한)
```

---

## 💰 Phase 4 — 급여 (Day 7-9) ★ 핵심

### 4.1 순수 계산 함수 (Day 7)
`lib/calculators/` 아래:
- [ ] `payroll.ts`: 총지급액 계산
- [ ] `insurance.ts`: 4대보험 공제
- [ ] `income-tax.ts`: 소득세 조회 + 지방소득세
- [ ] 각 함수 유닛 테스트 3개 이상

### 4.2 급여 계산 플로우 (Day 8)
- [ ] `/payroll` 페이지: 연월 선택 → "일괄 계산" 버튼
- [ ] 버튼 클릭 시:
  1. 해당 월의 전 직원 근태 조회
  2. 각 직원별 계산 → `payroll` 테이블에 INSERT
  3. 결과 테이블 표시 (직원별 총지급/공제/실지급)
- [ ] 개별 재계산 버튼 (수정 시)
- [ ] 확정 버튼 (status: draft → confirmed)

### 4.3 급여명세서 (Day 9)
- [ ] `/payroll/[employeeId]?year=2026&month=1` 라우트
- [ ] 개인별 급여명세서 뷰 (인쇄 친화적 레이아웃)
- [ ] PDF 다운로드 (react-to-pdf 또는 브라우저 인쇄)
- [ ] 이메일 발송 (선택 — Resend 연동, 시간 남으면)

### 4.4 검증
- 테스트 케이스: 월 기본급 300만원 + 연장 10시간 + 식대 20만원, 부양가족 1명 → 예상 실지급액 계산하고 결과 비교.

---

## 💳 Phase 5 — 지출 + 거래처 + 자산 (Day 10)

### 5.1 지출
- [ ] 지출 리스트 (필터: 월/카테고리/거래처/결제수단)
- [ ] 지출 등록 폼
- [ ] 영수증 이미지 업로드 (Supabase Storage) - 선택
- [ ] 카테고리별 월 한도 초과 시 경고
- [ ] CSV 내보내기

### 5.2 거래처
- [ ] 거래처 리스트 / 등록 / 수정
- [ ] 계약 만료 30일 전 배지 표시

### 5.3 자산
- [ ] 자산 리스트
- [ ] 직원별 자산 배정 현황
- [ ] 내용연수 만료 6개월 전 감지

---

## 📊 Phase 6 — 월말결산 + 대시보드 (Day 11)

### 6.1 월말결산 체크리스트
- [ ] `/closing` 페이지 (해당 월 선택 → 8개 항목 체크)
- [ ] 진행률 프로그레스 바
- [ ] 항목: 근태 마감 / 급여 계산 / 급여 이체 / 4대보험 신고 / 원천세 신고 / 법인카드 정산 / 자산 실사 / 월간 보고서

### 6.2 대시보드 (홈)
- [ ] KPI 카드 4종
  - 이번달 총 급여 (전월 대비 %)
  - 이번달 총 지출 (전월 대비 %)
  - 연차 촉진 대상자 수
  - 월말결산 진행률
- [ ] 차트 3종
  - 부서별 인건비 (막대차트)
  - 카테고리별 지출 (도넛차트)
  - 최근 6개월 급여·지출 추세 (라인차트)
- [ ] 알림 리스트
  - 계약 만료 임박 거래처
  - 내용연수 만료 자산
  - 주 52시간 초과 직원

---

## 🚀 Phase 7 — 마감 & 배포 (Day 12)

- [ ] 전체 플로우 End-to-End 테스트 (수동)
- [ ] 에러 처리 점검 (빈 데이터, 네트워크 에러)
- [ ] 로딩 상태 추가 (skeleton)
- [ ] 콘솔 에러 제거
- [ ] **반응형 수동 QA**: iPhone 14 Pro(393) / iPad Mini(768) / Desktop(1440) × 로그인·직원·근태·급여·대시보드
- [ ] **(선택)** `next-pwa` 설정 + `manifest.json` + 아이콘 세트 (v2 홈스크린 설치 대응)
- [ ] 환경변수 Vercel에 등록
- [ ] Vercel 배포
- [ ] 배포 URL로 재검증 (데스크톱 + 모바일 실기기)
- [ ] 실제 테스트 계정 생성 후 이력서·포트폴리오용 링크 정리

---

## 📸 Phase 8 — 포트폴리오 자료 (Day 13)

### 8.1 README.md (레포 기준)
섹션:
1. 프로젝트 소개 (1문단 + 해결한 문제)
2. 라이브 데모 + 테스트 계정
3. 주요 기능 (스크린샷 4장 이상)
4. 기술 스택
5. 아키텍처 다이어그램 (mermaid)
6. 주요 비즈니스 로직 (급여·연차 계산식 코드 발췌)
7. 설치 & 실행 방법
8. 개선 예정 (v2 로드맵)

### 8.2 포트폴리오용 자료
- [ ] 스크린샷 4장: 대시보드 / 급여계산 / 급여명세서 / 월말결산
- [ ] 시연 GIF 또는 유튜브 비공개 영상 (2분)
- [ ] 노션/벨로그에 기술 블로그 포스트 (급여 계산 로직 중심으로 1편)

### 8.3 면접 대비 소재
- [ ] "이 프로젝트에서 가장 어려웠던 점" → 법정 요율 관리 구조
- [ ] "ERP를 써본 적 있나요?" 답변 준비
- [ ] "급여 계산 로직 설명해주세요" 대비 다이어그램 1장

---

## 🧯 Phase 9 — 예비일 (Day 14)

- 버그 수정
- 놓친 엣지 케이스 보완
- 동료/지인 피드백 받고 반영
- 이력서 최종본에 링크 추가

---

## 🏛️ Phase 10 — 프로덕션 완성도 확장 (Day 14+)

> CLAUDE.md §1.1 "완성도 기준" 달성을 위한 Phase. MVP 이후 단계가 아니라 **v1 필수**.

### 10.1 테스트 — 품질 게이트
- [ ] Playwright E2E: 로그인 / 직원 CRUD / 근태 입력 / 급여 계산 / 대시보드 / 월말결산 (총 6 시나리오)
- [ ] 계산 로직 Vitest 커버리지 90% 이상 (`payroll.ts`, `insurance.ts`, `income-tax.ts`, `leave.ts`)
- [ ] Supabase RLS 정책 단위 테스트 (`pgTAP` 또는 인증-쿼리 통합 테스트)

### 10.2 관측성 (Observability)
- [ ] Sentry 에러 트래킹 (클라이언트 + 서버 통합)
- [ ] Vercel Analytics (Web Vitals)
- [ ] `audit_logs` 테이블 + 민감 행위(급여 확정·계좌 수정·직원 삭제) 로깅
- [ ] `/audit-logs` 관리자 전용 페이지

### 10.3 접근성 (a11y)
- [ ] axe-core 자동 감사 CI 통합
- [ ] WCAG 2.1 AA 수동 체크 (키보드 내비게이션, 포커스 트랩, 스크린리더 라벨)
- [ ] 색 대비 비율 4.5:1 이상 검증 (stitch 팔레트 기반)

### 10.4 국제화 (i18n)
- [ ] `next-intl` 도입 — 한국어 기본, 영어 번역 1세트 준비
- [ ] 숫자/통화/날짜 로케일 포맷 (`Intl.*`)

### 10.5 PWA & 모바일
- [ ] `next-pwa` + `manifest.json` + 아이콘 세트 (192/512/maskable)
- [ ] 오프라인 캐싱: 대시보드 KPI·직원 리스트 stale-while-revalidate
- [ ] iOS/Android 실기기 수동 QA (홈스크린 설치 포함)

### 10.6 CI/CD
- [ ] GitHub Actions: `lint → typecheck → test → build` on every PR
- [ ] Vercel Preview 배포 자동 연결
- [ ] main merge 시 프로덕션 자동 배포

### 10.7 이메일 발송 (Resend)
- [ ] 급여명세서 PDF 이메일 발송
- [ ] 결산 리포트 이메일 발송
- [ ] 계약 만료·52시간 초과 알림 이메일

### 10.8 데이터 이관
- [ ] 엑셀(.xlsx) 가져오기: 직원·근태·지출
- [ ] 엑셀 내보내기: 급여·지출·결산 리포트
- [ ] CSV 표준 포맷 문서화

### 10.9 보안 하드닝
- [ ] CSRF 보호 (Supabase Auth + next-safe-action)
- [ ] Rate limit (Vercel Edge Config 또는 upstash)
- [ ] 환경변수 주기 점검 + 노출 스캔
- [ ] 보안 헤더 (CSP, HSTS, X-Frame-Options)

### 10.10 문서화
- [ ] README 4장 스크린샷 + 데모 GIF + 아키텍처 다이어그램
- [ ] `docs/adr/` — ADR 기록 (DB 스키마 결정, 디자인 시스템 채택 등)
- [ ] `docs/runbook.md` — 운영 런북 (배포/롤백/DB 백업)
- [ ] OpenAPI 스펙 (Route Handler별 시그니처)

### 10.11 멀티테넌시 (v2 후보, 검토 필수)
- [ ] 회사(tenant) 테이블 + 전 테이블 `tenant_id` FK
- [ ] RLS 정책 멀티테넌시 대응
- [ ] 테넌트 생성/초대 플로우


---

## 📋 진행 로그 (매 Phase 종료 시 기록)

### Phase 0 (Day 1)
- 완료일:
- 막힌 지점:
- 해결 방법:

### Phase 1 (Day 2)
- 완료일:
- 막힌 지점:
- 해결 방법:

(이후 각 Phase마다 동일 템플릿으로 기록)

---

## 🧭 우선순위 — 구현 순서

> **"시간 없으면 뭐부터 버리나" 리스트는 폐기됨** (CLAUDE.md §1.1 참조). 아래는 **구현 순서 가이드**일 뿐 기능 누락의 근거가 아니다.

**먼저 구현 (뼈대)**
1. 급여 계산 (4대보험 공제 포함)
2. 급여명세서
3. 직원 관리
4. 대시보드 KPI + 차트 3종
5. 배포 + README

**뒤이어 구현 (완성도)**
- 영수증 이미지 업로드 (Supabase Storage)
- 거래처 계약 관리 (알림·갱신 플로우 포함)
- 자산 감가상각 자동 계산 (정액법 + 정률법 선택)
- CSV 가져오기/내보내기 (엑셀 호환)
- 월말결산 체크리스트 커스터마이징
- 이메일 발송 (Resend) — 급여명세서·결산 리포트
- 감사 로그 (audit_logs 테이블)
- i18n (한/영)
- PWA + 오프라인 캐싱

**절대 버리면 안 되는 차별화 포인트**
- 법적 정확성 (요율은 실제값)
- 연차 자동 계산
- KPI 대시보드
- 모바일 반응형 + 실기기 QA

---

## 🎙️ 면접에서 쓸 문장 (미리 준비)

> "중소기업 1인 총무의 월간 반복 업무를 하나로 묶은 미니 ERP입니다. 특히 급여 계산 모듈은 근로기준법과 국세청 간이세액표를 기준으로 구현했고, 4대보험 요율은 매년 바뀌기 때문에 DB 테이블로 분리해서 코드 수정 없이 갱신할 수 있게 설계했습니다. ERP 실무 경험은 없지만, 총무 업무가 결국 '데이터가 흐르는 문제'라는 관점으로 접근했습니다."

---

**마지막 업데이트**: 프로젝트 시작일
