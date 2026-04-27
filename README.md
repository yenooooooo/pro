# Nexus ERP — 중소기업 총무 통합 플랫폼

중소기업(~50인) 총무 담당자의 월간 반복 업무를 **하나의 웹앱으로 통합**한 미니 ERP.
엑셀 10개 대신 웹앱 1개.

> **프로덕션 완성형 프로덕트** — 자세한 내용은 [`CLAUDE.md`](./CLAUDE.md) 참조.

## 📋 기술 스택
- **Next.js 14** (App Router) + **TypeScript (strict)**
- **Tailwind CSS** + **shadcn/ui** + stitch "Executive Command" 디자인 시스템
- **Supabase** (PostgreSQL + Auth + Storage + RLS)
- **React Hook Form + Zod** · **TanStack Table** · **Recharts** · **date-fns**
- **Vitest** (계산 로직 유닛 테스트)
- **반응형 웹 (모바일 + 태블릿 + 데스크톱)**

## 🚀 개발 시작

```bash
npm install
cp .env.example .env.local   # Supabase 키 입력
npm run dev
```

- 개발 서버: http://localhost:3000
- 타입 체크: `npm run typecheck`
- 린트: `npm run lint`
- 테스트: `npm run test`

## 📐 디렉토리 구조

[`CLAUDE.md` §4](./CLAUDE.md) 참조.

## 🎨 디자인 레퍼런스

[`_design-references/`](./_design-references/) 하위 5개 폴더 (stitch-generated).
디자인 토큰은 [`CLAUDE.md` §14](./CLAUDE.md)에 정리되어 있고 `tailwind.config.ts` + `app/globals.css`에 주입됨.

## 📅 Phase 진행

[`PLAN.md`](./PLAN.md) 참조. Phase 0 환경 세팅 완료.

## 📝 라이선스

포트폴리오 용도 개인 프로젝트.
