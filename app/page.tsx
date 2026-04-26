import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  Cpu,
  Globe,
  Network,
  Terminal,
  Wallet,
} from "lucide-react";

const SECTION_LINKS = [
  { label: "ARCHITECTURE", href: "#architecture", active: true },
  { label: "MODULES", href: "#modules" },
  { label: "METRICS", href: "#metrics" },
  { label: "TERMINAL", href: "#terminal" },
];

const FOOTER_LINKS = [
  "서비스 소개",
  "이용약관",
  "개인정보처리방침",
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#02040a] text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* ============================================================
       * Ambient background FX — grid + noise overlay
       * ============================================================ */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[-1] grid-bg" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[-1] opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')",
        }}
      />

      {/* ============================================================
       * Top nav — sticky, glass, brand + ARCHITECTURE links
       * ============================================================ */}
      <nav className="sticky top-0 z-[100] flex items-center justify-between border-b border-white/10 px-6 py-4 glass-panel-deep md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl font-black uppercase tracking-tighter text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]">
            Chongmu PRO Elite
          </span>
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          {SECTION_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className={
                l.active
                  ? "border-b-2 border-indigo-500 pb-1 text-label-sm font-bold tracking-tight text-white shadow-[0_2px_10px_rgba(99,102,241,0.5)] transition-all duration-300"
                  : "pb-1 text-label-sm font-medium tracking-tight text-slate-400 transition-colors hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              }
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden items-center gap-4 text-slate-400 md:flex">
            <button
              type="button"
              aria-label="System status"
              className="flex items-center justify-center transition-all duration-300 hover:text-white"
            >
              <Cpu aria-hidden className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Terminal"
              className="flex items-center justify-center transition-all duration-300 hover:text-white"
            >
              <Terminal aria-hidden className="h-5 w-5" />
            </button>
          </div>
          <Link
            href="/login"
            className="rounded-sm border border-transparent bg-white px-6 py-2.5 text-label-sm font-bold uppercase tracking-widest text-black transition-all duration-300 hover:bg-indigo-500 hover:text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.6)]"
          >
            시작하기
          </Link>
        </div>
      </nav>

      {/* ============================================================
       * Hero — earth sphere, scanline, radial mask, dual CTA
       * ============================================================ */}
      <header className="relative flex min-h-[1000px] w-full items-center justify-center overflow-hidden">
        {/* 3D earth background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 mt-32 flex items-center justify-center"
          style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
        >
          <div className="earth-sphere" />
        </div>

        {/* Scanning beam */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <div className="h-[2px] w-full animate-scanline bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
        </div>

        {/* Deep gradient mask */}
        <div
          aria-hidden
          className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_0%,#02040a_70%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 z-10 bg-gradient-to-b from-[#02040a]/80 via-transparent to-[#02040a]"
        />

        <div className="relative z-20 mt-[-10vh] flex w-full max-w-7xl flex-col items-center px-container-padding text-center">
          <div className="mb-stack-lg inline-flex items-center gap-3 rounded-sm border border-indigo-500/40 px-5 py-2 text-label-sm uppercase tracking-widest text-indigo-300 glass-panel-deep tech-border animate-reveal-up opacity-0 [animation-delay:0.05s]">
            <Globe aria-hidden className="h-3.5 w-3.5" />
            GLOBAL ENTERPRISE COMMAND CENTER
          </div>

          <h1 className="mb-stack-md max-w-5xl text-[44px] font-black leading-[1.05] tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] animate-reveal-up opacity-0 [animation-delay:0.15s] sm:text-[56px] md:text-[64px]">
            경영의{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              한계를 넘어서는
            </span>
            <br />
            ULTIMATE 시스템
          </h1>

          <p className="mb-stack-lg max-w-3xl text-body-lg font-light text-slate-400 animate-reveal-up opacity-0 [animation-delay:0.25s]">
            차세대 데이터 구조와 무한한 확장성. 인사·재무·운영을 통합하는 단 하나의 마스터 컨트롤 프로토콜.
          </p>

          <div className="flex flex-col items-center gap-4 animate-reveal-up opacity-0 [animation-delay:0.35s] sm:flex-row sm:gap-6">
            <Link
              href="/login"
              className="group relative overflow-hidden rounded-sm bg-white px-8 py-4 text-label-sm font-bold uppercase tracking-widest text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-500 hover:bg-indigo-400 hover:text-white hover:shadow-[0_0_40px_rgba(99,102,241,0.6)]"
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                시작하기
                <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            </Link>
            <a
              href="#architecture"
              className="rounded-sm border-white/20 px-8 py-4 text-label-sm font-bold uppercase tracking-widest text-white glass-panel-deep tech-border transition-all duration-300 hover:border-white/60 hover:bg-white/10"
            >
              구조 보기
            </a>
          </div>
        </div>
      </header>

      {/* ============================================================
       * Core Architecture Matrix — bento grid
       * ============================================================ */}
      <section id="architecture" className="relative z-20 bg-[#02040a] px-container-padding py-32">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.05)_0%,transparent_50%)]"
        />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-20 text-center">
            <div className="mb-4 text-label-sm uppercase tracking-[0.2em] text-indigo-500">
              System Components
            </div>
            <h2 className="mb-4 text-4xl font-bold tracking-tight text-white">
              Core Architecture Matrix
            </h2>
            <p className="mx-auto max-w-2xl text-body-md text-slate-400">
              엘리트 스케일업을 위한 고도화된 모듈형 인프라스트럭처
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Connective lines */}
            <div
              aria-hidden
              className="absolute left-0 top-1/2 hidden h-px w-full bg-indigo-500/10 lg:block"
            />
            <div
              aria-hidden
              className="absolute left-1/3 top-0 hidden h-full w-px bg-indigo-500/10 lg:block"
            />
            <div
              aria-hidden
              className="absolute left-2/3 top-0 hidden h-full w-px bg-indigo-500/10 lg:block"
            />

            {/* MOD-01 Master Control Dashboard (large) */}
            <ModuleCard
              modCode="MOD-01"
              size="large"
              title="Master Control Dashboard"
              description="실시간 글로벌 기업 지표를 나노 단위로 스캔합니다. 분산된 데이터를 즉각적으로 수집하여 홀로그래픽 수준의 직관적 시각화로 매핑, 최고 수준의 의사결정을 지원합니다."
              icon={BarChart3}
              iconBg="bg-indigo-500/10"
              iconBorder="border-indigo-500/30"
              iconColor="text-indigo-400"
              accentClass="group-hover:bg-indigo-500/20 group-hover:text-indigo-300 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              cornerSide="br"
            />

            {/* MOD-02 Quantum Payroll Engine */}
            <ModuleCard
              modCode="MOD-02"
              size="small"
              title="Quantum Payroll Engine"
              description="다중 지역, 복합 세제를 실시간으로 연산하는 무결점 정산 코어. 0.0001%의 오차율을 보장합니다."
              icon={Wallet}
              iconBg="bg-blue-500/10"
              iconBorder="border-blue-500/30"
              iconColor="text-blue-400"
            />

            {/* MOD-03 Human Capital Matrix */}
            <ModuleCard
              modCode="MOD-03"
              size="small"
              title="Human Capital Matrix"
              description="조직도 토폴로지 매핑부터 퍼포먼스 분석까지. 인적 자원 데이터를 동적으로 관리하는 노드 시스템."
              icon={Network}
              iconBg="bg-cyan-500/10"
              iconBorder="border-cyan-500/30"
              iconColor="text-cyan-400"
            />

            {/* MOD-04 Automated Closing Protocol (large) */}
            <ModuleCard
              modCode="MOD-04"
              size="large"
              title="Automated Closing Protocol"
              description="복잡한 재무 마감 프로세스를 단일 스크립트로 압축. 스마트 컨트랙트 기반의 전자결재망과 연동되어 왜곡 없는 투명한 재무 결산을 초고속으로 완료합니다."
              icon={ClipboardCheck}
              iconBg="bg-purple-500/10"
              iconBorder="border-purple-500/30"
              iconColor="text-purple-400"
              accentClass="group-hover:bg-purple-500/20 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              cornerSide="bl"
            />
          </div>
        </div>
      </section>

      {/* ============================================================
       * Footer — minimal terminal
       * ============================================================ */}
      <footer className="border-t border-white/5 bg-[#010205] py-8 text-center text-label-sm uppercase tracking-widest text-slate-600">
        <p>© 2026 Chongmu PRO Elite · 중소기업 총무 업무의 완성형 미니 ERP</p>
        <div className="mt-3 flex flex-wrap justify-center gap-6">
          {FOOTER_LINKS.map((label) => (
            <a
              key={label}
              href="#"
              className="text-slate-500 transition-colors hover:text-indigo-400"
            >
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}

type ModuleCardProps = {
  modCode: string;
  size: "large" | "small";
  title: string;
  description: string;
  icon: typeof BarChart3;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  accentClass?: string;
  cornerSide?: "br" | "bl";
};

function ModuleCard({
  modCode,
  size,
  title,
  description,
  icon: Icon,
  iconBg,
  iconBorder,
  iconColor,
  accentClass,
  cornerSide,
}: ModuleCardProps) {
  const colSpan = size === "large" ? "md:col-span-8" : "md:col-span-4";
  const padding = size === "large" ? "p-10" : "p-8";
  const titleClass =
    size === "large"
      ? "text-2xl font-bold tracking-tight"
      : "text-xl font-semibold tracking-tight";
  const iconSize = size === "large" ? "h-14 w-14" : "h-12 w-12";
  const iconInner = size === "large" ? "h-7 w-7" : "h-6 w-6";

  return (
    <div
      className={`group relative z-10 overflow-hidden rounded-sm transition-colors duration-500 hover:bg-surface-container-high/40 glass-panel-deep tech-border ${colSpan} ${padding}`}
    >
      <div className="absolute right-4 top-4 text-label-sm uppercase tracking-widest text-slate-600">
        {modCode}
      </div>
      {cornerSide === "br" ? (
        <div
          aria-hidden
          className="absolute bottom-4 right-4 h-12 w-12 border-b border-r border-indigo-500/30"
        />
      ) : null}
      {cornerSide === "bl" ? (
        <div
          aria-hidden
          className="absolute bottom-4 left-4 h-12 w-12 border-b border-l border-indigo-500/30"
        />
      ) : null}

      <div className="relative z-10 flex h-full flex-col">
        <div
          className={`mb-6 flex ${iconSize} items-center justify-center rounded-sm border ${iconBg} ${iconBorder} ${iconColor} transition-transform duration-500 group-hover:scale-110 ${accentClass ?? ""}`}
        >
          <Icon aria-hidden className={iconInner} />
        </div>
        <h3 className={`mb-4 text-white ${titleClass}`}>{title}</h3>
        <p className="max-w-xl text-body-md leading-relaxed text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
