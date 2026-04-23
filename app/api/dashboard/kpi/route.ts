import { NextResponse } from "next/server";

/**
 * GET /api/dashboard/kpi
 * 대시보드 KPI 집계 반환. Phase 6에서 실제 집계 쿼리 구현.
 */
export async function GET() {
  return NextResponse.json(
    { success: false, error: "Not implemented yet — see Phase 6." },
    { status: 501 },
  );
}
