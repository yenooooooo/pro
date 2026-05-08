"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { setLocaleAction } from "@/app/(dashboard)/actions/locale";
import type { Locale } from "@/i18n/config";

export function LocaleToggle() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next: Locale = locale === "ko" ? "en" : "ko";
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label="Toggle language / 언어 전환"
      className="hidden min-h-9 items-center gap-1 rounded-full border border-outline-variant/30 bg-surface-container/50 px-2.5 py-1 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface md:inline-flex"
    >
      <Globe aria-hidden className="h-3.5 w-3.5" />
      <span className="font-mono font-bold uppercase tracking-widest">
        {locale === "ko" ? "EN" : "KO"}
      </span>
    </button>
  );
}
