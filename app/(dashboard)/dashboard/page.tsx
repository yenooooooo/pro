import {
  AlertTriangle,
  Building2,
  Cpu,
  Gauge,
  Globe,
  Info,
  Minus,
  Network,
  Radar,
  Satellite,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

// Phase 6에서 실 집계 쿼리로 교체. 현재는 stitch v2 시안 수치.
type KPI = {
  label: string;
  value: string;
  delta: { dir: "up" | "down" | "flat"; text: string };
  icon: typeof Cpu;
  iconColor: string;
  sparkline: "indigo" | "tertiary" | "bars";
};

const KPIS: KPI[] = [
  {
    label: "운영 매트릭스",
    value: "94.2%",
    delta: { dir: "up", text: "+2.4% (24h)" },
    icon: Cpu,
    iconColor: "text-indigo-400",
    sparkline: "indigo",
  },
  {
    label: "재무 상태 (KRW)",
    value: "₩4.2B",
    delta: { dir: "up", text: "+12.8% (MOM)" },
    icon: Building2,
    iconColor: "text-tertiary-sky",
    sparkline: "tertiary",
  },
  {
    label: "네트워크 부하",
    value: "68.5%",
    delta: { dir: "flat", text: "Stable" },
    icon: Gauge,
    iconColor: "text-error-soft",
    sparkline: "bars",
  },
];

type Alert = {
  title: string;
  description: string;
  meta: string;
  tone: "error" | "info";
  icon: typeof ShieldAlert;
};

const ALERTS: Alert[] = [
  {
    title: "보안 프로토콜 위반",
    description: "Node AP-East-1에서 비정상적인 접근 감지됨.",
    meta: "2m ago",
    tone: "error",
    icon: ShieldAlert,
  },
  {
    title: "리소스 최적화 필요",
    description: "데이터베이스 클러스터 메모리 사용량 85% 초과.",
    meta: "15m ago",
    tone: "info",
    icon: Info,
  },
];

const SYNC_TIME = "14:02:45 UTC";

export default function DashboardPage() {
  return (
    <div className="relative -mx-4 -my-6 min-h-[calc(100vh-4rem)] overflow-hidden hologram-grid sm:-mx-6 lg:-mx-container-padding lg:-my-8">
      {/* Ambient indigo glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-1/2 z-0 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[120px]"
      />

      <div className="relative z-10 mx-auto grid max-w-[1600px] grid-cols-12 gap-gutter px-4 py-6 sm:px-6 lg:px-container-padding lg:py-8">
        {/* ========== Header ========== */}
        <div className="col-span-12 mb-stack-md flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-indigo-400">
              <Radar aria-hidden className="h-4 w-4" />
              System Status: Nominal
            </p>
            <h2 className="text-display-xl font-bold tracking-tight text-white">
              전략적 인텔리전스 대시보드
            </h2>
          </div>
          <div className="hidden items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-high/50 px-4 py-2 backdrop-blur-md lg:flex">
            <span className="text-data-tabular text-slate-400">SYNC:</span>
            <span className="text-data-tabular font-bold tabular-nums text-tertiary-sky">
              {SYNC_TIME}
            </span>
            <span
              aria-hidden
              className="ml-2 h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            />
          </div>
        </div>

        {/* ========== Central Hub (8 cols) ========== */}
        <div className="col-span-12 grid grid-rows-[auto_1fr] gap-gutter lg:col-span-8">
          {/* KPI Row */}
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-3">
            {KPIS.map((kpi) => (
              <KPICard key={kpi.label} kpi={kpi} />
            ))}
          </div>

          {/* Intelligence core hub viz */}
          <div className="glass-panel relative flex min-h-[400px] items-center justify-center overflow-hidden rounded-xl border-t border-indigo-500/20 shadow-[0_-10px_30px_-15px_rgba(99,102,241,0.2)]">
            <div
              aria-hidden
              className="absolute inset-0 mix-blend-screen opacity-20"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="absolute left-4 top-4 text-data-tabular tabular-nums text-indigo-400/50">
              SYS.CORE.01
            </div>
            <div className="absolute bottom-4 right-4 text-data-tabular tabular-nums text-indigo-400/50">
              RENDERING_ACTIVE
            </div>

            <div className="relative z-10 text-center">
              <div className="relative flex h-48 w-48 items-center justify-center">
                {/* Particles */}
                <span
                  aria-hidden
                  className="absolute left-10 top-0 h-1 w-1 rounded-full bg-indigo-300 opacity-50 animate-float-particle"
                />
                <span
                  aria-hidden
                  className="absolute bottom-10 right-0 h-1.5 w-1.5 rounded-full bg-tertiary-sky opacity-40 animate-float-particle [animation-delay:1s]"
                />
                <span
                  aria-hidden
                  className="absolute right-10 top-20 h-0.5 w-0.5 rounded-full bg-white opacity-60 animate-float-particle [animation-delay:0.5s]"
                />
                {/* Outer glow */}
                <div
                  aria-hidden
                  className="absolute h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl animate-pulse-glow"
                />
                {/* Rotating rings */}
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-full border border-indigo-500/20 animate-rotate-slow"
                />
                <div
                  aria-hidden
                  className="absolute inset-4 rounded-full border border-tertiary-sky/20 border-l-tertiary-sky/60 border-t-tertiary-sky/60 animate-rotate-reverse-slow"
                />
                <div
                  aria-hidden
                  className="absolute inset-8 rounded-full border border-indigo-400/20 border-b-indigo-400/60 border-r-indigo-400/60 animate-rotate-slow"
                />
                <div aria-hidden className="absolute h-16 w-16 rounded-full bg-indigo-500/20 blur-xl" />
                <Network
                  aria-hidden
                  className="relative h-12 w-12 text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-pulse-glow"
                />
              </div>
              <p className="mt-6 text-headline-md font-semibold tracking-wide text-white">
                인텔리전스 코어 활성
              </p>
              <p className="mt-2 text-body-md text-slate-400">
                글로벌 노드 동기화 완료
              </p>
            </div>
          </div>
        </div>

        {/* ========== Side panels (4 cols) ========== */}
        <div className="col-span-12 flex flex-col gap-gutter lg:col-span-4">
          {/* 실시간 경고 */}
          <div className="glass-panel relative flex-1 overflow-hidden rounded-xl p-stack-md">
            <div
              aria-hidden
              className="glass-panel-inner pointer-events-none absolute inset-0 rounded-xl"
            />
            <div className="relative mb-stack-md flex items-center justify-between border-b border-slate-700/50 pb-2">
              <h3 className="flex items-center gap-2 text-headline-md font-semibold text-white">
                <AlertTriangle aria-hidden className="h-5 w-5 text-error-soft" />
                실시간 경고
              </h3>
              <span className="rounded bg-error-container/30 px-2 py-1 text-label-sm font-bold text-on-error-container">
                {ALERTS.length}
              </span>
            </div>
            <ul className="relative flex flex-col gap-2">
              {ALERTS.map((a) => {
                const iconColor =
                  a.tone === "error" ? "text-error-soft" : "text-tertiary-sky";
                return (
                  <li
                    key={a.title}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant/30 bg-surface-container/50 p-3 transition-colors hover:bg-surface-container"
                  >
                    <a.icon
                      aria-hidden
                      className={`mt-0.5 h-5 w-5 flex-shrink-0 ${iconColor}`}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-body-md font-semibold text-white">{a.title}</h4>
                      <p className="mt-1 text-label-sm text-slate-400">{a.description}</p>
                    </div>
                    <span className="ml-auto whitespace-nowrap text-data-tabular text-xs tabular-nums text-slate-500">
                      {a.meta}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 원격 측정 */}
          <div className="glass-panel relative flex-1 overflow-hidden rounded-xl p-stack-md">
            <div
              aria-hidden
              className="glass-panel-inner pointer-events-none absolute inset-0 rounded-xl"
            />
            <div className="relative mb-stack-md flex items-center justify-between border-b border-slate-700/50 pb-2">
              <h3 className="flex items-center gap-2 text-headline-md font-semibold text-white">
                <Satellite aria-hidden className="h-5 w-5 text-indigo-400" />
                원격 측정
              </h3>
            </div>

            <div className="relative space-y-4">
              <TelemetryRow label="서버 응답 시간" value="24ms" pct={15} barColor="bg-indigo-500" />
              <TelemetryRow
                label="데이터 처리량"
                value="1.2 TB/s"
                pct={78}
                barColor="bg-tertiary-sky"
              />

              {/* Mini map */}
              <div className="relative mt-6 flex h-32 items-center justify-center overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-highest/50">
                <div
                  aria-hidden
                  className="absolute inset-0 grayscale opacity-30 mix-blend-luminosity"
                  style={{
                    backgroundImage:
                      "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <span
                  aria-hidden
                  className="absolute left-2/3 top-1/3 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]"
                />
                <span
                  aria-hidden
                  className="absolute bottom-1/3 right-1/4 h-2 w-2 rounded-full bg-tertiary-sky shadow-[0_0_10px_rgba(123,208,255,1)]"
                />
                <span className="relative z-10 inline-flex items-center gap-1.5 rounded bg-slate-900/80 px-2 py-1 text-label-sm uppercase tracking-widest text-white/60 backdrop-blur-sm">
                  <Globe aria-hidden className="h-3.5 w-3.5" />
                  GLOBAL DEPLOYMENT
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ kpi }: { kpi: KPI }) {
  return (
    <div className="glass-panel group relative overflow-hidden rounded-xl p-stack-md">
      <div
        aria-hidden
        className="glass-panel-inner pointer-events-none absolute inset-0 rounded-xl"
      />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between">
          <span className="text-label-sm uppercase tracking-wider text-slate-400">
            {kpi.label}
          </span>
          <kpi.icon aria-hidden className={`h-5 w-5 ${kpi.iconColor}`} />
        </div>
        <div className="mb-1 text-headline-lg font-semibold text-white">{kpi.value}</div>
        <DeltaBadge delta={kpi.delta} />

        {/* Sparkline */}
        <div className="mt-4 h-8 w-full">
          {kpi.sparkline === "indigo" ? <SparklineLine variant="indigo" /> : null}
          {kpi.sparkline === "tertiary" ? <SparklineLine variant="tertiary" /> : null}
          {kpi.sparkline === "bars" ? <SparklineBars /> : null}
        </div>
      </div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: KPI["delta"] }) {
  if (delta.dir === "flat") {
    return (
      <div className="flex items-center gap-1 text-data-tabular text-slate-400">
        <Minus aria-hidden className="h-4 w-4" />
        {delta.text}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-data-tabular text-green-400">
      <TrendingUp aria-hidden className="h-4 w-4" />
      {delta.text}
    </div>
  );
}

function SparklineLine({ variant }: { variant: "indigo" | "tertiary" }) {
  const isIndigo = variant === "indigo";
  return (
    <div
      className={`relative h-full w-full border-b ${
        isIndigo ? "border-indigo-500/50" : "border-tertiary-sky/50"
      } bg-gradient-to-r from-transparent ${
        isIndigo ? "via-indigo-500/20" : "via-tertiary-sky/20"
      } to-transparent`}
    >
      <div
        aria-hidden
        className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${
          isIndigo
            ? "bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
            : "bg-tertiary-sky shadow-[0_0_10px_rgba(123,208,255,0.8)]"
        }`}
      />
    </div>
  );
}

function SparklineBars() {
  const bars = [
    { h: "20%", color: "bg-slate-700" },
    { h: "40%", color: "bg-slate-700" },
    { h: "60%", color: "bg-indigo-500/50" },
    { h: "80%", color: "bg-indigo-500/80" },
    { h: "68%", color: "bg-error-soft/80 shadow-[0_0_10px_rgba(255,180,171,0.5)]" },
  ];
  return (
    <div className="flex h-full items-end gap-1">
      {bars.map((b, i) => (
        <div
          key={i}
          className={`flex-1 ${b.color}`}
          style={{ height: b.h }}
          aria-hidden
        />
      ))}
    </div>
  );
}

function TelemetryRow({
  label,
  value,
  pct,
  barColor,
}: {
  label: string;
  value: string;
  pct: number;
  barColor: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-label-sm text-slate-400">{label}</span>
        <span className="text-data-tabular tabular-nums text-white">{value}</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          aria-hidden
          className={`h-1 rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
