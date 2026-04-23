# CLAUDE.md — 총무PRO 프로젝트 지침서

> Cursor CLI / Claude Code가 이 프로젝트를 작업할 때 반드시 따라야 하는 원칙과 규칙.
> **매 세션 시작 시 반드시 이 파일을 먼저 읽는다.**

---

## 📌 1. 프로젝트 정체성

- **프로젝트명**: 총무PRO (임시. 최종 네이밍 변경 가능)
- **한 줄 정의**: 중소기업(~50인 규모) 총무 담당자의 월간 반복 업무를 하나의 웹앱으로 통합한 미니 ERP
- **목적**: **프로덕션 완성형 제품** (포트폴리오 겸용 — 총무 직무 + 풀스택/AX 포지션 지원)
- **완성도 목표**: **"완벽한 사이트"** — 2주 MVP가 아니라 실제 고객에게 판매/운영 가능한 품질까지.
- **개발 일정**: PLAN.md의 14일 타임라인은 **참고용**. 완료 기준은 시간이 아니라 **"프로덕션 품질에 도달했는가"**.
- **배포**: Vercel (자체 도메인 포함)
- **타겟 페르소나**: 10~50인 규모 중소기업의 1인 총무 담당자. ERP 도입은 부담스럽고 엑셀은 한계에 달한 상황.

### 1.1 완성도 기준 (Production-grade checklist)
아래 모든 항목을 충족해야 "완성"으로 간주한다:
1. **기능 완결성**: PLAN.md "시간 없으면 버려도 되는 것" 리스트는 무효. 영수증 업로드/CSV I/O/이메일 발송/감가상각/결산 커스터마이징 포함 **전부 구현**.
2. **테스트**: 계산 로직 유닛 테스트 100%, 핵심 플로우 E2E 테스트 (Playwright), 회귀 테스트 파이프라인.
3. **접근성**: WCAG 2.1 AA 기준 통과. 키보드 내비게이션, 스크린리더 라벨.
4. **보안**: Supabase RLS 전 테이블, 감사 로그(audit log), CSRF, Rate limit, 민감정보 마스킹.
5. **성능**: Lighthouse Perf ≥ 90 (모바일 포함). 대시보드 LCP < 2.5s.
6. **모니터링**: Sentry 또는 동급 에러 트래킹, Vercel Analytics, 핵심 지표 알림.
7. **국제화 준비**: 한국어 기본 + 영어 i18n 확장 경로 (`next-intl`) 준비.
8. **문서화**: README + ADR(Architecture Decision Records) + API 문서 + 운영 런북.
9. **CI/CD**: GitHub Actions — lint/typecheck/test/build on every PR + preview 배포.
10. **데이터 이관 경로**: 엑셀/기존 ERP에서 가져오기·내보내기 전부 지원.

---

## 🎯 2. 핵심 원칙 (Non-negotiable)

1. **데이터는 반드시 연결된다.** 직원 → 근태 → 급여 → 대시보드, 거래처 → 지출 → 대시보드, 자산 → 대시보드. 시트가 따로 놀면 실패다.
2. **비즈니스 로직 = 근로기준법 준수.** 급여·연차·최저임금은 2026년 대한민국 법정 기준으로 계산한다. 임의값 금지.
3. **요율·세율은 DB 테이블로 분리.** 하드코딩 절대 금지. 매년 갱신되는 값이므로 코드 수정 없이 관리자가 수정 가능해야 한다.
4. **읽기 쉬운 코드 > 화려한 코드.** 면접관이 코드를 열었을 때 "업무 흐름이 보인다"고 느껴야 한다.
5. **에러는 숨기지 않고 드러낸다.** 급여 계산에서 #REF 같은 오류는 치명적이다. try-catch + fallback + 사용자에게 명확한 안내.
6. **샘플 데이터는 현실적으로.** 직원 15명, 3개월치 근태·급여·지출 데이터를 seed로 넣어 둔다. 빈 대시보드 = 죽은 포트폴리오.

---

## 🛠️ 3. 기술 스택 (고정)

### 프론트엔드
- **Next.js 14+** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui** (디자인 토큰은 `/stitch_avant_garde_digital_showcase*` 참조로 주입 — 자세한 규칙은 §14)
- **React Hook Form** + **Zod** (폼 검증)
- **TanStack Table** (테이블/대시보드용)
- **Recharts** (차트)
- **date-fns** (날짜 계산. moment 금지)
- **반응형 우선 (모바일 병행)**: 전 페이지가 `sm(640) / md(768) / lg(1024) / xl(1280)` 브레이크포인트에서 정상 동작. §15 참조.

### 백엔드 & DB
- **Supabase** (PostgreSQL + Auth + Storage)
- **Supabase RLS** (Row Level Security) 반드시 활성화
- 서버 로직은 **Next.js Route Handlers** (`/app/api/*`) 사용
- 복잡한 계산은 **Supabase Edge Functions** 또는 **DB 함수(PL/pgSQL)** 으로 이동 가능

### 인증
- **Supabase Auth** (이메일 + 비밀번호. 소셜 로그인은 MVP에서 제외)
- MVP 단계는 **1인 관리자 계정 1개**로 시작. 멀티테넌시는 v2에서.

### 배포 & CI
- **Vercel** (프론트 + API)
- **GitHub Actions**는 선택 사항 (MVP에서는 생략)
- 환경변수는 `.env.local` → Vercel Dashboard에 수동 등록

### 금지 스택
- MongoDB (관계형 데이터가 핵심이라 부적합)
- Firebase (Supabase로 통일)
- Material-UI, Chakra (shadcn/ui로 통일)
- Moment.js, jQuery

---

## 📁 4. 디렉토리 구조

```
/
├── app/
│   ├── page.tsx                    # 루트 "/" — 로그아웃 랜딩 (stitch 05_landing)
│   ├── (auth)/login/
│   ├── (dashboard)/                # route group — URL에 반영 안 됨
│   │   ├── layout.tsx              # 사이드바 + 상단바 + 하단탭
│   │   ├── dashboard/              # "/dashboard" — 대시보드 메인
│   │   ├── employees/              # "/employees" — 직원정보
│   │   ├── attendance/             # "/attendance" — 근태입력
│   │   ├── payroll/                # "/payroll" — 급여계산
│   │   │   ├── page.tsx
│   │   │   └── [employeeId]/       # "/payroll/[id]" — 급여명세서
│   │   ├── leave/                  # "/leave" — 연차관리
│   │   ├── expenses/               # "/expenses" — 지출입력
│   │   ├── vendors/                # "/vendors" — 거래처
│   │   ├── assets/                 # "/assets" — 자산관리
│   │   └── closing/                # "/closing" — 월말결산 체크리스트
│   └── api/
│       ├── payroll/calculate/      # 급여 계산 API
│       ├── leave/accrual/          # 연차 발생 계산
│       └── dashboard/kpi/          # 대시보드 집계
├── components/
│   ├── ui/                         # shadcn/ui (수정 금지)
│   ├── shared/                     # 공통 컴포넌트
│   └── features/                   # 도메인별 컴포넌트
├── lib/
│   ├── supabase/                   # Supabase 클라이언트
│   ├── calculators/                # 급여·연차·세금 계산 로직
│   │   ├── payroll.ts
│   │   ├── insurance.ts            # 4대보험
│   │   ├── income-tax.ts           # 소득세
│   │   └── leave.ts                # 연차
│   ├── utils/
│   └── validators/                 # Zod 스키마
├── types/
│   └── database.ts                 # Supabase 타입 자동생성
├── constants/
│   └── ...
└── supabase/
    ├── migrations/
    └── seed.sql
```

---

## 🗄️ 5. 데이터베이스 스키마 원칙

### 공통 규칙
- 모든 테이블에 `id (uuid, pk)`, `created_at`, `updated_at` 필수
- Soft delete: 중요 테이블(직원, 급여기록)은 `deleted_at` 컬럼으로 논리 삭제. 하드 삭제 금지.
- 외래키(FK) 반드시 선언. `ON DELETE RESTRICT` 기본. 직원 삭제 시 급여 기록은 유지되어야 함.
- 금액 컬럼은 `numeric(15,2)` 또는 `integer`(원 단위). `float` 절대 금지.
- 날짜는 `date` (시간 불필요) / `timestamptz` (시간 포함) 구분해서 사용.
- 상태값은 `text` + CHECK 제약 또는 PostgreSQL ENUM.

### 핵심 테이블 목록

| 테이블명 | 역할 |
|---|---|
| `employees` | 직원 마스터 |
| `departments` | 부서 |
| `positions` | 직급 |
| `attendance` | 일별 근태 기록 |
| `payroll` | 월별 급여 계산 결과 |
| `payroll_items` | 급여 항목별 내역 (기본급/연장/식대/공제 등) |
| `leave_types` | 연차 유형 (연차/병가/경조사) |
| `leave_balances` | 직원별 연차 잔여 |
| `leave_requests` | 연차 신청/사용 기록 |
| `insurance_rates` | 4대보험 요율 (연도별) |
| `income_tax_table` | 간이세액표 (월급 구간별) |
| `expenses` | 지출 기록 |
| `expense_categories` | 지출 카테고리 |
| `vendors` | 거래처 |
| `assets` | 고정자산 |
| `closing_tasks` | 월말결산 체크리스트 항목 |
| `closing_history` | 월별 결산 진행 이력 |

상세 스키마는 `PLAN.md` 참조.

---

## 💰 6. 비즈니스 로직 규칙 (★ 핵심)

### 6.1 급여 계산 로직

```
총지급액 = 기본급 + 연장근로수당 + 야간수당 + 휴일수당 + 식대 + 직책수당 + 기타수당
공제액 = 국민연금 + 건강보험 + 장기요양보험 + 고용보험 + 근로소득세 + 지방소득세 + 기타공제
실지급액 = 총지급액 - 공제액
```

**통상시급**: `기본급 / 209시간` (월 소정근로시간 기준)

**수당 계산**:
- 연장근로수당 = 통상시급 × 연장시간 × **1.5**
- 야간근로수당(22시~06시) = 통상시급 × 야간시간 × **0.5** (가산분만. 연장과 중복 시 합산)
- 휴일근로수당 = 통상시급 × 휴일근로시간 × **1.5** (8시간 초과분은 2.0)

**식대**: 월 20만원까지 **비과세** (2024년 기준 상향 반영)

**주의**:
- 통상임금 계산은 법적 쟁점이 많음. MVP에서는 기본급만 통상임금으로 간주하되, 코드에 주석으로 명시.
- 최저임금 체크: 2026년 기준 최저 시급 이하면 경고 표시.

### 6.2 4대보험 공제

요율은 `insurance_rates` 테이블에서 조회. **하드코딩 금지.**

```
국민연금 = 과세소득 × 국민연금 요율 (근로자부담분)
건강보험 = 과세소득 × 건강보험 요율
장기요양 = 건강보험료 × 장기요양 요율
고용보험 = 과세소득 × 고용보험 요율
```

- **과세소득 = 총지급액 - 비과세항목(식대 20만원 등)**
- 국민연금은 상한액·하한액 존재. `insurance_rates` 테이블에 `min_base`, `max_base` 컬럼 추가.
- 2026년 기준 요율은 seed 데이터로 넣되, 실제 수치는 프로젝트 시작일에 국민건강보험공단·국민연금공단 공식 사이트에서 재확인 후 반영한다. **추측으로 넣지 말 것.**

### 6.3 근로소득세 (원천징수)

- 국세청 **근로소득 간이세액표** 기준.
- `income_tax_table`에 `월급여액_이상`, `월급여액_미만`, `공제대상가족수(1~11명)`별 세액을 저장.
- 로직: 월 과세소득과 부양가족 수로 테이블 조회. 지방소득세 = 소득세 × 10%.
- 간이세액표 원본은 국세청 사이트에서 매년 다운로드. MVP에서는 1인 가구 기준 샘플 데이터만 넣고, 추후 확장.

### 6.4 연차(유급휴가) 발생 로직

근로기준법 제60조 기준:

```
입사 1년 미만:
  → 1개월 개근 시 1일씩 발생 (최대 11일)

입사 1년 이상 (2년차 진입):
  → 15일 발생

입사 3년차부터:
  → 15일 + (근속연수 - 1) / 2 (내림)
  → 즉 3년차 16일, 5년차 17일, 7년차 18일 ... 최대 25일

예외: 출근율 80% 미만인 해는 월차 방식으로 환산
```

**구현 노트**:
- `leave.ts`에 `calculateAnnualLeave(hireDate: Date, baseDate: Date): number` 함수로 통합.
- 회계연도 기준 vs 입사일 기준 두 방식 모두 지원 플래그로 분기.
- 연차 촉진 대상(사용률 80% 미만) 감지 로직 포함.

### 6.5 연장근로 한도

- 법정 근로시간: 주 40시간
- 연장근로 한도: 주 **12시간** (근로기준법 제53조)
- 주 52시간 초과 기록 시 대시보드에 **경고 배지**.

### 6.6 지출 관리

- 지출은 반드시 **카테고리 + 거래처** 연결.
- 법인카드 지출은 월 한도 체크.
- 영수증 이미지 업로드는 Supabase Storage 사용 (선택 기능).
- 부가세 과세/면세 구분 필드.

### 6.7 자산 관리

- 감가상각: **정액법**을 기본으로 (MVP 한정). 내용연수는 자산 분류별 상이 (PC 5년, 사무가구 5년, 차량 5년 등).
- 내용연수 만료 6개월 전부터 대시보드에 표시.
- 자산 상태: 사용중 / 수리중 / 폐기 / 매각.

---

## 🧱 7. 코딩 규칙

### 파일 & 네이밍
- 파일명: `kebab-case` (예: `payroll-calculator.ts`)
- 컴포넌트: `PascalCase` (예: `PayrollTable.tsx`)
- 함수/변수: `camelCase`
- 상수: `UPPER_SNAKE_CASE`
- DB 테이블/컬럼: `snake_case`

### TypeScript
- `any` 금지. 부득이하면 `unknown` 후 타입 가드.
- 함수 시그니처에 반환 타입 명시.
- Zod 스키마로 런타임 검증 후 타입 추출(`z.infer`).
- Supabase 타입은 CLI로 자동 생성한 `types/database.ts` 사용.

### 컴포넌트
- 서버 컴포넌트 우선. 상태 필요할 때만 `'use client'`.
- props는 interface로 선언, `Props` suffix 사용 (예: `PayrollTableProps`).
- 한 파일 200줄 초과 시 분할 고려.

### 계산 로직
- `lib/calculators/` 아래 모든 계산 함수는 **순수 함수**로 작성. DB 호출 금지.
- 입력값 → 계산 → 출력값. 테스트 가능한 구조 유지.
- 각 함수에 JSDoc으로 **법적 근거** 명시:
  ```ts
  /**
   * 연차 발생 일수 계산
   * 근거: 근로기준법 제60조 (2026년 기준)
   * @param hireDate 입사일
   * @param baseDate 기준일 (보통 오늘)
   */
  ```

### 에러 처리
- 계산 함수는 실패 시 예외 대신 `{ success: boolean, data?, error? }` 객체 반환.
- API Route는 try-catch로 감싸고 상태 코드 명시적으로 반환.
- UI는 `sonner` 또는 shadcn `toast`로 에러 노출.

---

## 🔒 8. 보안 & 개인정보

- **주민등록번호는 DB에 저장하지 않는다.** 생년월일만 저장.
- 계좌번호 같은 민감 정보는 저장하되 화면에는 마스킹 (예: `1234-**-**5678`).
- Supabase RLS 정책: 인증된 관리자만 모든 CRUD 가능.
- `.env.local` 절대 커밋 금지. `.gitignore` 확인 필수.
- Supabase `service_role` 키는 서버 환경변수에만. 클라이언트 번들 절대 포함 금지.

---

## 🧪 9. 테스트 (MVP 최소 기준)

MVP 단계에서는 전수 테스트 대신 **계산 로직만 유닛 테스트**:

- `lib/calculators/*.ts`의 모든 함수는 **최소 3개 이상의 테스트 케이스**.
- Vitest 사용.
- 급여·연차 로직은 법정 예시값으로 검증 (예: "월 300만원, 부양가족 1인 → 소득세 X원").

---

## 📝 10. Git 커밋 컨벤션

```
feat:     새 기능
fix:      버그 수정
refactor: 리팩터링 (동작 변화 없음)
style:    포맷 변경 (로직 영향 없음)
docs:     문서 수정
chore:    설정, 빌드 등
test:     테스트 추가/수정
```

예시:
```
feat: 급여 계산 로직 (4대보험 공제 포함)
fix: 연차 계산에서 윤년 처리 오류
docs: CLAUDE.md 공제 로직 업데이트
```

---

## 🚫 11. AI에게 — 하지 말 것 리스트

1. 급여·세금·연차 요율 값을 **추측으로 하드코딩**하지 말 것. 반드시 `insurance_rates` / `income_tax_table`에서 조회.
2. **§14의 stitch 디자인 토큰을 무시하고 임의의 색상/폰트/radius를 쓰지 말 것.** 추가 컴포넌트가 필요하면 토큰 내에서 조합한다. 토큰 변경은 `tailwind.config.ts`와 `globals.css` 수정으로만 일원화.
3. **"MVP 범위 밖"이라는 이유로 기능 누락을 정당화하지 말 것.** 이 프로젝트는 MVP가 아니라 완성형 프로덕트다(§1.1). PLAN.md의 "버려도 된다" 리스트는 무효다. 작업량이 커서 단계를 쪼개는 건 OK지만, 아예 빼는 건 금지.
4. **파일을 쪼개지 않고 한 파일에 1000줄 몰아넣기 금지.**
5. 테스트 없이 계산 로직을 "완성"했다고 선언하지 말 것.
6. Supabase 쿼리를 `any`로 받지 말 것. 생성된 타입 사용.
7. **면접에서 설명할 수 없는 코드를 쓰지 말 것.** 이해 못 하면 작성도 하지 말 것.

---

## ✅ 12. 세션 시작 체크리스트

매 Cursor CLI 세션 시작 시:
1. [ ] 이 `CLAUDE.md` 전체를 읽었다
2. [ ] `PLAN.md`에서 현재 Phase 위치를 확인했다
3. [ ] 작업 범위를 사용자에게 1문장으로 요약해서 확인받는다
4. [ ] 기존 파일을 수정할 땐 먼저 `view`로 확인한 후 편집한다
5. [ ] 계산 로직 변경 시 관련 테스트도 함께 수정한다

---

## 📚 13. 참고 레퍼런스

- 근로기준법: https://www.law.go.kr
- 국민건강보험공단 요율 공지
- 국세청 근로소득 간이세액표
- Supabase Docs: https://supabase.com/docs
- Next.js App Router: https://nextjs.org/docs/app

---

## 🎨 14. 디자인 시스템 (stitch 기반)

### 14.1 출처와 범위
- 디자인 레퍼런스: `/_design-references/` 하위 5개 폴더 (원본은 stitch-generated).
- 5개 폴더의 `DESIGN.md`는 **동일한 토큰 시스템**을 공유하고, 화면만 다르다:
  1. `01_dashboard/` → **Strategic Dashboard** (KPI + 차트 + 알림)
  2. `02_payroll/` → **Payroll Execution Matrix** (급여 일괄 계산 테이블)
  3. `03_employees/` → **Dynamic Employee Directory** (직원 카드 + 상세 패널)
  4. `04_closing/` → **Monthly Closing Center** (월말결산 체크리스트)
  5. `05_landing/` → **Landing Page** (히어로 + 기능 카드)
- 각 폴더는 `DESIGN.md` / `screen.png` / `code.html` 3파일로 구성. `code.html`은 그대로 복붙하지 말고 **레이아웃 아이디어만** 참조해 Next.js 서버 컴포넌트 + shadcn/ui로 재작성한다.
- 브랜드 네이밍: **"Chongmu PRO Elite"** / 서브 — Enterprise Edition.
- 에토스: **"Executive Command"** — 미니멀리즘 + 글래스모피즘. 소비자 앱의 둥글둥글함 금지, 고급 SaaS 터미널 느낌.

### 14.2 컬러 토큰 (다크 테마 전용)

| 역할 | 토큰 | HEX |
|---|---|---|
| 배경 | `bg-surface` / `bg-background` | `#0b1326` |
| 최저 레벨 | `bg-surface-container-lowest` | `#060e20` |
| 카드 기본 | `bg-surface-container` | `#171f33` |
| 카드 호버 | `bg-surface-container-high` | `#222a3d` |
| 밝은 컨테이너 | `bg-surface-container-highest` | `#2d3449` |
| 텍스트 기본 | `text-on-surface` | `#dae2fd` |
| 텍스트 보조 | `text-on-surface-variant` | `#c7c4d7` |
| **Primary (Electric Indigo)** | `bg-primary` / `text-primary` | `#c0c1ff` |
| Primary Container | `bg-primary-container` | `#8083ff` |
| On Primary | `text-on-primary` | `#1000a9` |
| **Tertiary (Sky Blue, 차트용)** | `bg-tertiary` | `#7bd0ff` |
| 외곽선 | `border-outline` | `#908fa0` |
| 외곽선 약 | `border-outline-variant` | `#464554` |
| 에러 | `text-error` | `#ffb4ab` |

**규칙**: shadcn/ui의 CSS 변수(`--primary`, `--background` 등)는 위 HEX로 덮어쓰되, `globals.css`에서 **HSL로 변환**해 주입한다 (shadcn 관례 준수).

### 14.3 타이포그래피
- 패밀리: **Inter** (Google Fonts, weight 400/500/600/700) 단일 사용.
- 스케일:
  - `text-display-xl` — 48px / 1.1 / 700 / -0.02em
  - `text-headline-lg` — 30px / 1.2 / 600 / -0.01em
  - `text-headline-md` — 24px / 1.3 / 600
  - `text-body-lg` — 18px / 1.6 / 400
  - `text-body-md` — 16px / 1.5 / 400
  - `text-data-tabular` — **14px / 1.4 / 500 / 0.01em** (ERP 테이블 전용)
  - `text-label-sm` — 12px / 1 / 600 / 0.05em (라벨/뱃지 대문자 tracking)
- 숫자가 들어가는 모든 테이블·급여명세서·KPI는 `text-data-tabular` + `tabular-nums` 유틸리티를 함께 적용 (숫자 정렬).

### 14.4 간격 / 반경
- 8px 그리드: `spacing-unit=8px`, `gutter=24px`, `container-padding=32px`.
- Stack: `stack-sm=8px`, `stack-md=16px`, `stack-lg=32px`.
- Radius: 버튼/입력 **8px(`rounded-lg`)**, 카드/모달 **16~24px(`rounded-xl`/`rounded-2xl`)**, 체크박스/태그 4px.

### 14.5 글래스모피즘 (Cards)
```css
.glass-panel {
  background: rgba(23, 31, 51, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(199, 196, 215, 0.10);
  border-top-color: rgba(255, 255, 255, 0.10); /* rim light */
}
```
- 모든 카드는 `.glass-panel` 유틸리티를 사용한다.
- 드롭섀도 금지. 대신 상단 **rim light**(흰색 10%)로 엣지를 살린다.
- 호버 시 Electric Indigo 아웃터 글로우 `shadow-[0_0_20px_-5px_rgba(192,193,255,0.15)]`.

### 14.6 컴포넌트 규칙
- **버튼 Primary**: `bg-primary` + `text-on-primary` + `rounded-lg` + `transition-all duration-200 ease-in-out`. 세로 그라데이션은 `bg-gradient-to-b from-primary to-primary-container`.
- **버튼 Secondary(ghost)**: `border border-outline-variant bg-surface-container/50 text-on-surface`.
- **Input**: 어두운 recessed. `bg-surface-container-lowest` + `inset shadow` + `focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface`.
- **Table**: 행 구분선 대신 홀짝 tint. 호버 시 `bg-primary/10`.
- **KPI 카드**: `text-display-xl` 수치 + sparkline(Electric Indigo, 글로우).
- **아이콘**: `Material Symbols Outlined` (lucide-react와 혼용 가능하지만 stitch 원본은 Material Symbols). 1순위 lucide, 필요 시 Material Symbols를 폰트로 주입.

### 14.7 언어(한·영) 원칙 — ★ 필수
**대상 사용자는 한국 중소기업의 총무 담당자다.** stitch 원본은 영어지만, 실제 제품은 한국어를 기본으로 하되 브랜딩·기술 상태 표현은 영어를 유지한다. 일관된 규칙:

| 영역 | 언어 | 예시 |
|---|---|---|
| 브랜드·로고 | **영어 고정** | `Chongmu PRO Elite`, `Enterprise Edition` |
| 랜딩 hero 타이틀·태그 | **영어 유지**(브랜딩) + 한글 서브카피 | `THE FUTURE OF ENTERPRISE MANAGEMENT` + 서브 한글 설명 |
| 랜딩 Bento 카드 타이틀 | **영어 유지**(디자인 의도) + 한글 본문 | `Strategic Dashboard` / "실시간 경영 지표를…" |
| 상태 뱃지(기술) | **영어 유지** | `System Online`, `Last updated: Just now` |
| 대시보드 페이지 헤더 | **영어**(브랜드 콘셉트) + 한글 서브카피 | `Strategic Dashboard` / "실시간 운영 현황" |
| 사이드바 네비게이션 | **한글** | 대시보드 · 직원정보 · 근태입력 · 급여계산 … |
| KPI 라벨 | **한글** | "이번달 총급여", "연차 사용률", "월말결산 진행률" |
| 버튼(기능성 CTA) | **한글** | "시작하기", "리포트 생성", "전체보기", "일괄 계산" |
| 알림·에러 메시지 | **한글** | "3건의 계약이 만료 예정" |
| 푸터 법적 링크 | **한글** | "개인정보처리방침", "이용약관" |
| 통화 포맷 | **한국형** | `4,250만원` / `42,500,000원` (소형 카드는 축약 `4,250만`) |
| 날짜 | **한국형** | `2026년 4월 23일` 또는 `2026.04.23` |

**판정이 애매한 경우**: 해당 문구가 "브랜딩·분위기"라면 영어, "기능·데이터"라면 한글. 한 섹션 안에서 영·한 혼재는 **의도적 대비**일 때만 허용(예: 영어 카드 타이틀 + 한글 본문).

**금지**: 아무 이유 없이 "Dashboard" / "Employees" 같은 기능 라벨을 영어로 두는 것. Google Translate 스타일의 어색한 직역(예: "당신의 급여를 계산하세요").

### 14.8 레이아웃 (데스크톱 기준)
- 고정 사이드바 `w-72` (288px) — lg 이상에서만.
- 사이드바 배경: `bg-[#020617]/80 backdrop-blur-2xl`, 우측 1px border `border-slate-800/40`.
- 상단바: 검색 + 알림/설정 + 도움말 + 유저 메뉴.
- 메인 콘텐츠: `p-container-padding` (32px).
- 사이드바 네비게이션 항목은 **CLAUDE.md §4의 디렉토리 구조와 1:1**로 매칭.

---

## 📱 15. 반응형 & 모바일 병행 전략

### 15.1 MVP 범위
- **MVP = 반응형 웹 1벌** (데스크톱 + 태블릿 + 모바일 웹).
- **네이티브 앱은 v2 이후.** Capacitor로 웹 쉘을 래핑하는 경로를 남겨두되, MVP에서 네이티브 API는 쓰지 않는다.
- PWA(`next-pwa` + manifest + 아이콘)는 **Phase 7 배포 단계의 선택 과제**. MVP 성공 기준에는 포함하지 않음.

### 15.2 브레이크포인트 규약 (Tailwind 기본 + 약간 조정)
```
기본(모바일)  : 0–639px      → 단일 컬럼, 사이드바는 Drawer, 하단 탭바 노출
sm           : 640–767px    → 단일 컬럼 + 여백 증가
md           : 768–1023px   → 2컬럼 허용, 사이드바는 아이콘만 접힘(64px)
lg           : 1024–1279px  → 사이드바 풀 폭(288px) 전개, 3컬럼 카드
xl           : 1280+        → 대시보드 12-col 그리드 완전 전개
```

### 15.3 네비게이션 전환
- **lg 이상**: 좌측 고정 사이드바(w-72) + 상단바.
- **md**: 사이드바 아이콘 전용(w-16), 라벨은 툴팁.
- **sm 이하**: 사이드바는 햄버거 → Drawer. **하단 고정 탭바**(홈/직원/급여/지출/더보기 5개)로 핵심 메뉴만 노출.
- 구현: `components/shared/Sidebar.tsx`, `components/shared/BottomTabBar.tsx`, 그리고 `app/(dashboard)/layout.tsx`에서 `md:` 미디어 쿼리로 분기.

### 15.4 컴포넌트 반응형 규칙
- **테이블**: md 이하에서는 **카드 리스트로 자동 변환**한다. TanStack Table의 기본 table 대신, `useMediaQuery('md')` 훅으로 렌더링을 분기하거나 CSS로 `display:table` ↔ `display:block`.
- **폼**: sm 이하에서는 `grid-cols-1`, md 이상에서 `grid-cols-2` 또는 3.
- **KPI 4종**: sm `grid-cols-2`, md `grid-cols-2`, lg `grid-cols-4`.
- **차트**: Recharts `ResponsiveContainer` 필수. 모바일에서 축 라벨 회전/간소화.
- **Touch target**: 모바일에서 클릭 가능한 요소는 최소 **44×44 px** 확보. `min-h-11 min-w-11`.

### 15.5 입력·포커스
- 숫자 입력(급여액, 근무시간)은 `inputMode="numeric"` + `pattern` 지정. 모바일 숫자 키패드 유도.
- 날짜 입력은 `<input type="date">` + date-fns 파싱. 커스텀 date picker는 필요 시 shadcn `calendar`로 데스크톱 전용 대체.
- 키보드 올라옴 대비: 모바일 폼은 viewport의 바닥(하단 탭바) 간섭 피하려 `pb-safe` 유틸리티 사용.

### 15.6 성능 예산 (모바일)
- 초기 JS 번들 < 200KB gzip (랜딩). 대시보드는 < 350KB gzip.
- 차트/테이블/폼 라이브러리는 **route-level dynamic import**로 분할.
- 이미지: `next/image` + `sizes` prop 명시.

### 15.7 테스트
- Chrome DevTools 디바이스 에뮬레이션 기본:
  - iPhone 14 Pro (393×852)
  - iPad Mini (768×1024)
  - Desktop 1440
- Phase 7 수동 QA 체크리스트에 **모바일 3 viewport × 핵심 5플로우** 추가.

### 15.8 AI 작업 체크리스트 (반응형)
페이지/컴포넌트 작성 시 항상:
1. [ ] 모바일(기본) 스타일 먼저 작성, `md:` / `lg:`로 확장한다.
2. [ ] 고정 너비/높이 대신 `flex`/`grid` + `min-*`/`max-*` 사용.
3. [ ] 사이드바 의존 UI는 모바일에서도 접근 가능한 대체 경로 제공.
4. [ ] 44px 터치 타겟 규칙 검증.
5. [ ] 테이블 → 카드 리스트 전환 여부 체크.

---

**마지막 업데이트**: 2026-04-23 (Phase 0 진입 시 §14, §15 추가)
**작성 기준**: 2026년 대한민국 근로기준법·국세청 기준
