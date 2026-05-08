"use client";

import { useState } from "react";
import { Sparkles, X, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  /** 현재 사용자 이메일 — DEMO_EMAIL 와 일치 시 배너 표시 */
  userEmail: string | null;
  /** 데모 이메일 (서버에서 prop 으로 주입) */
  demoEmail: string | null;
};

export function DemoBanner({ userEmail, demoEmail }: Props) {
  const t = useTranslations("demo_banner");
  const [closed, setClosed] = useState(false);

  if (!userEmail || !demoEmail) return null;
  if (userEmail !== demoEmail) return null;
  if (closed) return null;

  return (
    <div
      role="status"
      className="sticky top-16 z-20 flex flex-wrap items-center gap-2 border-b border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 px-4 py-2 text-amber-200 print:hidden"
    >
      <Sparkles aria-hidden className="h-4 w-4 flex-shrink-0" />
      <p className="flex-1 text-label-sm">
        <span className="font-semibold">{t("title")}</span> · {t("description")}
      </p>
      <a
        href="https://github.com/yenooooooo/pro"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden items-center gap-1 text-label-sm font-semibold underline-offset-2 hover:underline md:inline-flex"
      >
        {t("view_source")}
        <ExternalLink aria-hidden className="h-3 w-3" />
      </a>
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label={t("close")}
        className="ml-1 rounded p-1 text-amber-200/70 hover:bg-amber-500/10 hover:text-amber-200"
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}
