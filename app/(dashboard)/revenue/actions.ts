"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  department_id: z.string().uuid(),
  amount: z.number().int().nonnegative(),
});

export async function upsertRevenueAction(input: z.infer<typeof Schema>) {
  const parsed = Schema.safeParse(input);
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
    .from("revenue" as any)
    .upsert(
      {
        year: parsed.data.year,
        month: parsed.data.month,
        department_id: parsed.data.department_id,
        amount: parsed.data.amount,
        vat: Math.round(parsed.data.amount * 0.1),
      },
      { onConflict: "year,month,department_id" },
    );

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/revenue");
  revalidatePath("/executive");
  return { ok: true as const };
}
