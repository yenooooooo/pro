import Link from "next/link";
import { TypewriterText } from "@/components/landing/Ticker";

/**
 * Nexus ERP — v2 Editorial Landing
 *
 * 디자인 출처: _design-v2-source/Landing.html
 * 토큰: tailwind.config.ts (gold / bg / line / text), globals.css (.btn, .eyebrow, .panel, .brand-mark)
 *
 * 구조:
 *  01 · LIVE TICKER (sticky top)
 *  02 · TOPBAR (NEXUS mark + nav + Sign In/Demo)
 *  03 · HERO (eyebrow · serif headline · meta strip · editorial mock)
 *  04 · COMPLIANCE TICKER STRIP
 *  05 · STATS (4 numbers)
 *  06 · MODULES (16 modules grid)
 *  07 · AI / INTELLIGENCE
 *  08 · COMPLIANCE (3 law cards w/ code blocks)
 *  09 · ARCHITECTURE (diagram + stack list)
 *  10 · CLOSER CTA
 *  11 · FOOTER
 */

const NAV_LINKS = [
  { num: "01", label: "Platform", href: "#modules" },
  { num: "02", label: "Intelligence", href: "#ai" },
  { num: "03", label: "Compliance", href: "#compliance" },
  { num: "04", label: "Infrastructure", href: "#arch" },
  { num: "05", label: "Docs", href: "#docs" },
];

const TICKER_ITEMS = [
  { label: "PAYROLL", value: "₩84.21M MTD", delta: "▲ 2.4%", tone: "up" as const },
  { label: "HEAD", value: "15 ACTIVE" },
  { label: "RISK", value: "2 ACTIVE · §53 §61", tone: "dn" as const },
  { label: "EDI", value: "D−5 · CSV READY 87%" },
  { label: "OCR", value: "142 PROCESSED · 98.4% CONF" },
  { label: "APPROVALS", value: "7 PENDING · AVG 2.1d" },
  { label: "AI", value: "23 QUERIES TODAY · GEMINI VISION" },
  { label: "UPTIME", value: "99.998%" },
];

const COMPLIANCE_CHIPS = [
  { law: "근로기준법 §53", text: "주 52시간" },
  { law: "근기법 §60", text: "연차 촉진" },
  { law: "소득세법 §45", text: "연말정산 자동" },
  { law: "근퇴법 §8", text: "퇴직급여 충당" },
  { law: "국세청 odcloud", text: "사업자 진위" },
  { law: "최저임금법", text: "2026" },
  { law: "4대보험", text: "EDI" },
  { law: "RLS", text: "역할 격리" },
  { law: "감사 로그", text: "28종" },
];

const STATS = [
  { num: "15", unit: "명", label: "평균 운영 인원", desc: "1인 담당자 + 직원 15명 시나리오 데모." },
  { num: "2,700", unit: "행", label: "연 근태 데이터", desc: "CSV 가져오기 · 일별 입력 · 월별 집계." },
  { num: "8", unit: "단계", label: "월말결산 체크리스트", desc: "PDF 종합 리포트로 사장님 보고." },
  { num: "14", unit: "종", label: "차별화 기능", desc: "대기업 ERP가 빠진 한국 노무·세무 디테일." },
];

const MODULES = [
  { code: "M-01", title: "대시보드", path: "/dashboard", desc: "KPI 4종 · 부서별 인건비 · 카테고리별 지출 · 6개월 추세." },
  { code: "M-02", title: "직원 정보", path: "/employees", desc: "CRUD · 엑셀 import · 근태/급여/연차 통합 탭." },
  { code: "M-03", title: "근태", path: "/attendance", desc: "일별 입력 · CSV 가져오기 · 월별 집계." },
  { code: "M-04", title: "급여", path: "/payroll", desc: "근기법 §56 일괄 계산 · 명세서 PDF · 원장 export." },
  { code: "M-05", title: "연차", path: "/leave", desc: "발생·사용·잔여 · 결재 워크플로우." },
  { code: "M-06", title: "지출", path: "/expenses", desc: "영수증 OCR · 카테고리·거래처·월별 원장." },
  { code: "M-07", title: "거래처", path: "/vendors", desc: "국세청 진위확인 · 계약 만료 알림." },
  { code: "M-08", title: "자산", path: "/assets", desc: "정액법 감가상각 · 내용연수 · 잔존가." },
  { code: "M-09", title: "월말결산", path: "/closing", desc: "8단계 체크리스트 · 종합 PDF 리포트." },
  { code: "M-10", title: "전자결재", path: "/approvals", desc: "1~5단 결재선 · 단계별 audit log · 이메일 알림." },
  { code: "M-11", title: "법적 리스크", path: "/risks", desc: "근기법 5종 자동 점검 · 위반 사전 차단." },
  { code: "M-12", title: "인건비 시뮬", path: "/simulator", desc: "슬라이더 4개로 채용·인상·최저임금 What-if." },
  { code: "M-13", title: "퇴직급여", path: "/retirement", desc: "근퇴법 §8 충당부채 자동 · 부서별 추적." },
  { code: "M-14", title: "연말정산", path: "/year-end", desc: "소득세법 §45 · 누진 7단계 자동 결정세액." },
  { code: "M-15", title: "감사 로그", path: "/audit-logs", desc: "28종 액션 자동 기록 · 액션·기간 필터." },
  { code: "M-16", title: "시스템 설정", path: "/settings", desc: "4대보험 요율 · 결산 체크리스트 편집." },
];

const ARCH_LIST = [
  {
    k: "Frontend",
    v: "Next.js 14 · Server Components · TypeScript strict · Tailwind + Stitch \"Executive Command\" 디자인 토큰.",
  },
  {
    k: "Backend",
    v: "Supabase PostgreSQL · Row Level Security 4단계 (admin / hr / finance / employee) · Server Actions + Route Handlers.",
  },
  {
    k: "AI Layer",
    v: "Gemini 2.5 Flash 무료 tier + Tesseract.js fallback. 모든 쿼리 schema-context whitelist 통과.",
  },
  {
    k: "Security",
    v: "계좌번호 마스킹 · 주민번호 미저장 · service_role 키 차단 · 28종 액션 감사 로그.",
  },
  {
    k: "Quality",
    v: "Vitest · TS strict · ESLint · GitHub Actions CI 자동 lint·typecheck·test·build.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text-1">
      {/* ============================================================
       * 01 · LIVE TICKER
       * ============================================================ */}
      <div className="sticky top-0 z-[60] flex h-8 items-center overflow-hidden border-b border-line bg-[#050608] font-mono text-[10px] uppercase tracking-[0.12em] text-text-2">
        <div className="flex h-full flex-shrink-0 items-center gap-2 border-r border-line px-4 text-gold">
          <span className="h-[6px] w-[6px] animate-gold-pulse rounded-full bg-gold shadow-[0_0_8px_#F5C26B]" />
          LIVE · NEXUS OPS
        </div>
        <div className="relative h-full flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-16 bg-gradient-to-r from-[#050608] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-16 bg-gradient-to-l from-[#050608] to-transparent" />
          <div className="ticker-run flex h-full items-center gap-10 whitespace-nowrap pl-5">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                <b className="font-normal text-text-1">{t.label}</b> {t.value}
                {t.tone === "up" && <i className="text-[9px] not-italic text-[#6BCB8A]">{t.delta}</i>}
                {t.tone === "dn" && <i className="text-[9px] not-italic text-[#E06B5F]" />}
              </span>
            ))}
          </div>
        </div>
        <div className="flex h-full flex-shrink-0 items-center border-l border-line px-4 tabular-nums text-gold">
          14:22:08
        </div>
      </div>

      {/* ============================================================
       * 02 · TOPBAR
       * ============================================================ */}
      <header className="sticky top-8 z-50 border-b border-line bg-bg/72 backdrop-blur-[14px] backdrop-saturate-[140%]">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-8">
          <Link href="/" className="flex items-center gap-[10px] font-mono text-[13px] font-medium tracking-[0.15em]">
            <span className="brand-mark" aria-hidden />
            <span>
              <span className="text-text-1">NEXUS</span>
              <em className="ml-2 text-[11px] not-italic text-text-3">ERP / v1.4</em>
            </span>
          </Link>

          <nav className="hidden items-center gap-9 lg:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="relative inline-flex items-center py-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-text-2 transition-colors hover:text-text-1"
              >
                <span className="mr-2 text-[10px] tabular-nums text-text-4">{l.num}</span>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="btn">
              로그인
            </Link>
            <Link href="/login" className="btn btn-primary">
              데모 시작 <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================
       * 03 · HERO
       * ============================================================ */}
      <section className="relative overflow-hidden border-b border-line py-24 lg:py-[96px]">
        {/* Grid backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(#232830 1px, transparent 1px), linear-gradient(90deg, #232830 1px, transparent 1px)",
            backgroundSize: "96px 96px",
            maskImage:
              "radial-gradient(ellipse 100% 80% at 50% 50%, #000 0%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 100% 80% at 50% 50%, #000 0%, transparent 70%)",
          }}
        />
        {/* Soft gold radial — replaces the canvas sphere */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 45% at 72% 50%, rgba(245,194,107,0.10) 0%, rgba(245,194,107,0.04) 35%, transparent 70%)",
          }}
        />

        <div className="relative z-[2] mx-auto grid max-w-[1360px] grid-cols-1 items-center gap-20 px-8 lg:grid-cols-[1.15fr_1fr]">
          {/* LEFT — copy */}
          <div>
            <div className="mb-9 inline-flex items-center gap-3 border border-line-2 px-[14px] py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-2">
              <span className="h-[6px] w-[6px] rounded-full bg-gold shadow-[0_0_12px_#F5C26B]" />
              Enterprise Edition · 2026 Q2 Release
            </div>

            <h1 className="mb-8 font-serif text-[clamp(56px,7.2vw,108px)] font-normal leading-[0.96] tracking-[-0.025em] text-text-1">
              한 명을 위한
              <br />
              <em className="not-italic italic text-gold">풀스택 ERP.</em>
              <br />
              <span className="italic text-text-3 line-through decoration-text-3 decoration-2">
                스프레드시트.
              </span>
              <span className="mt-[18px] block font-mono text-[0.32em] font-normal uppercase tracking-[0.08em] text-text-2">
                Built for the solo administrator.
              </span>
            </h1>

            <p className="mb-10 max-w-[520px] text-[17px] leading-[1.65] text-text-2">
              중소기업의 총무 1인 담당자가{" "}
              <strong className="font-medium text-text-1">
                인사 · 근태 · 급여 · 연차 · 지출 · 자산 · 결산
              </strong>
              을 하나의 단일 통제권에서 운영합니다. 근로기준법은 시스템이 보증하고, AI는 질문에 SQL 대신 답합니다.
            </p>

            <div className="mb-16 flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-primary">
                데모 계정으로 둘러보기 <span aria-hidden>→</span>
              </Link>
              <a href="#modules" className="btn">
                17개 모듈 살펴보기
              </a>
            </div>

            <div className="flex gap-12 border-t border-line pt-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
                <b className="mb-1 block font-serif text-[26px] font-normal italic not-italic tracking-[-0.01em] text-text-1 normal-case">
                  <em className="italic">0.4초</em>
                </b>
                평균 응답
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
                <b className="mb-1 block font-serif text-[26px] font-normal italic not-italic tracking-[-0.01em] text-text-1 normal-case">
                  <em className="italic">17</em>
                </b>
                코어 모듈
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
                <b className="mb-1 block font-serif text-[26px] font-normal italic not-italic tracking-[-0.01em] text-text-1 normal-case">
                  <em className="italic">99.99%</em>
                </b>
                가용성
              </div>
            </div>
          </div>

          {/* RIGHT — editorial product mock (CSS-only) */}
          <div className="relative hidden h-[540px] lg:block" style={{ perspective: "1800px" }}>
            {/* main window */}
            <div
              className="absolute left-0 right-[-40px] top-5 h-[480px] border border-line-2 bg-bg-1 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
              style={{ transform: "rotateX(8deg) rotateY(-14deg) rotateZ(1deg)", transformStyle: "preserve-3d" }}
            >
              <div className="flex items-center justify-between border-b border-line px-[14px] py-[10px] font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
                <div className="flex gap-[6px]">
                  <i className="block h-2 w-2 bg-line-2" />
                  <i className="block h-2 w-2 bg-line-2" />
                  <i className="block h-2 w-2 bg-line-2" />
                </div>
                <span>nexus / dashboard</span>
                <span>K · ⌃</span>
              </div>
              <div className="p-[18px]">
                <div className="mb-[18px] grid grid-cols-3 gap-3">
                  <MockKpi label="총 인건비 · MTD" value="₩84.2M" delta="▲ 2.4%" />
                  <MockKpi label="미결 결재" value="7" />
                  <MockKpi label="법적 리스크" value="2" tone="gold" />
                </div>
                <div className="relative h-[160px] border border-line p-[14px]">
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-3">
                    월별 인건비 추세 · 6M
                  </div>
                  <svg viewBox="0 0 320 110" preserveAspectRatio="none" className="mt-2 h-[110px] w-full">
                    <defs>
                      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#F5C26B" stopOpacity="0.35" />
                        <stop offset="1" stopColor="#F5C26B" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 80 L53 72 L106 78 L160 56 L213 60 L266 38 L320 30"
                      fill="none"
                      stroke="#F5C26B"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M0 80 L53 72 L106 78 L160 56 L213 60 L266 38 L320 30 L320 110 L0 110 Z"
                      fill="url(#cg)"
                    />
                    <path
                      d="M0 90 L53 84 L106 88 L160 76 L213 72 L266 58 L320 52"
                      fill="none"
                      stroke="#8FB6E6"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                  </svg>
                </div>
                <div className="mt-4">
                  <MockRow name="김지원 · 개발팀 · 11월 정산" value="₩4,820,000" />
                  <MockRow name="박서연 · 디자인팀 · 11월 정산" value="₩3,950,000" />
                  <MockRow name="이민준 · 영업팀 · 11월 정산" value="₩4,210,000" last />
                </div>
              </div>
            </div>

            {/* modal */}
            <div
              className="absolute right-10 top-[280px] z-[3] w-[360px] border border-line-2 bg-bg-2 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
              style={{
                transform: "rotateX(8deg) rotateY(-14deg) rotateZ(1deg) translateZ(60px)",
              }}
            >
              <div className="flex items-center justify-between border-b border-line px-[14px] py-[10px] font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
                <div className="flex gap-[6px]">
                  <i className="block h-2 w-2 bg-line-2" />
                  <i className="block h-2 w-2 bg-line-2" />
                  <i className="block h-2 w-2 bg-line-2" />
                </div>
                <span>지출 등록 · OCR</span>
                <span className="text-gold">●</span>
              </div>
              <div className="px-4 pt-4 font-serif text-[22px] italic leading-[1.2] text-text-1">
                영수증 1장이면
                <br />
                충분합니다.
              </div>
              <div className="px-4 pb-[14px] pt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
                Gemini Vision · 0.4s
              </div>
              <div className="mx-4 mb-3 flex justify-between border border-line-2 bg-bg px-3 py-[10px] font-mono text-[12px]">
                <span className="text-text-3">거래처</span>
                <span className="text-text-1">현대카드</span>
              </div>
              <div className="mx-4 mb-3 flex justify-between border border-line-2 bg-bg px-3 py-[10px] font-mono text-[12px]">
                <span className="text-text-3">일자</span>
                <span className="text-text-1">2026.05.08</span>
              </div>
              <div className="mx-4 mb-4 flex justify-between border border-line-2 bg-bg px-3 py-[10px] font-mono">
                <span className="self-center text-[12px] text-text-3">금액</span>
                <span className="text-[18px] text-gold">₩142,500</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       * 04 · COMPLIANCE TICKER STRIP (가로 마키)
       * ============================================================ */}
      <div className="relative overflow-hidden border-b border-line bg-bg">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-24 bg-gradient-to-r from-bg to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-24 bg-gradient-to-l from-bg to-transparent" />
        <div className="ticker-run slow flex shrink-0 whitespace-nowrap py-4 font-mono text-[12px] uppercase tracking-[0.08em] text-text-2">
          {[...COMPLIANCE_CHIPS, ...COMPLIANCE_CHIPS].map((c, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-6">
              <span>
                {c.law} <b className="font-medium text-gold">{c.text}</b>
              </span>
              <span className="text-text-4">/</span>
            </span>
          ))}
        </div>
      </div>

      {/* ============================================================
       * 05 · STATS
       * ============================================================ */}
      <section className="border-b border-line py-24">
        <div className="mx-auto max-w-[1360px] px-8">
          <div className="mb-[72px] grid grid-cols-1 gap-16 lg:grid-cols-[220px_1fr]">
            <div className="w-max border-t border-gold pt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
              <b className="mr-3 font-normal text-gold">01</b>The Numbers
            </div>
            <h2 className="max-w-[880px] font-serif text-[clamp(40px,4.4vw,64px)] font-normal leading-[1.02] tracking-[-0.02em]">
              한 명이 운영하는 모든 것을,
              <br />
              <em className="italic text-gold">한 화면에서.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="border-b border-r border-line p-9">
                <div className="font-serif text-[80px] font-normal italic leading-[0.9] tracking-[-0.02em] text-text-1">
                  {s.num}
                  <span className="ml-1.5 font-mono text-[18px] not-italic tracking-[0.05em] text-text-3">
                    {s.unit}
                  </span>
                </div>
                <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-text-2">
                  {s.label}
                </div>
                <div className="mt-1.5 text-[13px] leading-[1.5] text-text-3">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
       * 06 · MODULES
       * ============================================================ */}
      <section id="modules" className="border-b border-line py-32">
        <div className="mx-auto max-w-[1360px] px-8">
          <div className="mb-[72px] grid grid-cols-1 gap-16 lg:grid-cols-[220px_1fr]">
            <div className="w-max border-t border-gold pt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
              <b className="mr-3 font-normal text-gold">02</b>The Platform
            </div>
            <div>
              <h2 className="max-w-[880px] font-serif text-[clamp(40px,4.4vw,64px)] font-normal leading-[1.02] tracking-[-0.02em]">
                17개 모듈,
                <br />
                <em className="italic text-gold">하나의 진실의 출처.</em>
                <br />
                <span className="text-text-3">엑셀 파일 17개로 운영하던 일을 한 자리에.</span>
              </h2>
              <p className="mt-6 max-w-[640px] text-[16px] leading-[1.65] text-text-2">
                분리된 시스템이 만드는 정합성 오류와 이중 입력을 제거합니다. 모든 모듈은 동일한 RLS 정책과 감사 로그를 공유합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => (
              <a
                key={m.code}
                href="/login"
                className="group relative min-h-[220px] border-b border-r border-line p-7 transition-colors hover:bg-bg-1"
              >
                <div className="mb-8 font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
                  {m.code}
                </div>
                <div className="mb-2 font-serif text-[26px] leading-[1.1] tracking-[-0.015em] text-text-1">
                  {m.title}
                </div>
                <div className="mb-[14px] font-mono text-[11px] text-gold-soft">{m.path}</div>
                <div className="text-[13px] leading-[1.5] text-text-2">{m.desc}</div>
                <span className="absolute bottom-6 right-7 font-mono text-text-3 transition-all group-hover:translate-x-1 group-hover:text-gold">
                  →
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
       * 07 · INTELLIGENCE (AI)
       * ============================================================ */}
      <section id="ai" className="border-b border-line bg-bg-1 py-32">
        <div className="mx-auto max-w-[1360px] px-8">
          <div className="mb-[72px] grid grid-cols-1 gap-16 lg:grid-cols-[220px_1fr]">
            <div className="w-max border-t border-gold pt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
              <b className="mr-3 font-normal text-gold">03</b>The Intelligence
            </div>
            <h2 className="max-w-[880px] font-serif text-[clamp(40px,4.4vw,64px)] font-normal leading-[1.02] tracking-[-0.02em]">
              SQL을 쓰지 마세요.
              <br />
              <em className="italic text-gold">물어보세요.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 items-center gap-20 lg:grid-cols-[1fr_1.1fr]">
            <div className="flex flex-col gap-7">
              <AiFeature
                active
                title={<><em className="italic text-gold">Ask Nexus.</em> 자연어 질의.</>}
                desc={`"개발팀 평균 기본급은?" — 시스템이 SQL을 작성하고, 화이트리스트로 검증한 뒤, 표와 인사이트를 반환합니다. 금지된 컬럼에는 접근하지 않습니다.`}
                kbd={["Ctrl", "J"]}
              />
              <AiFeature
                title={<>영수증 <em className="italic text-gold">OCR 듀얼모드.</em></>}
                desc="사진 한 장 → 일자·금액·VAT·거래처 자동 입력. Gemini Vision 우선, 실패 시 Tesseract.js로 fallback. 네트워크가 끊겨도 멈추지 않습니다."
              />
              <AiFeature
                title="AI 안전장치."
                desc="schema-context whitelist + isSafeQuery 검증. 모델이 작성한 모든 쿼리는 실행 전 정적 분석을 거칩니다. 급여·주민번호·계좌번호는 컨텍스트에서 영구 제거됩니다."
              />
            </div>

            {/* command palette mock — 타이핑 애니메이션 */}
            <div className="border border-line-2 bg-bg-2 text-[13px] shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-[14px] border-b border-line px-[22px] py-[18px]">
                <span className="font-mono text-[16px] text-gold">✦</span>
                <div className="flex-1 font-sans text-[16px] text-text-1">
                  <TypewriterText
                    text="개발팀 평균 기본급은"
                    speed={80}
                    startDelay={800}
                    loop
                    pauseAtEnd={4000}
                  />
                </div>
                <span className="border border-line px-2 py-[3px] font-mono text-[10px] tracking-[0.08em] text-text-3">
                  ⌃ J
                </span>
              </div>
              <div className="border-b border-line px-[22px] py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
                생성된 SQL · 화이트리스트 검증 통과
              </div>
              <pre className="px-[22px] py-[14px] font-mono text-[11px] leading-[1.7] text-text-2">
                <span className="text-[#8FB6E6]">SELECT</span> AVG(base_salary){"\n"}
                <span className="text-[#8FB6E6]">FROM</span> payroll p <span className="text-[#8FB6E6]">JOIN</span> employees e <span className="text-[#8FB6E6]">ON</span> p.employee_id = e.id{"\n"}
                <span className="text-[#8FB6E6]">WHERE</span> e.department = <span className="text-gold">{`'개발팀'`}</span> <span className="text-[#8FB6E6]">AND</span> p.period = <span className="text-gold">{`'2026-05'`}</span>;
              </pre>
              <div className="p-[22px]">
                <div className="mb-[14px] font-mono text-[13px] text-text-2">{"// 응답 · 0.42초"}</div>
                <div className="mb-[18px] font-serif text-[26px] italic leading-[1.25] text-text-1">
                  평균 기본급은{" "}
                  <b className="font-mono font-normal not-italic text-gold">₩4,182,000</b>입니다. 전월 대비{" "}
                  <b className="font-mono font-normal not-italic text-gold">+1.8%</b>.
                </div>
                <table className="w-full border-collapse font-mono text-[12px] tabular-nums">
                  <thead>
                    <tr>
                      <th className="border-b border-line py-2 text-left font-normal text-[10px] uppercase tracking-[0.08em] text-text-3">
                        직원
                      </th>
                      <th className="border-b border-line py-2 text-left font-normal text-[10px] uppercase tracking-[0.08em] text-text-3">
                        직급
                      </th>
                      <th className="border-b border-line py-2 text-right font-normal text-[10px] uppercase tracking-[0.08em] text-text-3">
                        기본급
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["김지원", "시니어", "₩5,200,000"],
                      ["박서연", "시니어", "₩4,800,000"],
                      ["이민준", "미드", "₩3,950,000"],
                      ["최유진", "주니어", "₩2,780,000"],
                    ].map((r) => (
                      <tr key={r[0]}>
                        <td className="border-b border-line py-[10px] text-text-2">{r[0]}</td>
                        <td className="border-b border-line py-[10px] text-text-2">{r[1]}</td>
                        <td className="border-b border-line py-[10px] text-right text-text-1">{r[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between border-t border-line px-[22px] py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
                <span>schema-context · whitelist 통과</span>
                <span>↵ 인사이트 더 보기</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       * 08 · COMPLIANCE (LAW ENCODED)
       * ============================================================ */}
      <section id="compliance" className="border-b border-line py-32">
        <div className="mx-auto max-w-[1360px] px-8">
          <div className="mb-[72px] grid grid-cols-1 gap-16 lg:grid-cols-[220px_1fr]">
            <div className="w-max border-t border-gold pt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
              <b className="mr-3 font-normal text-gold">04</b>The Law, Encoded
            </div>
            <div>
              <h2 className="max-w-[880px] font-serif text-[clamp(40px,4.4vw,64px)] font-normal leading-[1.02] tracking-[-0.02em]">
                근로기준법은
                <br />
                <em className="italic text-gold">코드로 강제됩니다.</em>
              </h2>
              <p className="mt-6 max-w-[640px] text-[16px] leading-[1.65] text-text-2">
                하드코딩하지 않는 요율, 해석의 여지를 남기지 않는 계산식. 한국 노무·세무 디테일을 시스템이 보증합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
            <ComplianceCard
              law="근로기준법 §56"
              title="월 소정근로 209시간, 연장 1.5배."
              desc="야간 22~06시 가산분, 휴일 8시간 이내·초과 가산을 컬럼으로 분리합니다."
            >
              <span className="text-text-3">{`// lib/calculators/payroll.ts`}</span>
              {"\n"}
              <span className="text-[#8FB6E6]">export const</span> MONTHLY_REGULAR_HOURS ={" "}
              <span className="text-gold">209</span>;{"\n"}
              <span className="text-[#8FB6E6]">export const</span> OVERTIME_RATE ={" "}
              <span className="text-gold">1.5</span>;{"\n"}
              <span className="text-[#8FB6E6]">export const</span> NIGHT_RATE_PREMIUM ={" "}
              <span className="text-gold">0.5</span>;{"\n"}
              <span className="text-[#8FB6E6]">export const</span> HOLIDAY_RATE_OVER_8H ={" "}
              <span className="text-gold">2.0</span>;
            </ComplianceCard>
            <ComplianceCard
              law="근로기준법 §60"
              title="연차 발생·촉진·소멸까지."
              desc="1년 미만 월차, 3년차+ 가산, 25일 상한을 함수 하나로. 결재 워크플로우 연동."
            >
              <span className="text-text-3">{`// lib/calculators/leave.ts`}</span>
              {"\n"}
              <span className="text-[#8FB6E6]">if</span> (years &lt; <span className="text-gold">1</span>){" "}
              <span className="text-[#8FB6E6]">return</span> Math.min(<span className="text-gold">11</span>, monthsServed);{"\n"}
              <span className="text-[#8FB6E6]">if</span> (years &lt; <span className="text-gold">3</span>){" "}
              <span className="text-[#8FB6E6]">return</span> <span className="text-gold">15</span>;{"\n"}
              <span className="text-[#8FB6E6]">return</span> Math.min(<span className="text-gold">25</span>,{" "}
              <span className="text-gold">15</span> + Math.floor((years - <span className="text-gold">1</span>) /{" "}
              <span className="text-gold">2</span>));
            </ComplianceCard>
            <ComplianceCard
              law="근퇴법 §8 · 소득세법 §45"
              title="퇴직급여 충당, 연말정산까지."
              desc="1년 이상 근속자 충당부채 자동 누적. 인적공제 + 특별공제 + 누진 7단계 결정세액."
            >
              <span className="text-text-3">{`// 4대보험 요율은 하드코딩 금지.`}</span>
              {"\n"}
              <span className="text-[#8FB6E6]">await</span> supabase{"\n"}
              {"  "}.from(<span className="text-gold">{`'insurance_rates'`}</span>){"\n"}
              {"  "}.select(<span className="text-gold">{`'*'`}</span>){"\n"}
              {"  "}.eq(<span className="text-gold">{`'year'`}</span>, <span className="text-gold">2026</span>);
            </ComplianceCard>
          </div>
        </div>
      </section>

      {/* ============================================================
       * 09 · ARCHITECTURE
       * ============================================================ */}
      <section id="arch" className="border-b border-line py-32">
        <div className="mx-auto max-w-[1360px] px-8">
          <div className="mb-[72px] grid grid-cols-1 gap-16 lg:grid-cols-[220px_1fr]">
            <div className="w-max border-t border-gold pt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
              <b className="mr-3 font-normal text-gold">05</b>The Stack
            </div>
            <h2 className="max-w-[880px] font-serif text-[clamp(40px,4.4vw,64px)] font-normal leading-[1.02] tracking-[-0.02em]">
              엣지에서 검증,
              <br />
              <em className="italic text-gold">RLS에서 격리.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-16 lg:grid-cols-[1fr_2fr]">
            {/* arch diagram */}
            <div className="relative grid min-h-[460px] grid-cols-3 grid-rows-3 gap-[18px] border border-line bg-bg-1 p-10">
              <ArchNode label="Client" title="Next.js" sub="App Router" col={1} row={1} />
              <ArchNode label="Edge" title="Middleware" sub="+ RBAC Guard" accent col={1} row={2} />
              <ArchNode label="Server" title="Server Actions" sub="+ Calculators" col={1} row={3} />
              <div className="col-start-2" />
              <ArchNode label="AI" title="Gemini 2.5" sub="Flash" col={3} row={1} />
              <ArchNode label="Database" title="Supabase" sub="Postgres · RLS" accent col={3} row={2} />
              <ArchNode label="External" title="Resend · NTS" sub="odcloud" col={3} row={3} />
            </div>

            <div className="flex flex-col gap-[18px]">
              {ARCH_LIST.map((a) => (
                <div
                  key={a.k}
                  className="grid grid-cols-1 items-baseline gap-6 border-b border-line py-[18px] md:grid-cols-[100px_1fr]"
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-gold">{a.k}</div>
                  <div className="text-[14px] leading-[1.6] text-text-2">{a.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       * 10 · CLOSER CTA
       * ============================================================ */}
      <section className="relative overflow-hidden border-b border-line py-[140px] text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 100% at 50% 50%, rgba(245,194,107,0.10) 20%, transparent 80%)",
          }}
        />
        <div className="relative z-[2] mx-auto max-w-[1360px] px-8">
          <h2 className="mx-auto mb-8 max-w-[900px] font-serif text-[clamp(56px,7vw,104px)] font-normal leading-[0.98] tracking-[-0.025em] text-text-1">
            한 명이 다 하는 일을,
            <br />
            <em className="italic text-gold">한 명도 모자라지 않게.</em>
          </h2>
          <p className="mx-auto mb-12 max-w-[560px] text-[16px] leading-[1.65] text-text-2">
            가입도, 결제도 필요 없습니다. 데모 계정 한 번 클릭으로 1년치 시나리오 데이터를 그대로 만나보세요.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/login" className="btn btn-primary">
              데모 계정으로 둘러보기 <span aria-hidden>→</span>
            </Link>
            <Link href="/login" className="btn">
              영업팀에 문의
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
       * 11 · FOOTER
       * ============================================================ */}
      <footer className="bg-bg px-8 pb-10 pt-16">
        <div className="mx-auto max-w-[1360px]">
          <div className="grid grid-cols-2 gap-12 border-b border-line pb-12 lg:grid-cols-5">
            <div className="col-span-2 max-w-[320px]">
              <div className="mb-4 flex items-center gap-[10px] font-mono text-[13px] font-medium tracking-[0.15em]">
                <span className="brand-mark" aria-hidden />
                <span>
                  <span className="text-text-1">NEXUS</span>
                  <em className="ml-2 text-[11px] not-italic text-text-3">ERP / v1.4</em>
                </span>
              </div>
              <p className="text-[13px] leading-[1.6] text-text-3">
                중소기업 1인 총무 담당자를 위한 통합 미니 ERP. 근로기준법 자동 준수 + AI 분석.
              </p>
            </div>
            <FooterCol title="Product" items={["대시보드", "인사·근태", "급여·연차", "지출·자산", "전자결재"]} />
            <FooterCol title="Compliance" items={["근로기준법", "소득세법", "근퇴법", "4대보험"]} />
            <FooterCol title="Developers" items={["문서", "API", "마이그레이션", "변경 로그"]} />
            <FooterCol title="Company" items={["회사 소개", "채용", "이용약관", "개인정보처리방침"]} />
          </div>
          <div className="flex justify-between pt-8 font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            <span>© 2026 Nexus Systems Inc.</span>
            <span>MIT Licensed · v1.4.0 · Seoul</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
 * SUBCOMPONENTS
 * ============================================================ */

function MockKpi({
  label,
  value,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | "gold";
}) {
  return (
    <div className="border border-line p-3">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-text-3">{label}</div>
      <div className={`font-mono text-[20px] tabular-nums ${tone === "gold" ? "text-gold" : "text-text-1"}`}>
        {value}
        {delta ? (
          <em className="ml-1 text-[11px] not-italic text-[#6BCB8A]">{delta}</em>
        ) : null}
      </div>
    </div>
  );
}

function MockRow({ name, value, last }: { name: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between py-[9px] text-[12px] ${last ? "" : "border-b border-dashed border-line"}`}
    >
      <span className="text-text-2">{name}</span>
      <span className="font-mono tabular-nums text-text-2">{value}</span>
    </div>
  );
}

function AiFeature({
  title,
  desc,
  kbd,
  active,
}: {
  title: React.ReactNode;
  desc: string;
  kbd?: string[];
  active?: boolean;
}) {
  return (
    <div
      className={`border-l ${active ? "border-l-gold pl-8" : "border-l-line-2 pl-6"} transition-all`}
    >
      <div className="mb-1.5 font-serif text-[24px] tracking-[-0.01em]">{title}</div>
      <p className="max-w-[460px] text-[14px] leading-[1.6] text-text-2">{desc}</p>
      {kbd && (
        <div className="mt-3 inline-flex gap-1 font-mono text-[10px] tracking-[0.08em]">
          <span className="text-text-3">단축키</span>{" "}
          {kbd.map((k) => (
            <kbd key={k} className="border border-line-2 bg-bg-2 px-2 py-[3px] text-text-2">
              {k}
            </kbd>
          ))}
        </div>
      )}
    </div>
  );
}

function ComplianceCard({
  law,
  title,
  desc,
  children,
}: {
  law: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[280px] flex-col gap-[18px] bg-bg px-7 py-9">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold">{law}</div>
      <div className="font-serif text-[28px] leading-[1.15] tracking-[-0.015em]">{title}</div>
      <div className="text-[14px] leading-[1.6] text-text-2">{desc}</div>
      <pre className="mt-auto overflow-hidden border border-line bg-bg-1 p-[14px] font-mono text-[11px] leading-[1.6] text-text-2 whitespace-pre-wrap">
        {children}
      </pre>
    </div>
  );
}

function ArchNode({
  label,
  title,
  sub,
  col,
  row,
  accent,
}: {
  label: string;
  title: string;
  sub: string;
  col: number;
  row: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative z-[2] flex flex-col justify-center border bg-bg-2 p-4 ${
        accent ? "border-gold" : "border-line-2"
      }`}
      style={{ gridColumn: col, gridRow: row }}
    >
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-3">{label}</div>
      <div
        className={`font-serif text-[18px] leading-[1.1] ${accent ? "text-gold" : "text-text-1"}`}
      >
        {title}
        <br />
        {sub}
      </div>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-4 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-text-3">
        {title}
      </h4>
      <ul className="flex flex-col gap-[10px]">
        {items.map((it) => (
          <li key={it}>
            <a className="cursor-pointer text-[13px] text-text-2 hover:text-text-1">{it}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
