import "server-only";

/**
 * Slack/Discord 웹훅 알림.
 *
 * 환경변수:
 *   SLACK_WEBHOOK_URL — Slack Incoming Webhook
 *   DISCORD_WEBHOOK_URL — Discord 웹훅
 *
 * 둘 다 미설정 시 자동 skip (graceful).
 * 양쪽 다 설정되면 둘 다 발송.
 */

export type WebhookMessage = {
  title: string;
  body: string;
  /** 결재/이상감지/리스크 등 */
  category: "approval" | "anomaly" | "risk" | "info";
  /** 라이브 사이트 URL — 클릭 시 이동 */
  url?: string;
};

const COLOR_MAP = {
  approval: "#c0c1ff", // electric indigo
  anomaly: "#fbbf24",  // amber
  risk: "#ef4444",     // red
  info: "#7bd0ff",     // sky
};

export async function notifyWebhooks(msg: WebhookMessage): Promise<void> {
  const slack = process.env.SLACK_WEBHOOK_URL;
  const discord = process.env.DISCORD_WEBHOOK_URL;

  const promises: Promise<unknown>[] = [];

  if (slack) {
    promises.push(
      fetch(slack, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*${msg.title}*\n${msg.body}${msg.url ? `\n<${msg.url}|상세 보기>` : ""}`,
          attachments: [
            {
              color: COLOR_MAP[msg.category],
              footer: "Nexus ERP",
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        }),
      }).catch((err) => {
        console.error("[webhook] Slack 발송 실패:", err);
      }),
    );
  }

  if (discord) {
    promises.push(
      fetch(discord, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: msg.title,
              description: msg.body,
              color: parseInt(COLOR_MAP[msg.category].slice(1), 16),
              url: msg.url,
              footer: { text: "Nexus ERP" },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      }).catch((err) => {
        console.error("[webhook] Discord 발송 실패:", err);
      }),
    );
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
}

export function isWebhookConfigured(): boolean {
  return Boolean(
    process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL,
  );
}
