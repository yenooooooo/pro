# 🛡️ Nexus ERP — 디자인 v1 복원 완전 가이드

> **이 문서의 목적**: 한 달, 일 년 뒤에 어떤 상황에서도 디자인 v1 으로 100% 복원할 수 있도록 모든 명령과 정보를 박제.
>
> **AI 어시스턴트에게**: 사용자가 "v1 디자인으로 돌려줘" / "원래대로 복원" / "디자인 백업 복구" 등을 요청하면 이 문서의 절차를 따른다.

---

## 📌 핵심 식별자 (절대 변경 금지)

| 항목 | 값 |
|---|---|
| **백업 태그** | `v1.0-design-stable` |
| **태그 커밋 해시** | `d43a9249b0112852ca092760b66bca74b4ef1db1` |
| **백업 시점** | 2026-05-12 (Phase 1~10 완료 + UX 패키지 + i18n) |
| **저장소** | https://github.com/yenooooooo/pro |
| **로컬 ZIP** | `C:\Users\ailee\Desktop\nexus-erp-v1.0-design-stable-2026-05-12.zip` (2.8MB) |
| **브랜치** | `main` (v1 운영) / `design-v2` (재작업 공간) |
| **Vercel 프로덕션 URL** | https://pro-gules-beta.vercel.app/ |

---

## 🗺️ 백업 위치 (3중 보험)

```
1. 로컬 git 저장소     C:\Users\ailee\github\PRO\.git
                         └─ refs/tags/v1.0-design-stable

2. GitHub 원격 (영구)   https://github.com/yenooooooo/pro
                         └─ tag: v1.0-design-stable
                         └─ branch: main (현재 v1 상태)
                         └─ branch: design-v2 (작업용)

3. Desktop ZIP (오프라인)  C:\Users\ailee\Desktop\
                         └─ nexus-erp-v1.0-design-stable-2026-05-12.zip
```

**3 군데 모두 동시 파괴 = 사실상 불가능**. 단 하나만 살아있어도 완벽 복원.

---

## 🔄 시나리오별 복원 명령

### ✅ 시나리오 A — 가장 흔한 케이스: design-v2 폐기

> 새 디자인을 main 에 merge 하지 않은 상태. design-v2 브랜치에서만 작업했다면 이 케이스.

```bash
# 1. main 으로 이동 (v1 그대로)
git checkout main

# 2. (선택) design-v2 브랜치 영구 삭제
git branch -D design-v2
git push origin --delete design-v2

# 3. (선택) 최신 상태 확인
git pull origin main
git status
```

**소요 시간**: 5초. **위험도**: 없음.

---

### ✅ 시나리오 B — design-v2 가 main 에 merge 되었는데 복원 원함

> main 브랜치에 새 디자인이 이미 들어가 배포된 상태. v1 으로 강제 되돌림.

```bash
# 1. main 브랜치 확인
git checkout main
git pull origin main

# 2. v1 태그 시점으로 강제 리셋
git reset --hard v1.0-design-stable

# 3. 원격에도 강제 푸시 (Vercel 이 자동으로 v1 재배포)
git push origin main --force

# 4. 확인
git log -1 --oneline
# 출력에 "feat(ux): 모달 scroll lock + 사이트 투어 확장..." 보이면 성공
```

**소요 시간**: 30초 (Vercel 재배포 포함 ~2분).
**위험도**: main 의 새 커밋들이 영구 삭제됨 — 새 디자인을 따로 백업하고 싶다면 먼저 `git tag v2.0-backup` 찍어두기.

---

### ✅ 시나리오 C — 일부 페이지만 v1 로

> 새 디자인 전체는 OK 인데 특정 페이지/컴포넌트만 v1 으로.

```bash
# 예시 1: dashboard 페이지만
git checkout v1.0-design-stable -- "app/(dashboard)/dashboard/page.tsx"
git checkout v1.0-design-stable -- "app/(dashboard)/dashboard/_components/"

# 예시 2: 디자인 토큰만 (tailwind config + globals.css)
git checkout v1.0-design-stable -- tailwind.config.ts app/globals.css

# 예시 3: shadcn/ui 전체
git checkout v1.0-design-stable -- "components/ui/"

# 변경 사항 커밋
git add -A
git commit -m "revert: 일부 v1 디자인 복원"
git push origin main
```

---

### ✅ 시나리오 D — 동시 비교 (어느 게 나은지 결정 못 함)

Vercel 은 브랜치마다 별도 URL 을 자동 배포합니다.

```
main      → https://pro-gules-beta.vercel.app/                (v1)
design-v2 → https://pro-git-design-v2-yenooooooo.vercel.app/  (v2)
```

브라우저 탭 2개로 동시에 비교 후 결정.

---

### ⚠️ 시나리오 E — 비상: GitHub 저장소가 사라짐

> 계정 해킹, 실수로 repo 삭제 등.

```bash
# 1. 로컬 .git 폴더에서 직접 복원
cd C:\Users\ailee\github\PRO
git checkout v1.0-design-stable
git checkout -b restored-main

# 2. 새 GitHub repo 생성 후 push
# (GitHub 에서 새 repo 만든 다음)
git remote set-url origin https://github.com/yenooooooo/NEW_REPO_NAME.git
git push -u origin restored-main:main
git push origin v1.0-design-stable  # 태그도 같이
```

---

### ⚠️ 시나리오 F — 최악: 노트북 자체가 망가짐

> 로컬 .git 폴더도 사라짐. GitHub 도 손상.

**Desktop ZIP 으로 완전 복구**:

```bash
# 1. 새 노트북/환경에 ZIP 압축 해제
# (Windows 탐색기에서 nexus-erp-v1.0-design-stable-2026-05-12.zip 우클릭 → 압축 풀기)

# 2. 폴더 진입
cd extracted-folder-path

# 3. git 초기화 (ZIP 은 git 메타데이터 없는 소스만)
git init
git add -A
git commit -m "restore: v1.0-design-stable from offline ZIP backup"

# 4. (선택) 새 GitHub repo 에 push
# 5. npm install
# 6. .env.local 재설정 (Supabase URL/Key)
# 7. npm run dev
```

**핵심**: ZIP 에 .env 가 없으니 새 환경변수 셋업 필요.

---

## 🤖 AI 어시스턴트 (Claude) 에게

사용자가 다음과 같이 요청하면 **시나리오 A 부터 시도**, 안 되면 단계별로 진행:

| 사용자 표현 | 적용 시나리오 |
|---|---|
| "v1 디자인으로 돌려줘" | A → (안 되면) B |
| "원래대로 복원해줘" | A → B |
| "디자인 백업 복구" | A → B |
| "design-v2 폐기" | A |
| "main 에 잘못 merge 했어" | B |
| "이 페이지만 v1 로" | C |
| "동시에 비교하고 싶어" | D |
| "GitHub repo 가 사라졌어" | E |
| "노트북 다시 셋업했어" | F |

**복원 전 확인 사항**:
```bash
# 1. 태그가 살아있는지
git tag -l "v1.0-design-stable"

# 2. 태그 커밋 해시가 맞는지 (d43a9249... 시작)
git rev-parse v1.0-design-stable

# 3. 작업 디렉터리에 미저장 변경 있는지
git status

# 4. 만약 미저장 변경이 있으면 사용자에게 stash 여부 확인
git stash push -m "before-v1-restore"
```

**복원 후 검증**:
```bash
# 1. 빌드 통과 확인
npm run build

# 2. TypeScript 에러 없는지
npx tsc --noEmit

# 3. 핵심 페이지 sanity check
# - app/(dashboard)/dashboard/page.tsx 가 stitch glass-panel 사용
# - tailwind.config.ts 에 primary-electric = #c0c1ff
# - i18n/messages/ko.json, en.json 존재
```

---

## 🎯 빠른 참조 — 마법의 한 줄

**가장 흔한 케이스 (시나리오 A)**:
```bash
git checkout main
```

**main 이 오염된 경우 (시나리오 B)**:
```bash
git reset --hard v1.0-design-stable && git push origin main --force
```

이거 하나만 외우셔도 됩니다.

---

## 📋 v1 디자인 핵심 요소 (참조용)

복원 후 이 항목들이 보이면 정상:

- [ ] 다크 테마 전용 (배경 `#0b1326`)
- [ ] Primary 색상 — Electric Indigo `#c0c1ff`
- [ ] Glass-panel 카드 (`rgba(23,31,51,0.6)` + `backdrop-filter: blur(12px)` + 상단 rim light)
- [ ] Inter 폰트 단일
- [ ] 8px 그리드 시스템
- [ ] 사이드바 좌측 고정 (lg 이상 `w-72`)
- [ ] 하단 탭바 (sm 이하)
- [ ] 사이트 투어 7단계 (첫 방문 시 자동)
- [ ] Help Center 모달 — 페이지 가이드 6 카테고리 × 24 페이지
- [ ] EN 토글 (우상단 🌐)
- [ ] AskNexusModal — Ctrl+J, NDJSON 스트리밍
- [ ] 데모 배너 (DEMO_EMAIL 일치 시)

---

## 📸 스크린샷 백업 (권장)

`docs/screenshots/v1-stable/` 폴더에 수동 캡처:

권장 캡처 목록 11장:
1. `/dashboard` — 전략 대시보드
2. `/executive` — 임원 대시보드
3. `/employees` — 직원 카드뷰
4. `/payroll` — 급여 계산 테이블
5. `/expenses` — 지출 + 카테고리 차트
6. `/closing` — 월말결산 게이지
7. `/login` — 로그인 화면
8. 사이트 투어 1단계 (welcome)
9. Ask Nexus 모달 (Ctrl+J)
10. Help Center 모달
11. 모바일 뷰 375px (대시보드)

**캡처 방법**: Chrome DevTools 열기 → `Ctrl+Shift+P` → "Capture full size screenshot" 검색.

---

## 🔐 최종 안전 체크리스트

매월 한 번씩 확인 권장:

- [ ] `git ls-remote origin refs/tags/v1.0-design-stable` 실행 → 해시 출력되면 GitHub OK
- [ ] Desktop ZIP 파일 존재 확인
- [ ] (선택) 클라우드 드라이브에 ZIP 복사본 동기화

---

**마지막 업데이트**: 2026-05-12
**문서 작성자**: Claude (AI 어시스턴트, Opus 4.6)
