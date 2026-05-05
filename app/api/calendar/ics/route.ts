/**
 * 세무 마감일 ICS 캘린더 export.
 *
 * GET /api/calendar/ics?year=2026
 *
 * 사용자가 Google Calendar / Outlook / Apple Calendar 의 "URL 로 추가"
 * 또는 subscribe 기능으로 이 URL 을 등록하면 자동 sync.
 *
 * 인증 없음 (공개) — 데이터 자체는 공개 정보 (세무 마감일).
 * 만약 사적 일정 (휴가 등) 도 ICS export 시 시그니처 토큰 필요.
 */

import { NextRequest, NextResponse } from "next/server";
import { deadlinesToIcs, getTaxDeadlines } from "@/lib/calendar/tax-deadlines";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();

  const items = getTaxDeadlines(year);
  const ics = deadlinesToIcs(year, items);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="nexus-erp-tax-${year}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
