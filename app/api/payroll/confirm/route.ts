/**
 * 월별 급여 일괄 확정 API.
 *
 * POST /api/payroll/confirm
 * Body: { year, month }
 *
 * 해당 (year, month)의 status='draft' 행을 'confirmed'로 일괄 전환하고 confirmed_at을 기록.
 * paid 상태는 건드리지 않음(이미 지급된 행은 보존).
 *
 * Phase 4.2.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

const BodySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON body가 필요합니다." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "잘못된 입력" },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .schema("chongmu")
    .from("payroll")
    .update({ status: "confirmed", confirmed_at: now })
    .eq("pay_year", parsed.data.year)
    .eq("pay_month", parsed.data.month)
    .eq("status", "draft")
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: `payroll 확정 실패: ${error.message}` },
      { status: 500 },
    );
  }

  const confirmedCount = data?.length ?? 0;
  if (confirmedCount > 0) {
    await recordAudit({
      action: "payroll.confirmed",
      entityType: "payroll",
      metadata: {
        year: parsed.data.year,
        month: parsed.data.month,
        count: confirmedCount,
        ids: (data ?? []).map((row) => row.id),
      },
    });
  }

  return NextResponse.json({
    year: parsed.data.year,
    month: parsed.data.month,
    confirmed: confirmedCount,
  });
}
