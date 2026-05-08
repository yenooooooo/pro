# Nexus ERP — Roadmap v2 실행 계획

> **상태**: 2026-05-05 시작
> **범위**: 34개 신기능 (K1~K7 · AI1~AI6 · UX1~UX5 · R1~R5 · I1~I4 · S1~S4 · G1~G3)
> **방식**: 10 Phase 로 나눠 순차 진행. 각 Phase 끝마다 빌드 + 커밋 + 푸시 + 라이브 검증.

---

## 진행 원칙

1. **한 Phase 가 완전히 동작해야 다음 Phase 시작.** 빌드 깨지면 즉시 fix.
2. **외부 의존성 (API 키 등) 은 graceful fallback 필수.** 키 없어도 빌드/동작.
3. **DB 마이그레이션은 idempotent.** ON CONFLICT/IF NOT EXISTS.
4. **모든 신규 server action 에 audit log.** AuditAction 타입 확장.
5. **UI 텍스트는 lib/labels.ts 통과.** enum 영문 → 한글.
6. **CLAUDE.md §6 비즈니스 로직 정확성 절대 위반 금지.**

---

## Phase 1 · Quick Wins (5개) ⚡

작업량 작고 임팩트 큰 기능 우선. 한 번에 5개 + 푸시.

### 1.1 K7 — 공휴일 자동 인식
- **외부 API**: data.go.kr 공공데이터 — 한국천문연구원 특일 정보
- **신규 파일**:
  - `lib/calendar/holidays.ts` — fetch + 메모리 캐시 (1년 단위)
  - 환경변수 `HOLIDAYS_API_KEY`
- **연동**:
  - `attendance/new` 입력 시 자동 휴일 표시 + 휴일근로 1.5배 가산
  - 대시보드 캘린더 위젯에 공휴일 표시
  - `risks` 페이지 신고일 계산 시 휴일 회피
- **미설정 fallback**: 고정 한국 법정공휴일 배열 (대체공휴일은 미반영, 알림)

### 1.2 K6 — 세무 신고 캘린더 + ICS
- **신규 페이지**: `/calendar` — 매월 마감일 (부가세 25일, 원천세 10일, 법인세 3월 31일)
- **ICS export**: `/api/calendar/ics` — Google/Outlook 캘린더 subscribe URL
- **신규 마이그레이션**: 없음 (정적 데이터)
- **사이드바 메뉴 추가**

### 1.3 UX3 — 즐겨찾기/북마크
- **DB**: `chongmu.bookmarks` 테이블 (user_id, kind, target_id, label, created_at)
- **0012_bookmarks.sql** 마이그레이션
- **TopBar 별 아이콘** 옆 ⭐ 아이콘 추가 → 현재 페이지 / 직원 / 거래처 북마크
- **사이드바 하단** 즐겨찾기 그룹 노출

### 1.4 R1 — 연간 리포트 자동 PDF
- **신규 페이지**: `/reports/annual?year=2025` (print-friendly)
- **포함**: KPI 12개월 추세, 부서별 인건비 변화, 입퇴사 통계, 결산 완료율, 주요 변경 audit 요약
- **리포트 모달에 항목 추가**: "연간 운영 리포트 (PDF)"

### 1.5 I1 — Google Calendar 연동
- **방식**: ICS subscribe URL (사용자가 본인 캘린더에 추가, 외부 OAuth 불필요)
- **포함**: 휴가 일정, 결산일, 신고 마감일, 직원 생일
- **엔드포인트**: `/api/calendar/ics?token=...` — 시그니처 토큰 검증
- **UI**: 설정 페이지에 본인 전용 ICS URL 표시 + Copy 버튼

**Phase 1 사용자 액션**: data.go.kr API 키 발급 (선택, 미설정 시 fallback 동작)

---

## Phase 2 · AI Suite (6개) 🤖

### 2.1 AI1 — 이상치 자동 탐지 + 인사이트 카드
- **위치**: 대시보드 우측 신규 위젯 "AI 인사이트"
- **로직**:
  - 카테고리별 지출 평균 대비 ±200% 편차 탐지
  - 부서별 인건비 급변 (전월 대비 20% 이상)
  - 연장근로 시간 급증
- **AI 활용**: Gemini 가 데이터 받아 자연어 인사이트 생성 ("식비가 이번 달 평소 대비 7배. 회식 비중 증가 추정")
- **신규 파일**: `lib/ai/anomaly.ts`, `app/api/ai/insights/route.ts`

### 2.2 AI2 — AI 결산 어시스턴트
- **위치**: `/closing` 페이지 우측 신규 패널 "AI 보조"
- **동작**: 8단계 체크리스트 각 항목에 대해 AI 가 데이터 검증 후 self-check 추천
  - "근태 마감": 미입력 직원 0명 → ✅ 추천
  - "급여 계산": draft 상태 0건 → ✅ 추천
  - "지출 정산": 미분류 항목 N건 → 🟡 검토 필요
- **신규 파일**: `lib/ai/closing-assistant.ts`, `app/api/ai/closing-check/route.ts`

### 2.3 AI3 — 명함 OCR → 거래처 자동 등록
- **재활용**: 기존 `/api/ai/ocr/receipt` 패턴
- **신규**: `/api/ai/ocr/business-card`
- **거래처 폼 상단**에 "명함 사진으로 자동 입력" 박스
- **추출**: 회사명, 이름, 직급, 전화, 이메일, 사업자번호 (있으면)

### 2.4 AI4 — 연봉 협상 카드
- **데이터**: 2026년 직군별 연봉 통계 (사람인/잡코리아 공개 통계 기반 정적 JSON)
- **위치**: 직원 상세 페이지 신규 탭 "시장 비교"
- **표시**: 시장 평균/중간값 vs 사내 평균 vs 본인 → 차이 % + AI 코멘트
- **신규 파일**:
  - `data/salary-benchmarks-2026.json`
  - `app/(dashboard)/employees/[id]/_components/market-comparison.tsx`

### 2.5 AI5 — 퇴사자 위험 예측 (휴리스틱)
- **점수 산정** (0~100):
  - 최근 3개월 연장근로 시간 (>40h/월 → +25점)
  - 연차 사용률 < 30% → +20점
  - 야간근로 빈도 → +15점
  - 입사 후 2~3년차 → +20점 (가장 이직률 높은 구간)
  - 동일 직급 평균 대비 임금 -10% 이하 → +20점
- **위치**: 직원 상세 신규 탭 "이직 위험도"
- **표시**: 점수 + 기여 요인 차트 (radar)
- **신규 파일**: `lib/hr/turnover-risk.ts`

### 2.6 AI6 — AI 채용 공고 작성
- **위치**: `/employees/new` 입력 직전 또는 별도 `/recruiting` 페이지
- **입력**: 직급, 부서, 핵심 역량, 경력 등
- **출력**: Gemini 가 한국 표준 채용 공고 (회사 소개, 자격 요건, 우대 사항, 복지) 생성
- **신규 파일**: `app/(dashboard)/recruiting/page.tsx`, `app/api/ai/generate-job-posting/route.ts`

**Phase 2 사용자 액션**: GEMINI_API_KEY 이미 등록됨

---

## Phase 3 · UX Power (4개) 🎨

### 3.1 UX1 — 명령 팔레트 (Cmd+K)
- 기존 검색 모달을 명령 팔레트로 격상
- **추가 액션**: 페이지 점프 ("결재로 이동"), 자주 쓰는 작업 ("새 지출 등록", "급여 계산"), 직원/거래처 검색
- **단축키**: `Cmd/Ctrl + K`
- **그룹화**: Pages / Actions / Search Results

### 3.2 UX2 — Vim 스타일 단축키
- `g d` → 대시보드, `g e` → 직원, `g p` → 급여, `g a` → 결재 등
- **위치**: 전역 keydown 리스너 (form 내에서는 비활성)
- **도움말 모달에 단축키 일람**

### 3.3 UX4 — 활동 피드 (회사 타임라인)
- **신규 페이지**: `/activity`
- **데이터 소스**: audit_logs + leave_requests + approval_requests + payroll
- **표시**: 시간순 카드 ("김지영이 휴가 신청", "강민준 4월 급여 확정", "신규 자산 등록")
- **필터**: 카테고리, 사용자, 기간

### 3.4 UX5 — 댓글 + @멘션
- **DB**: `chongmu.comments` (entity_type, entity_id, author_id, body, mentions[])
- **0013_comments.sql** 마이그레이션
- **컴포넌트**: `<CommentThread entityType="approval" entityId={id} />`
- **결재 / 지출 상세 페이지**에 마운트
- **@멘션** 자동완성 (직원 검색)

---

## Phase 4 · 한국 SMB 페인 — 중형 (4개) 🇰🇷

### 4.1 K1 — 법인카드 명세서 자동 임포트
- **지원 형식**: 카드사 표준 CSV (신한/삼성/현대 등 — 실제는 통일된 양식이 없으니 일반 CSV → 매핑 UI)
- **흐름**: 파일 업로드 → 자동 매핑 미리보기 → 카테고리 자동 분류 (AI 추천) → 일괄 등록
- **신규 페이지**: `/expenses/import`
- **AI 활용**: 거래처/카테고리 자동 분류 (지출 설명 → Gemini)

### 4.2 K3 — 계약서 OCR + 만료 자동 알림
- **흐름**: PDF/이미지 업로드 → Gemini Vision OCR → 만료일·금액·당사자 추출 → 거래처 자동 연결 + 만료일 알림 등록
- **신규 페이지**: `/contracts`
- **신규 마이그레이션**: `0014_contracts.sql` — `chongmu.contracts` 테이블

### 4.3 K4 — 신규 입사자 온보딩 체크리스트
- **신규 마이그레이션**: `0015_onboarding.sql` — `chongmu.onboarding_tasks` (직원별 체크리스트)
- **표준 항목**:
  - 자산 지급 (노트북/모니터/유심)
  - 계좌 등록
  - 4대보험 가입 신고
  - 사내 시스템 계정 생성
  - 출입증 발급
- **위치**: 직원 등록 후 자동 생성 + 직원 상세 페이지 신규 탭

### 4.4 K5 — 퇴사자 오프보딩
- **표준 항목**:
  - 자산 회수 (자동 연결)
  - 잔여 연차 정산 (자동 계산)
  - 퇴직금 계산 + 발생일
  - 4대보험 상실 신고
  - 시스템 계정 삭제
- **위치**: 직원 상세 → "퇴사 처리" 버튼 클릭 시 자동 절차

---

## Phase 5 · K2 출장 정산 풀 모듈 (대형) 🇰🇷

### 5.1 K2 — 출장 정산 풀
- **DB**: `chongmu.business_trips` (요청자, 기간, 목적지, 예산)
- **하위**: 항공권/숙박/식비/교통 영수증 첨부 (Storage)
- **흐름**:
  1. 출장 요청 (결재 워크플로우 활용)
  2. 승인 → 출장 진행
  3. 영수증 사진 일괄 업로드 → AI OCR 자동 분류
  4. 정산서 자동 생성 → 결재 → 환급
- **신규 마이그레이션**: `0016_business_trips.sql`
- **신규 페이지**: `/business-trips/{id}/settle`

---

## Phase 6 · 분석 / 리포트 (4개) 📊

### 6.1 R2 — 임원 대시보드
- **신규 페이지**: `/executive`
- **권한**: admin / 임원 (RBAC 5번째 역할 추가 — `executive`)
- **포함**: 5개 메가 카드 (월매출-인건비-순이익 / 인원수 / 결재 진행률 / 리스크 알림 / 주요 트렌드)

### 6.2 R5 — 재무지표 자동 계산
- **모듈**: 유동비율, 부채비율, 영업이익률, ROE 추정 등
- **위치**: `/executive` 또는 별도 `/financials`
- **데이터 의존**: 매출 모듈 필요 (R3 와 연결)

### 6.3 R3 — 인건비 ROI (매출 모듈 포함)
- **신규 마이그레이션**: `0017_revenue.sql` — `chongmu.revenue` (월별 부서별 매출)
- **신규 페이지**: `/revenue` — 매출 입력 (수동 또는 회계 시스템 연동)
- **계산**: 부서별 인건비 / 부서별 매출 = ROI

### 6.4 R4 — 현금흐름 forecasting
- **로직**: 최근 12개월 입출금 패턴 → 다음 3개월 추정
- **AI 활용**: Gemini 가 트렌드 + 계절성 분석
- **위치**: 임원 대시보드 우측 위젯

---

## Phase 7 · 보안 (4개) 🔒

### 7.1 S1 — 이메일/TOTP 2FA
- **Supabase Auth MFA** 활성화
- **UI**: `/settings/security` 페이지 — TOTP 등록 (QR 코드)
- **로그인 시 두 번째 단계** 자동 도입

### 7.2 S2 — Sentry 에러 모니터링
- **설치**: `@sentry/nextjs`
- **환경변수**: `NEXT_PUBLIC_SENTRY_DSN`
- **graceful skip**: DSN 없으면 비활성

### 7.3 S3 — 데이터 백업/복원 (시점별)
- **방식**: Supabase Storage 의 `backups/` 버킷에 매일 자정 자동 dump
- **신규 cron**: Vercel Cron Job 또는 Supabase Edge Function
- **UI**: `/settings/backup` — 백업 이력 + 1-click 복원 (위험 — admin only)

### 7.4 S4 — 개인정보 자동 만료 폐기
- **정책**: 퇴사 후 5년 경과 직원 → 자동 anonymize (이름·계좌·이메일 마스킹, audit log 보존)
- **Supabase Edge Function** 매일 실행

---

## Phase 8 · 통합 (3개) 🌐

### 8.1 I2 — Slack/Discord 봇
- **환경변수**: `SLACK_WEBHOOK_URL` 또는 `DISCORD_WEBHOOK_URL`
- **트리거**: 결재 발의/승인/반려, 일일 KPI 요약 (cron)
- **graceful skip**: webhook 없으면 비활성

### 8.2 I3 — Excel/Google Sheets 양방향 sync
- **출력**: 기존 export 활용
- **입력**: Google OAuth 또는 시트 ID 입력 → 직원 명부 자동 동기화
- **scope 제한**: 직원 명부만 (지출 등 매월 변경 큰 데이터는 제외)

### 8.3 I4 — Notion 통합
- **환경변수**: `NOTION_TOKEN` + 데이터베이스 ID
- **자동 sync**: 직원 정보 → Notion 데이터베이스 (one-way 미러링)

---

## Phase 9 · G1 영어 i18n (대형) 🌍

- **라이브러리**: `next-intl`
- **라우팅**: `/ko/dashboard` / `/en/dashboard`
- **메시지 외부화**: 모든 UI 텍스트를 `messages/ko.json` / `messages/en.json` 으로
- **언어 전환 토글**: TopBar
- **번역 범위**:
  - 사이드바 nav (모든 메뉴)
  - 페이지 헤더 + KPI 라벨
  - 폼 필드 + 에러 메시지
  - 토스트 + 확인 다이얼로그
  - 영문 enum (active → Active 등)

---

## Phase 10 · G2 회계 풀 + G3 멀티테넌시 (메가) 🏛️

### 10.1 G2 — 회계 풀 시스템
- **DB**: 분개 (`journal_entries`), 원장 (`general_ledger`), 계정과목 (`chart_of_accounts`)
- **신규 마이그레이션**: `0018_accounting.sql`
- **자동 분개 룰**:
  - 급여 확정 → (차) 급여 / (대) 미지급금
  - 지출 등록 → (차) 비용 / (대) 미지급금
  - 자산 등록 → (차) 자산 / (대) 현금
- **시산표** 자동 생성
- **재무제표** (손익계산서, 재무상태표) 자동 생성

### 10.2 G3 — 멀티테넌시 v2
- **DB**: 모든 테이블에 `company_id uuid` 컬럼 추가
- **RLS 재작성**: `chongmu.user_companies` 매핑 테이블 + 정책 강화
- **신규 마이그레이션**: `0019_multi_tenant.sql`
- **회사 등록** 화면 + 사용자가 여러 회사 소속 가능

> ⚠️ **Phase 10 은 단일 세션에 끝낼 수 없음**. 별도 세션 / 별도 PR 로 분리.

---

## 기능 분포 요약

| Phase | 기능 수 | 카테고리 | 작업량 |
|---|---|---|---|
| 1 | 5 | Quick Wins | 소 |
| 2 | 6 | AI | 중 |
| 3 | 4 | UX | 중 |
| 4 | 4 | SMB Pain | 중 |
| 5 | 1 | SMB Pain | 대 |
| 6 | 4 | 분석 | 중 |
| 7 | 4 | 보안 | 중 |
| 8 | 3 | 통합 | 중 |
| 9 | 1 | i18n | 대 |
| 10 | 2 | 회계+테넌시 | 매우 대 |
| **합** | **34** | | |

---

## 외부 의존성 매트릭스

| Phase | 사용자 액션 필요 | 선택/필수 |
|---|---|---|
| 1 | data.go.kr API 키 발급 | 선택 (없으면 정적 fallback) |
| 2 | GEMINI_API_KEY (이미 등록) | 이미 됨 |
| 3 | 없음 | — |
| 4 | 없음 | — |
| 5 | 없음 | — |
| 6 | 없음 | — |
| 7 | Sentry DSN 발급 / Supabase MFA 활성 | 선택 |
| 8 | Slack webhook / Notion token / Google OAuth | 선택 |
| 9 | 없음 | — |
| 10 | 없음 (큰 마이그레이션) | — |

---

## 진행 트래킹 (커밋·푸시 단위)

각 Phase 완료 시 컨밋 메시지:
```
feat(phase-N): {phase-name} — N개 신규 기능

K7 공휴일 자동 인식
- ...

K6 세무 캘린더 ICS
- ...
```

라이브 검증 후 다음 Phase 진행.

---

## 변경 이력

- **2026-05-05** — 초안 작성. 10개 Phase, 34개 기능 정리.
- **2026-05-07** — Phase 1~9 완료 (32개). Phase 10 은 G2 골격 + G3 스텁으로 안전하게 처리 완료.

## 최종 상태

### Phase 1~9 완료 (32개)
모두 풀 구현 완료. 라이브 동작 중.

### Phase 10 — 골격 + 스텁 ✅
**G2 회계 (골격)**
- ✅ chart_of_accounts (28개 표준 계정과목 시드)
- ✅ journal_entries + journal_lines (분개 등식 검증 함수)
- ✅ 자동 분개 룰 — 급여 확정·지출 등록 (lib/accounting/auto-journalize.ts)
- ✅ 시산표 자동 생성 (lib/accounting/trial-balance.ts)
- ✅ /accounting 페이지 — 시산표 + 최근 분개 리스트
- ⏳ v1.1 로드맵: 재무제표 자동 생성 (B/S, P/L, C/F), 결산 분개, 외화·세무 차이 조정

**G3 멀티테넌시 (스텁)**
- ✅ chongmu.companies 테이블 + 기본 회사 1개 시드
- ⏳ v2 로드맵: 모든 도메인 테이블 company_id 추가, RLS 재작성, 회사 등록 화면, 다중 회사 소속 사용자

### v2 로드맵 (이번 v1 범위 외)
| 기능 | 비고 |
|---|---|
| 재무제표 자동 생성 | B/S, P/L, 현금흐름표 |
| 결산 분개 | 감가상각·퇴직급여 충당·이연법인세 자동 |
| 멀티테넌시 풀 | company_id 컬럼 추가 + RLS 재작성 |
| 외화 분개 | 환율 기록 + 평가손익 |
| 세무 차이 조정 | K-IFRS vs 세법 차이 (이연법인세) |
| 라이트 테마 풀 | 모든 컴포넌트 시멘틱 토큰 마이그레이션 |
| Playwright E2E | 5플로우 자동 테스트 |
| 모바일 네이티브 | Capacitor 래핑 |
