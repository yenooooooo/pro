"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ToggleSchema = z.object({
  taskId: z.string().uuid(),
  is_done: z.boolean(),
});

export async function toggleOnboardingTaskAction(
  input: z.infer<typeof ToggleSchema>,
) {
  const parsed = ToggleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "인증 필요" };

  const update: {
    is_done: boolean;
    completed_at: string | null;
  } = {
    is_done: parsed.data.is_done,
    completed_at: parsed.data.is_done ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("onboarding_tasks" as any)
    .update(update)
    .eq("id", parsed.data.taskId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/employees");
  return { ok: true as const };
}
