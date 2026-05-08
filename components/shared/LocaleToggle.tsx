"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { setLocaleAction } from "@/app/(dashboard)/actions/locale";
import type { Locale } from "@/i18n/config";

export function LocaleToggle() {
  const serverLocale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // ★ 낙관적 UI — 클릭 즉시 토글 라벨 변경 (서버 응답 안 기다림)
  const [optimisticLocale, setOptimisticLocale] = useState<Locale | null>(null);
  const locale = optimisticLocale ?? serverLocale;

  function toggle() {
    const next: Locale = locale === "ko" ? "en" : "ko";
    setOptimisticLocale(next);
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
      // refresh 완료 후 optimistic 제거 — serverLocale 이 정답
      setOptimisticLocale(null);
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
