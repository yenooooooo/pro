"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AddSchema = z.object({
  kind: z.enum(["page", "employee", "vendor"]),
  target: z.string().min(1).max(200),
  label: z.string().min(1).max(80),
  icon: z.string().max(40).optional(),
});

export async function addBookmarkAction(
  input: z.infer<typeof AddSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = AddSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "인증 필요" };

  const { error } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bookmarks" as any)
    .insert({
      user_id: user.id,
      ...parsed.data,
    });

  if (error) {
    if (error.code === "23505") {
      // unique violation — 이미 즐겨찾기됨
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeBookmarkAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "id 누락" };
  const supabase = createClient();
  const { error } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("bookmarks" as any)
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
