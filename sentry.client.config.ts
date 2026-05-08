/**
 * Sentry 클라이언트 설정.
 * NEXT_PUBLIC_SENTRY_DSN 미설정 시 자동 disable.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    beforeSend(event) {
      // 민감 정보 마스킹
      if (event.request?.cookies) delete event.request.cookies;
      if (event.user?.ip_address) delete event.user.ip_address;
      return event;
    },
  });
}
