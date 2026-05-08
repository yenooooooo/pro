import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { JobPostingGenerator } from "./_generator";

export default async function RecruitingPage() {
  const t = await getTranslations("recruiting");
  return (
    <div className="space-y-stack-lg">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
          <Sparkles aria-hidden className="h-4 w-4" />
          AI Recruiting Assistant
        </p>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          {t("title")}
        </h1>
        <p className="text-body-md text-on-surface-variant">
          {t("subtitle")}
        </p>
      </header>

      <JobPostingGenerator />
    </div>
  );
}
