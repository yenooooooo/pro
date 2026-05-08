import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from "./config";

export function getLocale(): Locale {
  const cookieStore = cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  if (value && (LOCALES as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}
