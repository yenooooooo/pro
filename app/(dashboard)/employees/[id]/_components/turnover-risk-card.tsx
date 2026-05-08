import { AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { calculateTurnoverRisk } from "@/lib/hr/turnover-risk";

const LEVEL_COLOR: Record<string, string> = {
  low: "border-emerald-500/40 bg-emerald-500/5 text-emerald-300",
  medium: "border-amber-500/40 bg-amber-500/5 text-amber-300",
  high: "border-error-soft/40 bg-error-soft/10 text-error-soft",
};

const LEVEL_LABEL: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "주의",
};

const LEVEL_ICON = {
  low: ShieldCheck,
  medium: Activity,
  high: AlertTriangle,
};

type Props = {
  employeeId: string;
};

export async function TurnoverRiskCard({ employeeId }: Props) {
  const risk = await calculateTurnoverRisk(employeeId);
  if (!risk) return null;

  const Icon = LEVEL_ICON[risk.level];

  return (
    <div className="glass-panel rounded-xl p-6">
      <header className="mb-4 flex items-center gap-2">
        <h3 className="text-headline-md font-semibold text-on-surface">
          이직 위험도
        </h3>
        <span
          className={`ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${LEVEL_COLOR[risk.level]}`}
        >
          <Icon aria-hidden className="h-3.5 w-3.5" />
          {LEVEL_LABEL[risk.level]} ({risk.score})
        </span>
      </header>

      {/* 점수 게이지 */}
      <div className="mb-4">
        <div className="h-2 w-full rounded-full bg-surface-container-high">
          <div
            className={`h-full rounded-full ${
              risk.level === "high"
                ? "bg-error-soft"
                : risk.level === "medium"
                  ? "bg-amber-400"
                  : "bg-emerald-400"
            }`}
            style={{ width: `${risk.score}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-label-sm text-on-surface-variant">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* 기여 요인 */}
      <ul className="space-y-2">
        {risk.factors
          .sort((a, b) => b.score - a.score)
          .map((f, idx) => (
            <li
              key={idx}
              className="flex items-baseline justify-between rounded border border-outline-variant/20 bg-surface-container-low px-3 py-2"
            >
              <div>
                <p className="text-label-sm font-semibold text-on-surface">
                  {f.name}
                </p>
                <p className="text-label-sm text-on-surface-variant">
                  {f.description}
                </p>
              </div>
              <span className="ml-3 text-data-tabular tabular-nums text-on-surface-variant">
                +{f.score}
              </span>
            </li>
          ))}
      </ul>

      <p className="mt-4 text-label-sm text-on-surface-variant/60">
        💡 휴리스틱 기반 추정. ML 모델이 아닌 규칙 기반 점수이며, 실제 이직은 다양한
        요인의 영향을 받습니다. 인재 보존 의사결정의 보조 지표로만 활용하세요.
      </p>
    </div>
  );
}
