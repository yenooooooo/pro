import "server-only";
import type { Locale } from "./config";

export async function getMessages(locale: Locale) {
  switch (locale) {
    case "en":
      return (await import("./messages/en.json")).default;
    case "ko":
    default:
      return (await import("./messages/ko.json")).default;
  }
}

export type Messages = Awaited<ReturnType<typeof getMessages>>;
