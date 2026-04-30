# 배포 가이드 — Vercel + Supabase

> Phase 7 산출물. 처음 배포할 때 이 문서를 따라 한다.

---

## 1. 사전 준비

- GitHub 계정 + 이 레포 push 권한
- Vercel 계정 ([vercel.com](https://vercel.com) — GitHub로 가입 가능)
- Supabase 프로젝트 (이미 생성됨 — 본인 계정의 프로젝트 URL/키 사용)

---

## 2. Supabase 프로젝트 점검

배포 전 Supabase Dashboard에서 확인:

| 항목 | 위치 | 확인 사항 |
|---|---|---|
| Schema | Database → Schemas | `chongmu` 스키마가 존재하고 모든 테이블이 마이그레이션되어 있는지 |
| RLS | Database → Tables → 각 테이블 → RLS Policies | 모든 테이블에 정책 활성화 |
| Storage | Storage → receipts | bucket 존재 + RLS 정책 (0005 마이그레이션) |
| Auth | Authentication → Users | 최소 1명의 관리자 계정 존재 |
| Auth Settings | Authentication → URL Configuration | `Site URL`을 배포 후 도메인으로 업데이트 (배포 후 단계 6에서 수행) |

---

## 3. Vercel에 GitHub 레포 연결

1. [vercel.com/new](https://vercel.com/new) 접속
2. **Import Git Repository** → 이 레포 선택 → **Import**
3. 프로젝트명 확인 (예: `nexus-erp`)
4. **Framework Preset**: Next.js (자동 감지됨)
5. **Root Directory**: `./` (그대로)
6. **Build & Output Settings**: 기본값 (Vercel이 `next build` 자동 실행)

**⚠️ Deploy 버튼은 아직 누르지 않는다 — 환경변수 먼저 등록.**

---

## 4. 환경변수 등록 (Vercel Dashboard)

`Settings → Environment Variables` 또는 신규 프로젝트의 `Configure Project` 단계에서:

| Key | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL (`https://xxx.supabase.co`) | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase `anon public` 키 | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` 키 | **Production만** (보안) |

**키 위치**: Supabase Dashboard → `Settings → API`

> 🚨 `SUPABASE_SERVICE_ROLE_KEY`는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 않는다. 서버에서만 사용.

---

## 5. 첫 배포

1. 환경변수 저장 후 **Deploy** 클릭
2. 빌드 로그 모니터링 (`Building` → `Deployment Ready`)
3. 빌드 실패 시:
   - 로그에서 누락된 환경변수 확인
   - `npm run build`를 로컬에서 재현해 동일 에러 디버그

배포 성공 시 `https://<project>.vercel.app` 도메인 발급.

---

## 6. 배포 후 검증

### 6.1 Supabase Auth Site URL 업데이트
Supabase Dashboard → `Authentication → URL Configuration`:
- **Site URL**: `https://<project>.vercel.app` 로 변경
- **Redirect URLs**: `https://<project>.vercel.app/**` 추가
- 변경 안 하면 로그인 후 redirect가 localhost로 남아 깨짐

### 6.2 핵심 플로우 5종 수동 QA
- [ ] `/login` — 관리자 계정 로그인
- [ ] `/employees` — 직원 리스트 + 등록/수정
- [ ] `/attendance` — 근태 입력
- [ ] `/payroll` — 일괄 계산 + 명세서 인쇄
- [ ] `/dashboard` — KPI/차트/알림 모두 데이터 채움

### 6.3 반응형 3-viewport
DevTools에서:
- iPhone 14 Pro (393×852) — 하단탭 + Drawer
- iPad Mini (768×1024) — 사이드바 아이콘 모드
- Desktop (1440) — 풀 사이드바

---

## 7. 도메인 연결 (선택)

자체 도메인 (`yourcompany.com`)을 사용하려면:
1. `Settings → Domains → Add` → 도메인 입력
2. Vercel이 안내하는 DNS 레코드를 도메인 등록 업체에 추가
3. SSL 인증서 자동 발급 (수 분 소요)
4. **Site URL/Redirect URL을 새 도메인으로 다시 업데이트** (Step 6.1 반복)

---

## 8. 롤백 (Production 사고 발생 시)

Vercel Dashboard → `Deployments`:
- 안정 버전 deployment 우측 `⋯` → **Promote to Production**
- 즉시 트래픽이 그 deployment로 전환 (DB 마이그레이션은 별도 처리 필요)

---

## 9. 자주 발생하는 이슈

| 증상 | 원인 | 해결 |
|---|---|---|
| 빌드 시 `Module not found: @/types/database` | 타입 자동 생성 누락 | 로컬에서 `npx supabase gen types ...` 실행 후 커밋 |
| 로그인 후 무한 리디렉트 | Supabase Site URL 미업데이트 | Step 6.1 수행 |
| 영수증 업로드 403 | Storage RLS 정책 누락 | `0005_receipts_bucket.sql` 마이그레이션 적용 |
| 대시보드 차트 빈 화면 | 시드 데이터 없음 | `supabase/seed.sql` 실행 |

---

**다음 단계**: Phase 8 — README/스크린샷 + 시연 영상.
