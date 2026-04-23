import { NextResponse } from "next/server";

/**
 * POST /api/payroll/calculate
 * 월별 전 직원 급여 일괄 계산. Phase 4에서 실제 로직 구현.
 */
export async function POST() {
  return NextResponse.json(
    { success: false, error: "Not implemented yet — see Phase 4." },
    { status: 501 },
  );
}
