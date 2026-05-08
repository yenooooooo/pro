import { Sparkles, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { checkAllClosingTasks } from "@/lib/ai/closing-assistant";
import { cn } from "@/lib/utils/cn";

const STATUS_ICON = {
  ready: CheckCircle2,
  warning: AlertTriangle,
  blocked: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
  ready: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-300",
  blocked: "border-error-soft/30 bg-error-soft/5 text-error-soft",
};

const STATUS_LABEL: Record<string, string> = {
  ready: "완료 가능",
  warning: "검토 필요",
  blocked: "미완료",
};

type Props = {
  year: number;
  month: number;
};

export async function AiClosingAssistant({ year, month }: Props) {
  const results = await checkAllClosingTasks(year, month);
  const items = Array.from(results.values());
  const ready = items.filter((i) => i.status === "ready").length;
  const warning = items.filter((i) => i.status === "warning").length;
  const blocked = items.filter((i) => i.status === "blocked").length;

  if (items.length === 0) return null;

  return (
    <section className="glass-panel rounded-xl p-5">
      <header className="mb-4 flex items-center gap-2">
        <Sparkles aria-hidden className="h-5 w-5 text-primary-electric" />
        <h3 className="text-headline-md font-semibold text-on-surface">
          AI 결산 어시스턴트
        </h3>
        <span className="ml-auto rounded bg-primary-electric/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-electric">
          자동 검증
        </span>
      </header>

      <div className="mb-3 flex flex-wrap gap-3 text-label-sm">
        <span className="text-emerald-300">✓ 완료 가능 {ready}</span>
        <span className="text-amber-300">⚠ 검토 {warning}</span>
        <span className="text-error-soft">✕ 미완료 {blocked}</span>
      </div>

      <ul className="space-y-2">
        {items.map((item, idx) => {
          const Icon = STATUS_ICON[item.status];
          return (
            <li
              key={idx}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-label-sm",
                STATUS_COLOR[item.status],
              )}
            >
              <Icon aria-hidden className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold text-on-surface">
                  {item.task_title}
                  <span className="ml-2 text-[10px] font-normal text-on-surface-variant">
                    [{STATUS_LABEL[item.status]}]
                  </span>
                </p>
                <p className="mt-0.5 text-on-surface-variant">{item.message}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-label-sm text-on-surface-variant/60">
        💡 AI 가 데이터로 자동 검증한 결과입니다. 최종 확인 후 토글하세요.
      </p>
    </section>
  );
}
