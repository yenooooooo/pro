"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

const InsuranceRateSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  pension_rate: z.number().min(0).max(1),
  health_rate: z.number().min(0).max(1),
  ltc_rate: z.number().min(0).max(1),
  employment_rate: z.number().min(0).max(1),
  pension_min_base: z.number().int().nonnegative().nullable(),
  pension_max_base: z.number().int().nonnegative().nullable(),
  effective_from: z.string().nullable(),
  source: z.string().nullable(),
});

export type InsuranceRateInput = z.infer<typeof InsuranceRateSchema>;

export async function upsertInsuranceRateAction(
  input: InsuranceRateInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = InsuranceRateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .schema("chongmu")
    .from("insurance_rates")
    .upsert(parsed.data, { onConflict: "year" });

  if (error) {
    return { ok: false, error: error.message };
  }

  await recordAudit({
    action: "settings.rate_updated",
    entityType: "insurance_rate",
    entityId: String(parsed.data.year),
    metadata: { year: parsed.data.year },
  });

  revalidatePath("/settings");
  return { ok: true };
}

const ClosingTaskSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullable(),
  order_no: z.number().int().min(1).max(999),
});

export async function createClosingTaskAction(
  input: z.infer<typeof ClosingTaskSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ClosingTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .schema("chongmu")
    .from("closing_tasks")
    .insert(parsed.data);

  if (error) {
    return { ok: false, error: error.message };
  }

  await recordAudit({
    action: "settings.closing_task_added",
    entityType: "closing_task",
    metadata: { title: parsed.data.title, order_no: parsed.data.order_no },
  });

  revalidatePath("/settings");
  revalidatePath("/closing");
  return { ok: true };
}

export async function deleteClosingTaskAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "id 누락" };

  const supabase = createClient();
  const { data: existing } = await supabase
    .schema("chongmu")
    .from("closing_tasks")
    .select("title, order_no")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .schema("chongmu")
    .from("closing_tasks")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  await recordAudit({
    action: "settings.closing_task_removed",
    entityType: "closing_task",
    entityId: id,
    metadata: existing
      ? { title: existing.title, order_no: existing.order_no }
      : {},
  });

  revalidatePath("/settings");
  revalidatePath("/closing");
  return { ok: true };
}
