"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

const Schema = z.object({
  employee_id: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  spouse: z.boolean(),
  children_count: z.number().int().min(0).max(20),
  elder_count: z.number().int().min(0).max(20),
  disabled_count: z.number().int().min(0).max(20),
  insurance_premium: z.number().int().min(0),
  medical_expense: z.number().int().min(0),
  education_expense: z.number().int().min(0),
  donation: z.number().int().min(0),
  housing_loan: z.number().int().min(0),
  pension_account: z.number().int().min(0),
  credit_card: z.number().int().min(0),
  cash_receipt: z.number().int().min(0),
  notes: z.string().max(1000).nullable(),
  total_income: z.number().int().min(0),
  determined_tax: z.number().int().min(0),
  prepaid_tax: z.number().int().min(0),
  refund_amount: z.number().int(),
});

export async function saveYearEndAction(
  input: z.infer<typeof Schema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .schema("chongmu")
    .from("year_end_settlements")
    .upsert(parsed.data, { onConflict: "employee_id,year" });

  if (error) {
    return { ok: false, error: error.message };
  }

  await recordAudit({
    action: "year_end.saved",
    entityType: "year_end",
    entityId: parsed.data.employee_id,
    metadata: {
      year: parsed.data.year,
      determined_tax: parsed.data.determined_tax,
      refund_amount: parsed.data.refund_amount,
    },
  });

  revalidatePath("/year-end");
  revalidatePath(`/year-end/${parsed.data.employee_id}`);
  return { ok: true };
}
