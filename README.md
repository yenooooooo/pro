# Nexus ERP

> 중소기업(~50인) 1인 총무 담당자의 월간 반복 업무를 **하나의 웹앱으로 통합**한 미니 ERP.
> **엑셀 파일 10개 → 웹앱 1개.**

근로기준법·소득세법·국세청 간이세액표를 코드로 옮긴 **법적 정확성**, 직원→근태→급여→대시보드로 이어지는 **데이터 연결성**, 월말결산 체크리스트와 연차 촉진 알림 같은 **실무 디테일**에 초점을 맞춘 프로덕션 완성형 사이드 프로젝트.

---

## 🌐 라이브 데모

| 항목 | 값 |
|---|---|
| URL | **<https://pro-gules-beta.vercel.app/>** |
| 테스트 계정 | _요청 시 별도 안내 (이력서·포트폴리오 링크 통해)_ |

> 배포 절차는 [`docs/deployment.md`](./docs/deployment.md) 참조. 자동 배포(main 푸시 시) 활성화됨.

---

## 🖼️ 주요 화면

| 대시보드 | 급여 일괄 계산 |
|---|---|
| ![대시보드](./docs/screenshots/01_dashboard.png) | ![급여](./docs/screenshots/02_payroll.png) |

| 급여명세서 (인쇄/PDF) | 월말결산 체크리스트 |
|---|---|
| ![명세서](./docs/screenshots/03_payslip.png) | ![결산](./docs/screenshots/04_closing.png) |

> 스크린샷은 `docs/screenshots/`에 차례로 추가. 시연 GIF는 `docs/demo.gif`.

---

## ✨ 기능 요약

| 모듈 | 핵심 기능 |
|---|---|
| **직원** | CRUD, 부서·직급, 계좌번호 마스킹, 퇴사 처리(soft delete) |
| **근태** | 일별 입력 + CSV 가져오기, 연장/야간/휴일/주52h 자동 집계, 위반 경고 |
| **연차** | 입사일/회계연도 기준 자동 발생, 잔여 추적, 사용률 80% 미만 자동 감지 |
| **급여 ★** | 통상시급(209h) → 수당(연장1.5/야간0.5/휴일1.5·2.0) → 4대보험(상하한 적용) → 간이세액표 조회 → 명세서 인쇄/PDF |
| **지출** | 카테고리·거래처 연결, 영수증 업로드(Storage), 월 한도 80%/100% 알림, CSV 내보내기 |
| **거래처** | 사업자번호 검증, 계약 만료 30일 전 배지 |
| **자산** | 정액법 감가상각, 내용연수 만료 6개월 전 알림, 직원 배정 |
| **결산** | 8개 항목 체크리스트 + 진행률, 월별 이력 |
| **대시보드** | KPI 4종(급여/지출/연차촉진/결산) + 차트 3종(부서별·카테고리별·6개월 추세) + 알림 패널 |

---

## 🏗️ 기술 스택

```
Frontend   Next.js 14 (App Router) · TypeScript (strict) · Tailwind + shadcn/ui
           React Hook Form + Zod · TanStack Table · Recharts · date-fns
Backend    Supabase (Postgres + Auth + Storage + RLS) · Next Route Handlers
Tests      Vitest (122 unit tests, 계산 로직 100%)
Deploy     Vercel · GitHub
```

---

## 🧭 아키텍처

```mermaid
flowchart LR
    subgraph Client[Next.js App Router]
        Page[Server Components]
        Client[Client Components<br/>RHF + Zod]
        Page --> Client
    end

    subgraph Calc[lib/calculators<br/>순수 함수 + 122 tests]
        Pay[payroll.ts]
        Ins[insurance.ts]
        Tax[income-tax.ts]
        Leave[leave.ts]
        Sev[severance.ts]
    end

    subgraph API[/app/api/*]
        PayrollAPI[payroll/calculate]
        ConfirmAPI[payroll/confirm]
        AccrualAPI[leave/accrual]
        KPIAPI[dashboard/kpi]
    end

    subgraph DB[Supabase Postgres / chongmu schema]
        Emp[(employees)]
        Att[(attendance)]
        Payroll[(payroll)]
        Rates[(insurance_rates<br/>income_tax_table)]
        Storage[(storage: receipts)]
    end

    Page --> API
    Client --> API
    API --> Calc
    API --> DB
    Calc -. 순수 함수 .-> Calc
    DB -. RLS .-> API
```

핵심 설계 원칙:
- **계산 로직은 순수 함수**(`lib/calculators/*`) — DB 의존 0, 테스트 가능.
- **요율은 코드가 아닌 DB**(`insurance_rates`, `income_tax_table`) — 매년 갱신해도 코드 무수정.
- **읽기는 Server Component, 쓰기는 Server Action / Route Handler**.
- **RLS로 인증된 관리자만 CRUD** — 클라이언트 번들에 `service_role` 키 절대 미포함.

---

## 💡 주요 비즈니스 로직 (코드 발췌)

### 통상시급·수당 계산 — `lib/calculators/payroll.ts`

```ts
const MONTHLY_REGULAR_HOURS = 209;          // 주 40h × 4.345주
const OVERTIME_RATE = 1.5;                  // 근로기준법 제56조
const NIGHT_RATE_PREMIUM = 0.5;             // 야간 가산분만 (연장과 별도 합산)
const HOLIDAY_RATE_WITHIN_8H = 1.5;
const HOLIDAY_RATE_OVER_8H = 2.0;

// 비과세 한도 (2024 개정 반영)
const MEAL_NON_TAXABLE_LIMIT = 200_000;     // 식대
const CAR_ALLOWANCE_NON_TAXABLE_LIMIT = 200_000;  // 자가운전
const CHILDCARE_NON_TAXABLE_LIMIT = 200_000;      // 6세 이하 양육수당

const regularHourlyWage = baseSalary / MONTHLY_REGULAR_HOURS;

// 포괄임금제: 기본급에 포함된 연장시간만큼 차감
const overtimeHoursEffective = Math.max(
  0,
  overtimeHours - (inclusiveOvertimeHours ?? 0),
);
const overtimePay = Math.round(regularHourlyWage * overtimeHoursEffective * OVERTIME_RATE);

const nonTaxableTotal =
  Math.min(mealAllowance, MEAL_NON_TAXABLE_LIMIT) +
  Math.min(carAllowance, CAR_ALLOWANCE_NON_TAXABLE_LIMIT) +
  Math.min(childcareAllowance, CHILDCARE_NON_TAXABLE_LIMIT);

const grossPay = baseSalary + overtimePay + nightPay + holidayPay + ...allowances;
const taxableIncome = grossPay - nonTaxableTotal;  // 4대보험·소득세 산정 기준
```

### 연차 발생 — `lib/calculators/leave.ts`

```
입사 1년 미만 : 1개월 개근당 1일 (최대 11일) — 근로기준법 제60조 ②항
입사 1년     : 15일                            — 제60조 ①항
3년차 이후   : 15 + floor((근속연수-1)/2)      — 제60조 ④항
                                               (3년차 16, 5년차 17, ... 최대 25일)
```

### 4대보험 (요율은 DB 조회) — `lib/calculators/insurance.ts`

```ts
// 국민연금: 과세소득 × pension_rate. 단 pension_min_base / pension_max_base로 클램프.
const pensionBase = clamp(taxableIncome, rates.pension_min_base, rates.pension_max_base);
const pensionDeduction = Math.round(pensionBase * rates.pension_rate);
// 건강 / 장기요양 / 고용도 동일 방식. 모든 요율은 insurance_rates 테이블에서 연도별로 조회.
```

### 검증된 시나리오 — CLAUDE.md §6.4 카논 케이스

> 월 기본급 300만원 + 연장 10시간 + 식대 20만원, 부양가족 1명 → **실지급 3,002,394원**
> (`lib/calculators/integration.test.ts`)

---

## 🚀 로컬 실행

```bash
# 1. 의존성
npm install

# 2. 환경변수 — Supabase 프로젝트의 URL/키 입력
cp .env.example .env.local

# 3. DB 마이그레이션 + 시드 (Supabase CLI)
supabase db push
supabase db execute --file supabase/seed.sql

# 4. 개발 서버
npm run dev          # http://localhost:3000
```

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run typecheck` | TypeScript 검증 |
| `npm run lint` | ESLint |
| `npm test` | Vitest (122 tests) |

---

## 📁 디렉토리

```
app/
├── (dashboard)/             # 인증 후 라우트 그룹
│   ├── dashboard/           # KPI·차트·알림
│   ├── employees/           # 직원 CRUD
│   ├── attendance/          # 근태 입력 + CSV 가져오기
│   ├── payroll/             # 일괄 계산 + 명세서
│   ├── leave/               # 연차 신청·잔여
│   ├── expenses/            # 지출 + 영수증 업로드
│   ├── vendors/             # 거래처 + 계약 만료
│   ├── assets/              # 자산 + 감가상각
│   └── closing/             # 월말결산 체크리스트
├── api/                     # Route Handlers
└── login/

lib/
├── calculators/             # 순수 함수 + Vitest (122 tests)
├── supabase/                # 서버/클라 클라이언트
└── ...

supabase/
├── migrations/              # 0001~0005
└── seed.sql                 # 직원 15명 + 3개월치 더미 데이터
```

자세한 설계는 [`CLAUDE.md`](./CLAUDE.md), 단계별 진행은 [`PLAN.md`](./PLAN.md) 참조.

---

## 🗺️ 로드맵

### v1 마무리 (현재 진행)
- [x] Phase 0~6 — 인증·직원·근태·급여·지출·거래처·자산·결산·대시보드
- [x] 비주얼 시스템 — stitch "Executive Command" 토큰 + 글래스모피즘
- [ ] Phase 7 — Vercel 배포 + 3-viewport QA
- [ ] Phase 8 — 스크린샷 + 데모 GIF

### v1.1 — 프로덕션 완성도 (CLAUDE.md §1.1)
- [ ] 감사 로그 (`audit_logs`)
- [ ] 엑셀(.xlsx) 가져오기 — 직원·근태·지출
- [ ] Resend 이메일 — 급여명세서 PDF 발송
- [ ] Sentry + Vercel Analytics
- [ ] Playwright E2E 6 시나리오
- [ ] PWA — manifest + 오프라인 캐싱
- [ ] CI/CD — GitHub Actions

### v2 후보
- [ ] 멀티테넌시 (회사별 격리)
- [ ] i18n (영어)
- [ ] 정률법 감가상각

---

## 📝 라이선스

포트폴리오 용도 개인 프로젝트. 회사·조직에서 실제 사용을 원하는 경우 별도 문의.
