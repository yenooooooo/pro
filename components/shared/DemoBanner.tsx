"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  userEmail: string | null;
  demoEmail: string | null;
};

/**
 * v2 Demo Banner — gold pill 스타일
 */
export function DemoBanner({ userEmail, demoEmail }: Props) {
  const t = useTranslations("demo_banner");
  const [closed, setClosed] = useState(false);

  if (!userEmail || !demoEmail) return null;
  if (userEmail !== demoEmail) return null;
  if (closed) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-[14px] border-b border-gold-soft bg-gold/[0.06] px-7 py-[9px] font-mono text-[11px] uppercase tracking-[0.06em] text-gold print:hidden"
    >
      <span className="border border-gold-soft px-2 py-[2px] text-[10px] tracking-[0.08em] text-gold">
        DEMO
      </span>
      <b className="font-medium text-text-1 normal-case tracking-normal">
        {t("title")}
      </b>
      <span className="normal-case tracking-normal text-text-2">
        {t("description")}
      </span>
      <a
        href="https://github.com/yenooooooo/pro"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto hidden font-mono text-[11px] uppercase tracking-[0.08em] hover:underline md:inline-flex"
      >
        {t("view_source")} ↗
      </a>
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label={t("close")}
        className="cursor-pointer text-text-3 hover:text-text-1"
      >
        ✕
      </button>
    </div>
  );
}
