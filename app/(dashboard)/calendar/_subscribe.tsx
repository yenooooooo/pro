"use client";

import { useState } from "react";
import { Download, Link2, Check } from "lucide-react";

type Props = {
  year: number;
};

export function CalendarSubscribeButton({ year }: Props) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/calendar/ics?year=${year}`
      : "";

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard 실패 시 무시 */
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/calendar/ics?year=${year}`}
          download
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
        >
          <Download aria-hidden className="h-4 w-4" />
          ICS 다운로드
        </a>
        <button
          type="button"
          onClick={copyUrl}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-4 py-2 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          {copied ? (
            <Check aria-hidden className="h-4 w-4" />
          ) : (
            <Link2 aria-hidden className="h-4 w-4" />
          )}
          {copied ? "복사됨" : "구독 URL 복사"}
        </button>
      </div>
      <p className="text-label-sm text-on-surface-variant/70">
        Google Calendar / Outlook / Apple Calendar 에서 &quot;URL 로 캘린더 추가&quot;
      </p>
    </div>
  );
}
