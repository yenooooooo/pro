"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AddSchema = z.object({
  entityType: z.enum([
    "approval_request",
    "expense",
    "asset",
    "employee",
    "vendor",
    "leave_request",
    "closing_history",
  ]),
  entityId: z.string().min(1),
  body: z.string().min(1).max(2000),
  mentions: z.array(z.string()).default([]),
});

export async function addCommentAction(input: z.infer<typeof AddSchema>) {
  const parsed = AddSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "인증 필요" };

  const { data, error } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("comments" as any)
    .insert({
      entity_type: parsed.data.entityType,
      entity_id: parsed.data.entityId,
      author_id: user.id,
      author_email: user.email,
      body: parsed.data.body,
      mentions: parsed.data.mentions,
    })
    .select("id, author_email, body, mentions, created_at, edited_at")
    .single();

  if (error) return { ok: false as const, error: error.message };

  return {
    ok: true as const,
    comment: data as unknown as {
      id: string;
      author_email: string;
      body: string;
      mentions: string[];
      created_at: string;
      edited_at: string | null;
    },
  };
}

export async function deleteCommentAction(id: string) {
  if (!id) return { ok: false as const, error: "id 누락" };
  const supabase = createClient();
  const { error } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("comments" as any)
    .delete()
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
