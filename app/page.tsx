import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileSignature,
  Hexagon,
  LineChart,
  Lock,
  Wallet,
} from "lucide-react";

const SECTION_LINKS = [
  { label: "Executive Intelligence", href: "#intelligence", active: true },
  { label: "Global Compliance", href: "#compliance" },
  { label: "Workforce", href: "#workforce" },
  { label: "Resources", href: "#resources" },
];

const FOOTER_LINKS = [
  "Intelligence Portal",
  "Compliance Standards",
  "Workforce Ops",
  "Legal",
  "Privacy",
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-on-surface">
      {/* ============================================================
       * Top Nav
       * ============================================================ */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/60 shadow-2xl shadow-indigo-500/10 backdrop-blur-md transition-all duration-200">
        <div className="flex w-full items-center justify-between px-6 py-4 md:px-10 md:py-5">
          <Link href="/" className="flex items-center gap-2">
            <Hexagon className="h-7 w-7 fill-primary-electric/20 text-primary-electric" />
            <span className="text-headline-md font-bold uppercase tracking-tighter text-white sm:text-2xl">
              Chongmu PRO Elite
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {SECTION_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className={
                  l.active
                    ? "border-b-2 border-primary-electric pb-1 text-primary-electric transition-all duration-200 hover:text-white"
                    : "pb-1 text-on-surface-variant transition-colors duration-200 hover:text-white"
                }
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/login"
              className="text-label-sm uppercase tracking-widest text-on-surface-variant transition-colors hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="rounded border border-primary-electric/50 bg-primary-container px-4 py-2 text-label-sm uppercase tracking-wider text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-200 hover:bg-primary-container/80 active:scale-95 md:px-6 md:py-2.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================================================
       * Hero with cinematic globe background
       * ============================================================ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-24 lg:min-h-[1024px]">
        {/* Globe background image */}
        <div
          aria-hidden
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')",
          }}
        />
        {/* Navy overlay */}
        <div
          aria-hidden
          className="absolute inset-0 bg-background/90 backdrop-blur-sm"
        />
        {/* 800px primary glow orb */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-electric/10 blur-[120px] md:h-[800px] md:w-[800px]"
        />

        <div className="relative z-10 mx-auto mt-12 flex max-w-5xl flex-col items-center gap-stack-lg px-container-padding text-center">
          {/* System Online pill */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-electric/20 bg-surface-container/50 px-4 py-1.5 backdrop-blur-md">
            <span
              aria-hidden
              className="h-2 w-2 animate-pulse rounded-full bg-primary-electric shadow-[0_0_8px_#c0c1ff]"
            />
            <span className="text-label-sm uppercase tracking-widest text-primary-electric">
              System Online
            </span>
          </div>

          {/* Hero title with 3-color gradient */}
          <h1 className="text-4xl font-bold uppercase tracking-tighter text-white drop-shadow-2xl sm:text-5xl md:text-6xl lg:text-display-xl lg:text-[56px]">
            The Future Of
            <br />
            <span className="bg-gradient-to-r from-primary-electric via-inverse-surface to-tertiary-sky bg-clip-text text-transparent">
              Enterprise Management
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-body-lg leading-relaxed text-on-surface-variant">
            Precision-engineered for high-stakes decision making. Command your global
            operations through an elite, cryptographically secure terminal designed for
            definitive clarity.
          </p>

          {/* Initialize Protocol button */}
          <div className="mt-stack-md">
            <Link
              href="/login"
              className="group relative inline-flex items-center overflow-hidden rounded border border-primary-electric/30 bg-gradient-to-b from-inverse-primary to-primary-electric px-8 py-4 text-label-sm uppercase tracking-[0.1em] text-on-primary transition-all duration-300 hover:shadow-[0_0_40px_-5px_rgba(192,193,255,0.6)]"
            >
              <span
                aria-hidden
                className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 ease-out group-hover:translate-y-0"
              />
              <span className="relative flex items-center gap-2">
                Initialize Protocol
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
       * Bento Grid — Four Pillars (overlaps hero via -mt-24)
       * ============================================================ */}
      <section className="relative z-20 mx-auto -mt-24 max-w-7xl px-container-padding pb-32">
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {/* Pillar 1: Strategic Dashboard — LARGE (2 cols) */}
          <div className="group relative col-span-1 overflow-hidden rounded-xl border border-b-transparent border-l-white/10 border-r-transparent border-t-white/10 bg-surface-container-high/40 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all duration-500 hover:border-t-primary-electric/30 hover:bg-surface-container-highest/60 md:col-span-2">
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-primary-electric/5 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <LineChart
                  aria-hidden
                  className="mb-stack-md h-10 w-10 text-primary-electric drop-shadow-[0_0_10px_rgba(192,193,255,0.5)]"
                />
                <h3 className="mb-stack-sm text-headline-lg font-semibold tracking-tight text-on-surface">
                  Strategic Dashboard
                </h3>
                <p className="max-w-md text-body-md text-on-surface-variant">
                  Executive-level visibility into global operations. Real-time telemetry
                  across all business units with deterministic predictive insights.
                </p>
              </div>
              {/* Abstract sparkline glow */}
              <div className="relative mt-8 h-24 w-full overflow-hidden rounded border-b border-primary-electric/20 bg-gradient-to-t from-surface-dim to-transparent">
                <div
                  aria-hidden
                  className="absolute bottom-0 h-px w-full bg-primary-electric/40 shadow-[0_0_10px_#c0c1ff]"
                />
                <div
                  aria-hidden
                  className="absolute bottom-0 left-1/4 h-16 w-1/2 bg-gradient-to-t from-primary-electric/20 to-transparent blur-xl"
                />
              </div>
            </div>
          </div>

          {/* Pillar 2: Payroll Engine — SMALL */}
          <div className="group relative overflow-hidden rounded-xl border border-b-transparent border-l-white/10 border-r-transparent border-t-white/10 bg-surface-container-high/40 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all duration-500 hover:border-t-tertiary-sky/30 hover:bg-surface-container-highest/60">
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-tertiary-sky/5 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
            <Wallet
              aria-hidden
              className="relative mb-stack-md h-10 w-10 text-tertiary-sky"
            />
            <h3 className="relative mb-stack-sm text-headline-md font-semibold text-on-surface">
              Payroll Engine
            </h3>
            <p className="relative text-body-md text-on-surface-variant">
              Deterministic compensation routing with zero-variance global compliance and
              instantaneous settlement.
            </p>
          </div>

          {/* Pillar 3: Workforce Directory — SMALL */}
          <div className="group relative overflow-hidden rounded-xl border border-b-transparent border-l-white/10 border-r-transparent border-t-white/10 bg-surface-container-high/40 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all duration-500 hover:border-t-secondary-slate/30 hover:bg-surface-container-highest/60">
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-secondary-slate/5 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
            <BadgeCheck
              aria-hidden
              className="relative mb-stack-md h-10 w-10 text-secondary-slate"
            />
            <h3 className="relative mb-stack-sm text-headline-md font-semibold text-on-surface">
              Workforce Directory
            </h3>
            <p className="relative text-body-md text-on-surface-variant">
              Immutable organizational taxonomy. Deep mapping of human capital
              architecture and access protocols.
            </p>
          </div>

          {/* Pillar 4: Monthly Closing — LARGE (2 cols) with variance mini-card */}
          <div className="group relative col-span-1 overflow-hidden rounded-xl border border-b-transparent border-l-white/10 border-r-transparent border-t-white/10 bg-surface-container-high/40 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all duration-500 hover:border-t-primary-electric/30 hover:bg-surface-container-highest/60 md:col-span-2">
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-primary-electric/5 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
            <div className="relative flex h-full flex-col items-start gap-8 md:flex-row md:items-center">
              <div className="flex-1">
                <FileSignature
                  aria-hidden
                  className="mb-stack-md h-10 w-10 text-on-surface"
                />
                <h3 className="mb-stack-sm text-headline-lg font-semibold tracking-tight text-on-surface">
                  Monthly Closing
                </h3>
                <p className="max-w-md text-body-md text-on-surface-variant">
                  Automated ledger reconciliation. Eliminate manual variance with
                  cryptographically secure, unalterable audit trails.
                </p>
              </div>
              {/* Variance mini-card */}
              <div className="relative flex h-32 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded border border-outline-variant/20 bg-surface-dim p-4 md:w-64">
                <div className="absolute right-0 top-0 p-2">
                  <Lock aria-hidden className="h-3 w-3 text-primary-electric/50" />
                </div>
                <span className="text-3xl font-bold tabular-nums text-white">
                  0.00%
                </span>
                <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">
                  Variance Detected
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       * Footer
       * ============================================================ */}
      <footer className="mt-24 w-full border-t border-slate-900 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-12 py-16 md:flex-row">
          <div className="flex flex-col items-center gap-4 md:items-start">
            <span className="text-lg font-black uppercase tracking-tighter text-primary-electric">
              Chongmu PRO Elite
            </span>
            <p className="text-sm text-outline">
              © 2026 Chongmu PRO Elite. Precision-engineered for global scale.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {FOOTER_LINKS.map((label) => (
              <a
                key={label}
                href="#"
                className="text-sm text-outline transition-opacity duration-300 hover:text-primary-electric hover:underline hover:decoration-primary-electric/50"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
