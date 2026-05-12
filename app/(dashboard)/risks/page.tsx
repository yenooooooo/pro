import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { getComplianceRisks, type RiskItem } from "@/lib/compliance/checks";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  labor_hours: "근로시간",
  minimum_wage: "최저임금",
  leave: "연차",
  contract: "계약",
  filing: "신고",
};

const SEVERITY_CHIP: Record<RiskItem["severity"], string> = {
  danger: "chip rej",
  warn: "chip pend",
  info: "chip info",
};

const SEVERITY_LABEL: Record<RiskItem["severity"], string> = {
  danger: "긴급",
  warn: "경고",
  info: "정보",
};

export default async function RisksPage() {
  const t = await getTranslations("risks");
  const items = await getComplianceRisks();
  const dangerCount = items.filter((i) => i.severity === "danger").length;
  const warnCount = items.filter((i) => i.severity === "warn").length;
  const infoCount = items.filter((i) => i.severity === "info").length;

  // 카테고리별 그룹핑
  const grouped = new Map<string, RiskItem[]>();
  for (const it of items) {
    const arr = grouped.get(it.category) ?? [];
    arr.push(it);
    grouped.set(it.category, arr);
  }
  const groups = Array.from(grouped.entries());

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M12</b>Compliance · Risk
          </div>
          <h1 className="page-h">
            법적 <em>리스크.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
          Compliance Risk Center
        </div>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-3">
        <KPI label="긴급 위반" value={dangerCount} suffix="건" tone="danger" subtext="즉시 시정 필요" />
        <KPI label="경고" value={warnCount} suffix="건" tone="warn" subtext="조치 권장" />
        <KPI label="정보" value={infoCount} suffix="건" tone="info" subtext="참고 알림" />
      </div>

      {/* ===== 항목 리스트 ===== */}
      {items.length === 0 ? (
        <section className="panel mb-9 border border-line">
          <div className="border border-line bg-bg-1/40 py-12 text-center">
            <p className="font-serif text-[28px] italic text-gold">
              ✓ 모든 점검 통과
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
              현 시점에서 발견된 법적 리스크가 없습니다.
            </p>
          </div>
        </section>
      ) : (
        <div className="mb-9 flex flex-col gap-px bg-line">
          {groups.map(([cat, arr]) => (
            <section key={cat} className="panel">
              <div className="panel-h">
                <div className="t font-serif">
                  <em>{CATEGORY_LABEL[cat] ?? cat}</em>
                </div>
                <div className="meta">{arr.length}건</div>
              </div>
              <ul className="flex flex-col gap-px bg-line">
                {arr.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 bg-bg p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={SEVERITY_CHIP[item.severity]}>
                        <i />
                        {SEVERITY_LABEL[item.severity]}
                      </span>
                      <h3 className="font-serif text-[20px] italic leading-tight text-text-1">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-[13px] leading-[1.6] text-text-2">
                      사유 · {item.description}
                    </p>
                    {item.detail ? (
                      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
                        근거 · {item.detail}
                      </p>
                    ) : null}

                    {item.affected && item.affected.length > 0 ? (
                      <ul className="mt-2 grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
                        {item.affected.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center gap-2 bg-bg-1 px-3 py-2 text-[12px]"
                          >
                            <span className="text-text-1">{a.name}</span>
                            {a.meta ? (
                              <span className="font-mono text-[10px] tracking-[0.05em] text-text-3">
                                · {a.meta}
                              </span>
                            ) : null}
                          </li>
                        ))}
                        {item.count && item.count > item.affected.length ? (
                          <li className="bg-bg-1 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
                            외 {item.count - item.affected.length}명/건
                          </li>
                        ) : null}
                      </ul>
                    ) : null}

                    {item.href ? (
                      <Link
                        href={item.href as never}
                        className="mt-2 inline-flex w-max font-mono text-[10px] uppercase tracking-[0.12em] text-gold transition-colors hover:text-gold-2"
                      >
                        해당 페이지로 이동 →
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* ===== 근거 ===== */}
      <div className="border border-line bg-bg-1 p-5">
        <p className="font-mono text-[11px] leading-[1.6] tracking-[0.02em] text-text-3">
          점검 근거: 근로기준법 제53조 (연장근로) · 제60조 (연차) · 최저임금법 ·
          국민연금/건강보험/고용/산재 신고 마감일 (매월 10일) · 원천세 신고 마감일.
          모든 검사는 read-only 이며 데이터 변경 없음.
        </p>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  suffix,
  subtext,
  tone = "default",
}: {
  label: string;
  value: number;
  suffix?: string;
  subtext?: string;
  tone?: "default" | "warn" | "danger" | "info";
}) {
  const toneClass =
    tone === "danger"
      ? "text-[#E06B5F] italic"
      : tone === "warn"
        ? "text-gold italic"
        : tone === "info"
          ? "text-[#8FB6E6]"
          : "text-text-1";
  return (
    <div className="kpi-card">
      <div className="kpi-l">{label}</div>
      <div className={cn("kpi-v", toneClass)}>
        {value.toLocaleString("ko-KR")}
        {suffix ? <span className="ml-2 text-[16px] text-text-3">{suffix}</span> : null}
      </div>
      {subtext ? (
        <div className="kpi-meta">
          <span>{subtext}</span>
        </div>
      ) : null}
    </div>
  );
}
