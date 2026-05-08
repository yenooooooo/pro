import Link from "next/link";
import { ArrowLeft, MessageSquare, Sheet, BookOpen } from "lucide-react";
import { NotionSyncButton } from "./_notion-sync";

export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  const slackEnabled = Boolean(process.env.SLACK_WEBHOOK_URL);
  const discordEnabled = Boolean(process.env.DISCORD_WEBHOOK_URL);
  const notionEnabled = Boolean(
    process.env.NOTION_TOKEN && process.env.NOTION_EMPLOYEES_DB_ID,
  );

  return (
    <div className="space-y-stack-lg">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        시스템 설정
      </Link>

      <header className="space-y-2">
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          외부 연동
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Slack/Discord 알림, Google Sheets 동기화, Notion 단방향 미러링.
        </p>
      </header>

      {/* Slack/Discord */}
      <section className="glass-panel rounded-xl p-6 space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare aria-hidden className="h-5 w-5 text-primary-electric" />
              <h2 className="text-headline-md font-semibold text-on-surface">
                Slack / Discord 알림
              </h2>
            </div>
            <p className="mt-1 text-body-md text-on-surface-variant">
              결재 발의/승인/반려 시 자동 알림. 둘 다 설정하면 둘 다 발송.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Status enabled={slackEnabled} label="Slack" />
            <Status enabled={discordEnabled} label="Discord" />
          </div>
        </header>

        <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 text-label-sm space-y-2">
          <p className="font-semibold text-on-surface">설정 방법 (Slack)</p>
          <ol className="ml-4 list-decimal space-y-1 text-on-surface-variant">
            <li>Slack 워크스페이스 → Apps → &quot;Incoming Webhooks&quot; 추가</li>
            <li>알림 받을 채널 선택 → Webhook URL 발급</li>
            <li>Vercel 환경변수에 <code className="rounded bg-surface-container px-1">SLACK_WEBHOOK_URL</code> 추가</li>
          </ol>
          <p className="mt-3 font-semibold text-on-surface">설정 방법 (Discord)</p>
          <ol className="ml-4 list-decimal space-y-1 text-on-surface-variant">
            <li>Discord 채널 → 설정 → 통합 → 웹훅 → 새 웹훅</li>
            <li>웹훅 URL 복사</li>
            <li>Vercel 환경변수에 <code className="rounded bg-surface-container px-1">DISCORD_WEBHOOK_URL</code> 추가</li>
          </ol>
        </div>
      </section>

      {/* Google Sheets */}
      <section className="glass-panel rounded-xl p-6 space-y-4">
        <header className="flex items-start gap-3">
          <Sheet aria-hidden className="h-5 w-5 text-primary-electric mt-0.5" />
          <div>
            <h2 className="text-headline-md font-semibold text-on-surface">
              Google Sheets 동기화
            </h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Sheets 의 <code className="rounded bg-surface-container-high px-1">IMPORTDATA()</code> 함수로 ERP 직원 명부를 자동 가져오기.
            </p>
          </div>
        </header>

        <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 text-label-sm space-y-2">
          <p className="font-semibold text-on-surface">사용 방법</p>
          <ol className="ml-4 list-decimal space-y-1 text-on-surface-variant">
            <li>새 Google Sheets 생성</li>
            <li>A1 셀에 다음 함수 입력:</li>
          </ol>
          <pre className="mt-2 overflow-x-auto rounded bg-surface-container p-3 font-mono text-label-sm text-on-surface">
            =IMPORTDATA(&quot;https://pro-gules-beta.vercel.app/api/employees/export/csv&quot;)
          </pre>
          <p className="mt-2 text-on-surface-variant">
            ⚠ 인증된 사용자만 접근 가능. 외부 공유는 추후 서명 토큰 방식으로 확장 예정 (v1.1).
          </p>
        </div>
      </section>

      {/* Notion */}
      <section className="glass-panel rounded-xl p-6 space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <BookOpen aria-hidden className="h-5 w-5 text-primary-electric mt-0.5" />
            <div>
              <h2 className="text-headline-md font-semibold text-on-surface">
                Notion 직원 명부 미러링
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                ERP 직원 데이터를 Notion 데이터베이스로 단방향 sync. 전사 위키에서 조회 가능.
              </p>
            </div>
          </div>
          <Status enabled={notionEnabled} label="Notion" />
        </header>

        {notionEnabled ? (
          <NotionSyncButton />
        ) : (
          <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 text-label-sm space-y-2">
            <p className="font-semibold text-on-surface">설정 방법</p>
            <ol className="ml-4 list-decimal space-y-1 text-on-surface-variant">
              <li>
                <a
                  href="https://www.notion.so/my-integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-electric hover:underline"
                >
                  Notion Integrations
                </a>
                에서 새 통합 생성 → Internal Integration Token 복사
              </li>
              <li>
                Notion 에서 직원 데이터베이스 생성. 속성: 이름(Title), 사번(Text),
                부서(Select), 직급(Select), 상태(Select), 입사일(Date), 이메일(Email)
              </li>
              <li>DB 페이지 우상단 ⋯ → &quot;Add connections&quot; 에서 위 통합 연결</li>
              <li>DB URL 의 32자 hex (예: <code>?v=abc...</code> 앞부분) 복사</li>
              <li>
                Vercel 환경변수: <code className="rounded bg-surface-container px-1">NOTION_TOKEN</code>,{" "}
                <code className="rounded bg-surface-container px-1">NOTION_EMPLOYEES_DB_ID</code>
              </li>
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}

function Status({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold " +
        (enabled
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-outline-variant/40 bg-surface-container-high text-on-surface-variant")
      }
    >
      {enabled ? "✓" : "○"} {label}
    </span>
  );
}
