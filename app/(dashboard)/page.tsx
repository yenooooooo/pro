import { PageHeader } from "@/components/shared/PageHeader";
import { formatKRW } from "@/lib/utils/format";
import { AlertTriangle, CalendarX2, TrendingUp, Users2 } from "lucide-react";

const KPI = [
  { label: "Monthly Payroll", value: formatKRW(42_500_000), delta: "+2.4% vs last month", icon: TrendingUp },
  { label: "Total Expenses", value: formatKRW(12_800_000), delta: "Stable trajectory", icon: TrendingUp },
  { label: "Leave Usage Rate", value: "64%", delta: "Quarterly", icon: CalendarX2 },
  { label: "Monthly Closing", value: "85%", delta: "On track", icon: Users2 },
];

const ALERTS = [
  { title: "3 Contracts Expiring soon", severity: "warn" },
  { title: "5 Employees exceeded 52-hour limit", severity: "error" },
  { title: "12 Asset audits due", severity: "info" },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Strategic Dashboard"
        description="Real-time executive oversight of core operations."
        actions={
          <span className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm uppercase tracking-widest text-on-surface-variant">
            Last updated: Just now
          </span>
        }
      />

      {/* KPI grid */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPI.map(({ label, value, delta, icon: Icon }) => (
          <div key={label} className="glass-panel p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
                {label}
              </p>
              <Icon className="h-4 w-4 text-primary-electric" aria-hidden />
            </div>
            <p className="mt-4 text-headline-lg font-bold tabular-nums text-on-surface sm:text-display-xl sm:text-4xl">
              {value}
            </p>
            <p className="mt-2 text-label-sm text-on-surface-variant">{delta}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="glass-panel p-6 xl:col-span-2">
          <h2 className="text-headline-md font-semibold text-on-surface">
            6-Month Payroll &amp; Expense Trends
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Aggregated financial velocity. Phase 6에서 Recharts로 구현.
          </p>
          <div className="mt-6 flex h-64 items-center justify-center rounded-lg border border-dashed border-outline-variant/40 text-label-sm uppercase tracking-widest text-on-surface-variant">
            Chart placeholder
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-headline-md font-semibold text-on-surface">Real-time Alerts</h2>
          <ul className="mt-4 space-y-3">
            {ALERTS.map((a) => (
              <li
                key={a.title}
                className="flex items-start gap-3 rounded-lg bg-surface-container-high/60 p-3"
              >
                <AlertTriangle
                  className={
                    a.severity === "error"
                      ? "mt-0.5 h-4 w-4 text-error-soft"
                      : a.severity === "warn"
                        ? "mt-0.5 h-4 w-4 text-tertiary-sky"
                        : "mt-0.5 h-4 w-4 text-on-surface-variant"
                  }
                  aria-hidden
                />
                <p className="text-body-md text-on-surface">{a.title}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
