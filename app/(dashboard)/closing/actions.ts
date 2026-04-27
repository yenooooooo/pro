"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * 월말결산 항목 체크 토글.
 *
 * (year, month, task_id) 조합으로 closing_history를 upsert.
 * 기존 행이 없으면 is_done=true로 생성, 있으면 is_done을 반전.
 *
 * 인증 필요: Supabase 로그인된 사용자.
 */
export async function toggleClosingTask(
  year: number,
  month: number,
  taskId: string,
): Promise<{ success: true; is_done: boolean } | { success: false; error: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "인증이 필요합니다." };
  }

  // 기존 row 조회
  const { data: existing } = await supabase
    .from("closing_history")
    .select("id, is_done")
    .eq("year", year)
    .eq("month", month)
    .eq("task_id", taskId)
    .maybeSingle()
    .returns<{ id: string; is_done: boolean } | null>();

  const nextIsDone = !existing?.is_done;
  const now = nextIsDone ? new Date().toISOString() : null;

  if (existing) {
    const { error } = await supabase
      .schema("chongmu")
      .from("closing_history")
      .update({
        is_done: nextIsDone,
        completed_at: now,
        completed_by: nextIsDone ? user.id : null,
      })
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .schema("chongmu")
      .from("closing_history")
      .insert({
        year,
        month,
        task_id: taskId,
        is_done: nextIsDone,
        completed_at: now,
        completed_by: nextIsDone ? user.id : null,
      });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/closing");
  return { success: true, is_done: nextIsDone };
}
