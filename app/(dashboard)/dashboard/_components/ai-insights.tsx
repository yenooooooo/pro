import { Sparkles, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { detectAnomalies } from "@/lib/ai/anomaly";
import { cn } from "@/lib/utils/cn";

const SEVERITY_ICON = {
  danger: AlertCircle,
  warn: AlertTriangle,
  info: Info,
};

const SEVERITY_COLOR: Record<string, string> = {
  danger: "border-error-soft/40 bg-error-soft/5 text-error-soft",
  warn: "border-amber-500/40 bg-amber-500/5 text-amber-300",
  info: "border-tertiary/40 bg-tertiary/5 text-tertiary",
};

export async function AiInsightsCard() {
  const items = await detectAnomalies();

  return (
    <section className="glass-panel rounded-xl p-6">
      <header className="mb-4 flex items-center gap-2">
        <Sparkles aria-hidden className="h-5 w-5 text-primary-electric" />
        <h2 className="text-headline-md font-semibold text-on-surface">
          AI 인사이트
        </h2>
        <span className="ml-auto rounded bg-primary-electric/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-electric">
          {items.length}건
        </span>
      </header>

      {items.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          ✓ 이번 달 데이터에서 특별한 이상치가 발견되지 않았습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const Icon = SEVERITY_ICON[item.severity];
            return (
              <li
                key={item.id}
                className={cn(
                  "rounded-lg border p-3 text-label-sm",
                  SEVERITY_COLOR[item.severity],
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon aria-hidden className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-on-surface">{item.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-on-surface-variant">
                      {item.body}
                    </p>
                    {item.detail ? (
                      <p className="mt-1 text-on-surface-variant/70">
                        {item.detail}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
