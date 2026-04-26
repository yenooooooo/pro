/**
 * 연초 연차 일괄 부여 API.
 *
 * POST /api/leave/accrual
 * Body: { year: number, mode?: "hire_date" | "fiscal_year", reference_date?: "YYYY-MM-DD" }
 *
 * 활성 직원 전원에 대해 calculateAnnualLeave로 발생 일수를 계산하고,
 * leave_balances를 (employee_id, year) 키로 upsert한다.
 * 기존 balance가 있으면 total_used를 보존하고 total_granted/remaining만 갱신.
 *
 * 인증: Supabase 로그인된 관리자(authenticated). MVP = 단일 관리자.
 *
 * 한계: SELECT existing → UPSERT 사이에 동시 apply_leave가 일어나면
 *  total_used를 stale 값으로 덮어쓸 수 있음. 운영 환경에서는 점검 시간대 실행 권장.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { calculateAnnualLeave } from "@/lib/calculators/leave";

const BodySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  mode: z.enum(["hire_date", "fiscal_year"]).default("fiscal_year"),
  reference_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional(),
});

type EmployeeRow = {
  id: string;
  name: string;
  hire_date: string;
};

type ExistingBalance = {
  employee_id: string;
  total_used: number;
};

type ProcessedDetail = {
  employee_id: string;
  name: string;
  granted: number;
  total_used: number;
  remaining: number;
  basis: "monthly" | "annual";
};

type SkippedDetail = {
  employee_id: string;
  name: string;
  skipped: true;
  error: string;
};

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON body가 필요합니다." },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "잘못된 입력" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, name, hire_date")
    .is("deleted_at", null)
    .eq("status", "active")
    .returns<EmployeeRow[]>();

  if (empErr) {
    return NextResponse.json(
      { error: `직원 조회 실패: ${empErr.message}` },
      { status: 500 },
    );
  }
  if (!employees || employees.length === 0) {
    return NextResponse.json(
      { error: "활성 직원이 없습니다." },
      { status: 404 },
    );
  }

  const { data: existing } = await supabase
    .from("leave_balances")
    .select("employee_id, total_used")
    .eq("year", input.year)
    .returns<ExistingBalance[]>();
  const usedMap = new Map(
    (existing ?? []).map((b) => [b.employee_id, Number(b.total_used)]),
  );

  // 기준일: 명시값 > fiscal_year 모드 연말 > hire_date 모드 오늘
  const referenceDate = input.reference_date
    ? new Date(input.reference_date)
    : input.mode === "fiscal_year"
      ? new Date(input.year, 11, 31)
      : new Date();

  const processed: ProcessedDetail[] = [];
  const skipped: SkippedDetail[] = [];

  for (const emp of employees) {
    const result = calculateAnnualLeave(
      new Date(emp.hire_date),
      referenceDate,
      input.mode,
    );
    if (!result.success) {
      skipped.push({
        employee_id: emp.id,
        name: emp.name,
        skipped: true,
        error: result.error,
      });
      continue;
    }
    const used = usedMap.get(emp.id) ?? 0;
    processed.push({
      employee_id: emp.id,
      name: emp.name,
      granted: result.days,
      total_used: used,
      remaining: result.days - used,
      basis: result.basis,
    });
  }

  if (processed.length > 0) {
    const payload = processed.map((r) => ({
      employee_id: r.employee_id,
      year: input.year,
      total_granted: r.granted,
      total_used: r.total_used,
      remaining: r.remaining,
    }));

    const { error: upsertErr } = await supabase
      .schema("chongmu")
      .from("leave_balances")
      .upsert(payload, { onConflict: "employee_id,year" });

    if (upsertErr) {
      return NextResponse.json(
        { error: `upsert 실패: ${upsertErr.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    year: input.year,
    mode: input.mode,
    reference_date: referenceDate.toISOString().slice(0, 10),
    processed: processed.length,
    skipped: skipped.length,
    details: [...processed, ...skipped],
  });
}
