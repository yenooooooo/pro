import { NextResponse } from "next/server";

/**
 * POST /api/leave/accrual
 * 연초 전 직원 연차 자동 부여 배치. Phase 3.2에서 실제 로직 구현.
 */
export async function POST() {
  return NextResponse.json(
    { success: false, error: "Not implemented yet — see Phase 3.2." },
    { status: 501 },
  );
}
