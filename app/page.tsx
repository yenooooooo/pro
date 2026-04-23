import Link from "next/link";
import { ArrowRight, BarChart3, Briefcase, ClipboardCheck, Wallet } from "lucide-react";

const features = [
  {
    title: "Strategic Dashboard",
    description: "KPI·차트·알림을 한 화면에. 실무자가 매달 보는 숫자를 실시간 집계.",
    icon: BarChart3,
  },
  {
    title: "Payroll Engine",
    description: "근로기준법·간이세액표 기반 급여 자동계산. 4대보험 공제까지 한 번에.",
    icon: Wallet,
  },
  {
    title: "Workforce Directory",
    description: "직원·부서·직급·연차 잔여를 한 눈에. 입사·퇴사·휴직 전 과정 지원.",
    icon: Briefcase,
  },
  {
    title: "Monthly Closing",
    description: "월말결산 체크리스트로 빠짐없이. 보고서 자동 생성.",
    icon: ClipboardCheck,
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-outline-variant/40 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-electric to-primary-container" />
            <div>
              <p className="text-headline-md font-semibold tracking-tight">Chongmu PRO</p>
              <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
                Enterprise Edition
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-5 text-data-tabular font-semibold text-on-primary transition-shadow hover:shadow-indigo-glow-strong"
          >
            시작하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <p className="text-label-sm uppercase tracking-widest text-tertiary-sky">
            · System Online
        </p>
        <h1 className="mt-6 text-display-xl font-bold tracking-tight text-on-surface sm:text-6xl">
          THE FUTURE OF
          <br />
          <span className="bg-gradient-to-r from-primary-electric to-tertiary-sky bg-clip-text text-transparent">
            ENTERPRISE MANAGEMENT
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-body-lg text-on-surface-variant">
          중소기업 총무 실무의 월간 반복 업무를 한 화면에. 근로기준법·국세청 기준으로 계산하는
          엔터프라이즈급 프로덕트.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/login"
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-8 text-body-md font-semibold text-on-primary shadow-indigo-glow transition-shadow hover:shadow-indigo-glow-strong"
          >
            DETAILS COMING
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {features.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="glass-panel glass-panel-hover p-6 sm:p-8"
            >
              <Icon className="h-8 w-8 text-primary-electric" aria-hidden />
              <h3 className="mt-4 text-headline-md font-semibold text-on-surface">{title}</h3>
              <p className="mt-2 text-body-md text-on-surface-variant">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-outline-variant/40 py-8 text-center text-label-sm uppercase tracking-widest text-on-surface-variant">
        © 2026 Chongmu PRO · Production-grade ERP
      </footer>
    </main>
  );
}
