/**
 * i18n 설정 — 쿠키 기반 (URL 변경 없음).
 *
 * 사용자가 LocaleToggle 로 전환 → 쿠키 'NEXT_LOCALE' 갱신 → 페이지 새로고침.
 * 기존 라우팅 / link / RBAC 매트릭스 영향 없음.
 */

export const LOCALES = ["ko", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_LABEL: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};
