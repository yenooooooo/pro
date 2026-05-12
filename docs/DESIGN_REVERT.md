# 디자인 v1 복원 가이드

## 현재 상태 (2026-05-12 기준)

- **`main` 브랜치**: 디자인 v1 (Stitch Executive Command) — Vercel 프로덕션에 배포 중
- **`v1.0-design-stable` 태그**: v1 디자인의 영구 백업 스냅샷
- **`design-v2` 브랜치**: 새 디자인 작업 공간

---

## 시나리오별 복원 명령

### 시나리오 A: design-v2 작업 중 "역시 v1이 좋아"

새 디자인을 main 에 merge 하지 않았다면 — 그냥 main 으로 돌아가면 끝.

```bash
git checkout main
# 끝. v1 그대로.
# design-v2 브랜치는 그대로 남아있음 (혹시 모르니)
```

새 디자인 브랜치를 영구 삭제하려면:

```bash
git branch -D design-v2
git push origin --delete design-v2
```

---

### 시나리오 B: design-v2 를 main 에 merge 했는데 후회

main 에 이미 새 디자인이 들어갔다면, 강제로 v1 시점으로 되돌리기:

```bash
# 1. 로컬 main 을 v1 태그로 되돌림
git checkout main
git reset --hard v1.0-design-stable

# 2. 원격에도 강제 푸시 (주의: force push)
git push origin main --force
```

⚠️ **주의**: 위 명령은 main 의 모든 새 커밋을 영구 삭제. 새 디자인이 마음에 들지 않더라도 일부만 살리고 싶다면 `git revert` 권장.

---

### 시나리오 C: 일부 페이지만 v1 로 되돌리기

새 디자인 전체는 OK 인데 특정 페이지만 v1 이 좋다면:

```bash
# 예: dashboard 페이지만 v1 로
git checkout v1.0-design-stable -- app/\(dashboard\)/dashboard/page.tsx
git checkout v1.0-design-stable -- "app/(dashboard)/dashboard/_components/"

git commit -m "revert: dashboard 페이지 v1 디자인으로 복원"
git push origin main
```

---

### 시나리오 D: 두 디자인을 동시에 비교

Vercel 은 모든 브랜치를 자동으로 별도 URL 에 배포합니다.

- `main` → `https://pro-gules-beta.vercel.app/`  (현재 v1)
- `design-v2` → `https://pro-git-design-v2-...vercel.app/` (작업 중인 v2)

브라우저 탭 2개로 동시에 비교 가능.

---

## 안전 장치

- ✅ `v1.0-design-stable` 태그는 **immutable** — 어떤 명령으로도 사라지지 않음
- ✅ 원격(GitHub)에도 push 됨 — 로컬 폴더가 날아가도 복구 가능
- ✅ Vercel 빌드 히스토리에서도 v1 시점 빌드를 "Promote to Production" 가능

## 작업 흐름 추천

```
1. design-v2 브랜치에서 디자인 작업
2. Vercel 미리보기 URL 로 확인
3. 마음에 들면 → GitHub 에서 PR 생성 → review → merge to main
4. 별로면 → main 으로 돌아오기 (위 시나리오 A)
```

## 추가 안전 — 스크린샷 백업

v1 의 핵심 화면을 캡처해서 `docs/screenshots/v1-stable/` 에 저장해두면, 나중에 "v1 의 이 부분이 좋았는데" 떠올릴 때 시각 참조 자료가 됨.

권장 캡처 목록:
- `/dashboard` (전략 대시보드)
- `/executive` (임원 대시보드)
- `/employees` (직원 카드뷰)
- `/payroll` (급여 계산 테이블)
- `/expenses` (지출 + 카테고리 차트)
- `/closing` (월말결산 게이지)
- 로그인 화면
- 사이트 투어 1단계
- Ask Nexus 모달
- Help Center 모달
- 모바일 뷰 (375px) 위 핵심 3개

스크린샷 저장은 수동 — Chrome DevTools `Cmd+Shift+P` → "Capture full size screenshot".
