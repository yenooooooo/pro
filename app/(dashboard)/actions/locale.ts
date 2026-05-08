"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/i18n/config";

export async function setLocaleAction(locale: Locale) {
  if (!(LOCALES as readonly string[]).includes(locale)) {
    return { ok: false as const, error: "지원하지 않는 언어" };
  }
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1년
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
