import { getRequestConfig } from "next-intl/server";
import { getLocale } from "./get-locale";
import { getMessages } from "./get-messages";

/**
 * next-intl 표준 config 파일.
 * server-side useTranslations 도 동작하도록.
 */
export default getRequestConfig(async () => {
  const locale = getLocale();
  const messages = await getMessages(locale);
  return {
    locale,
    messages: messages as Record<string, unknown>,
  };
});
