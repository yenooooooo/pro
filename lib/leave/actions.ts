"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z
  .object({
    employee_id: z.string().uuid("직원을 선택하세요"),
    leave_type: z.enum(["annual", "sick", "family", "other"], {
      errorMap: () => ({ message: "유형을 선택하세요" }),
    }),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식"),
    days: z.coerce
      .number({ invalid_type_error: "숫자만 입력" })
      .min(0.5, "0.5일 이상")
      .max(365, "365일 이하"),
    reason: z.string().max(200, "200자 이하").optional().nullable(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "종료일이 시작일보다 빨라요.",
    path: ["end_date"],
  });

export type LeaveRequestInput = z.infer<typeof Schema>;

export type LeaveRequestActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

/**
 * 연차 신청 처리.
 * apply_leave SQL 함수에 위임 — leave_requests INSERT + (annual인 경우) leave_balances 갱신을
 * 단일 트랜잭션으로 묶는다 (0004 마이그레이션).
 */
export async function createLeaveRequestAction(
  raw: unknown,
): Promise<LeaveRequestActionResult> {
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "잘못된 입력",
    };
  }
  const input = parsed.data;
  const supabase = createClient();

  const { data, error } = await supabase.schema("chongmu").rpc("apply_leave", {
    p_employee_id: input.employee_id,
    p_leave_type: input.leave_type,
    p_start_date: input.start_date,
    p_end_date: input.end_date,
    p_days: input.days,
    p_reason: input.reason ?? null,
  });

  if (error) {
    // P0001/P0002 = 함수 내부에서 raise한 비즈니스 에러 (잔여 부족 등)
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: "신청은 처리됐지만 ID를 받지 못했습니다." };
  }

  revalidatePath("/leave");
  return { success: true, id: data };
}
