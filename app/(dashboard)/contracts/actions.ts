"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SaveSchema = z.object({
  title: z.string().min(1).max(200),
  contract_type: z.string().nullable(),
  vendor_id: z.string().uuid().nullable(),
  amount: z.number().int().nonnegative().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  signed_date: z.string().nullable(),
  parties: z.array(z.string()).default([]),
  notes: z.string().nullable(),
});

export async function saveContractAction(input: z.infer<typeof SaveSchema>) {
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "인증 필요" };

  const { error } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("contracts" as any)
    .insert({
      ...parsed.data,
      status: parsed.data.end_date && new Date(parsed.data.end_date) < new Date()
        ? "expired"
        : "active",
    });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/contracts");
  return { ok: true as const };
}
