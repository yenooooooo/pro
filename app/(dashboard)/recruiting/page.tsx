import { getTranslations } from "next-intl/server";
import { JobPostingGenerator } from "./_generator";

export default async function RecruitingPage() {
  const t = await getTranslations("recruiting");
  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M16</b>Talent · Recruiting
          </div>
          <h1 className="page-h">
            AI 채용 <em>공고.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
          AI Recruiting Assistant
        </div>
      </header>

      <section className="panel">
        <JobPostingGenerator />
      </section>
    </div>
  );
}
