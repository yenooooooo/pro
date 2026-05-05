import Link from "next/link";
import { ShieldAlert, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { getComplianceRisks, severityColor } from "@/lib/compliance/checks";

export const dynamic = "force-dynamic";

const SEVERITY_ICON = {
  danger: AlertCircle,
  warn: AlertTriangle,
  info: Info,
};

const CATEGORY_LABEL: Record<string, string> = {
  labor_hours: "근로시간",
  minimum_wage: "최저임금",
  leave: "연차",
  contract: "계약",
  filing: "신고",
};

export default async function RisksPage() {
  const items = await getComplianceRisks();
  const dangerCount = items.filter((i) => i.severity === "danger").length;
  const warnCount = items.filter((i) => i.severity === "warn").length;
  const infoCount = items.filter((i) => i.severity === "info").length;

  return (
    <div className="space-y-stack-lg">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
          <ShieldAlert aria-hidden className="h-4 w-4" />
          Compliance Risk Center
        </p>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          법적 리스크 대시보드
        </h1>
        <p className="text-body-md text-on-surface-variant">
          근로기준법·최저임금법·세무 마감일을 자동 점검합니다. 위반 사항은 즉시 시정,
          임박 항목은 사전 조치하세요.
        </p>
      </header>

      {/* 요약 카운터 */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <SummaryCard
          severity="danger"
          count={dangerCount}
          label="긴급 위반"
          description="즉시 시정 필요"
        />
        <SummaryCard
          severity="warn"
          count={warnCount}
          label="경고"
          description="조치 권장"
        />
        <SummaryCard
          severity="info"
          count={infoCount}
          label="정보"
          description="참고 알림"
        />
      </div>

      {/* 항목 리스트 */}
      {items.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <p className="text-headline-md font-semibold text-emerald-300">
            ✓ 모든 점검 통과
          </p>
          <p className="mt-2 text-body-md text-on-surface-variant">
            현 시점에서 발견된 법적 리스크가 없습니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const Icon = SEVERITY_ICON[item.severity];
            return (
              <li
                key={item.id}
                className={`glass-panel overflow-hidden rounded-xl border p-5 ${severityColor(item.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    aria-hidden
                    className="mt-0.5 h-6 w-6 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="text-headline-md font-semibold text-on-surface">
                        {item.title}
                      </h3>
                      <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {CATEGORY_LABEL[item.category]}
                      </span>
                    </div>
                    <p className="text-body-md text-on-surface-variant">
                      {item.description}
                    </p>
                    {item.detail ? (
                      <p className="mt-1 text-label-sm text-on-surface-variant/70">
                        {item.detail}
                      </p>
                    ) : null}

                    {item.affected && item.affected.length > 0 ? (
                      <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {item.affected.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center gap-2 rounded border border-outline-variant/20 bg-surface-container-low px-2 py-1.5 text-label-sm"
                          >
                            <span className="font-medium text-on-surface">
                              {a.name}
                            </span>
                            {a.meta ? (
                              <span className="text-on-surface-variant tabular-nums">
                                · {a.meta}
                              </span>
                            ) : null}
                          </li>
                        ))}
                        {item.count && item.count > item.affected.length ? (
                          <li className="text-label-sm text-on-surface-variant">
                            외 {item.count - item.affected.length}명/건
                          </li>
                        ) : null}
                      </ul>
                    ) : null}

                    {item.href ? (
                      <Link
                        href={item.href as never}
                        className="mt-3 inline-block text-label-sm font-semibold text-primary-electric hover:text-primary-container"
                      >
                        해당 페이지로 이동 →
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="glass-panel rounded-xl p-4">
        <p className="text-label-sm text-on-surface-variant">
          ⚖️ 점검 근거: 근로기준법 제53조 (연장근로) · 제60조 (연차) · 최저임금법 ·
          국민연금/건강보험/고용/산재 신고 마감일 (매월 10일) · 원천세 신고 마감일.
          모든 검사는 read-only 이며 데이터 변경 없음.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  severity,
  count,
  label,
  description,
}: {
  severity: "danger" | "warn" | "info";
  count: number;
  label: string;
  description: string;
}) {
  const colorMap = {
    danger: "text-error-soft",
    warn: "text-amber-300",
    info: "text-tertiary",
  };
  return (
    <div className="glass-panel rounded-xl p-5">
      <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p
        className={`mt-2 text-display-xl font-bold tabular-nums ${colorMap[severity]}`}
      >
        {count}
      </p>
      <p className="mt-1 text-label-sm text-on-surface-variant">{description}</p>
    </div>
  );
}
