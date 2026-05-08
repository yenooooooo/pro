/**
 * Sentry 서버 설정 — Node 런타임 (route handlers, server actions).
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // 서버 측 민감 정보 마스킹
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers) {
        const h = event.request.headers as Record<string, string>;
        delete h.authorization;
        delete h.cookie;
      }
      return event;
    },
  });
}
