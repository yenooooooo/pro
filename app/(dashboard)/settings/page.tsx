import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { InsuranceRatesForm } from "./_components/insurance-rates-form";
import { ClosingTasksManager } from "./_components/closing-tasks-manager";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const supabase = createClient();

  const [{ data: rates }, { data: tasks }] = await Promise.all([
    supabase
      .schema("chongmu")
      .from("insurance_rates")
      .select("*")
      .order("year", { ascending: false }),
    supabase
      .schema("chongmu")
      .from("closing_tasks")
      .select("*")
      .order("order_no", { ascending: true }),
  ]);

  const currentYear = new Date().getFullYear();
  const currentRate =
    rates?.find((r) => r.year === currentYear) ?? rates?.[0] ?? null;

  const quickLinks = [
    {
      href: "/settings/security",
      label: "SECURITY",
      title: "계정 보안",
      sub: "2단계 인증 (TOTP)",
    },
    {
      href: "/settings/privacy",
      label: "PRIVACY",
      title: "개인정보 자동 폐기",
      sub: "5년 경과 직원 익명화",
    },
    {
      href: "/settings/backup",
      label: "BACKUP",
      title: "데이터 백업",
      sub: "JSON Export · Supabase 백업",
    },
    {
      href: "/settings/integrations",
      label: "INTEGRATIONS",
      title: "외부 연동",
      sub: "Slack · Sheets · Notion",
    },
  ];

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M21</b>System · Settings
          </div>
          <h1 className="page-h">
            시스템 <em>설정.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
      </header>

      {/* ===== 빠른 링크 4종 ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((q) => (
          <Link
            key={q.href}
            href={q.href as never}
            className="group flex flex-col gap-3 border-b border-r border-line bg-bg p-6 transition-colors hover:bg-bg-1"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold">
              {q.label}
            </span>
            <h3 className="font-serif text-[22px] italic leading-tight text-text-1 transition-colors group-hover:text-gold">
              {q.title}
            </h3>
            <p className="font-mono text-[11px] tracking-[0.05em] text-text-3">
              {q.sub}
            </p>
          </Link>
        ))}
      </div>

      {/* ===== 4대보험 요율 ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            4대보험 <em>요율</em>
          </div>
          <div className="meta">{currentRate?.year ?? currentYear} 적용</div>
        </div>
        <p className="mb-6 font-mono text-[11px] leading-[1.7] tracking-[0.02em] text-text-3">
          보수월액 기준 근로자 본인 부담률(소수, 예: 4.75% → 0.0475). 매년 갱신.
        </p>
        <InsuranceRatesForm
          rates={rates ?? []}
          initialYear={currentRate?.year ?? currentYear}
          initial={currentRate}
        />
      </section>

      {/* ===== 결산 체크리스트 ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            결산 <em>체크리스트</em>
          </div>
          <div className="meta">{(tasks ?? []).length} 항목</div>
        </div>
        <p className="mb-6 font-mono text-[11px] leading-[1.7] tracking-[0.02em] text-text-3">
          모든 월의 결산 진행에 사용되는 항목 목록입니다. 추가·삭제 시 다음 달
          결산부터 반영됩니다.
        </p>
        <ClosingTasksManager tasks={tasks ?? []} />
      </section>
    </div>
  );
}
