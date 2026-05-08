"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/i18n/config";

export async function setLocaleAction(locale: Locale) {
  if (!(LOCALES as readonly string[]).includes(locale)) {
    return { ok: false as const, error: "지원하지 않는 언어 / Unsupported locale" };
  }
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1년
    sameSite: "lax",
  });
  // ★ revalidatePath 제거 — 데이터 캐시는 유지하고 router.refresh()만으로 메시지 dict 교체
  return { ok: true as const };
}
