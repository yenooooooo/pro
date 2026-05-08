"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

const CreateSchema = z.object({
  employee_id: z.string().uuid(),
  title: z.string().min(2).max(120),
  destination: z.string().min(1).max(120),
  purpose: z.string().max(500).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budget: z.number().int().nonnegative().default(0),
});

export async function createTripAction(input: z.infer<typeof CreateSchema>) {
  const parsed = CreateSchema.safeParse(input);
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
    .from("business_trips" as any)
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  await recordAudit({
    action: "approval.created",
    entityType: "approval_request",
    entityId: (data as unknown as { id: string }).id,
    metadata: {
      kind: "business_trip",
      title: parsed.data.title,
      destination: parsed.data.destination,
      budget: parsed.data.budget,
    },
  });

  revalidatePath("/business-trips");
  return { ok: true as const, id: (data as unknown as { id: string }).id };
}

const ExpenseSchema = z.object({
  trip_id: z.string().uuid(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(["transport", "lodging", "meal", "misc"]),
  description: z.string().max(500).optional(),
  vendor: z.string().max(120).optional(),
  amount: z.number().int().nonnegative(),
  vat: z.number().int().nonnegative().default(0),
});

export async function addTripExpenseAction(input: z.infer<typeof ExpenseSchema>) {
  const parsed = ExpenseSchema.safeParse(input);
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
    .from("trip_expenses" as any)
    .insert(parsed.data);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/business-trips/${parsed.data.trip_id}`);
  return { ok: true as const };
}

const SettleSchema = z.object({
  trip_id: z.string().uuid(),
});

export async function settleTripAction(input: z.infer<typeof SettleSchema>) {
  const parsed = SettleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();

  // 출장 정보 + 정산액 조회
  const { data: trip } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("business_trips" as any)
    .select("title, budget, total_settled, status")
    .eq("id", parsed.data.trip_id)
    .maybeSingle();

  if (!trip) return { ok: false as const, error: "출장을 찾을 수 없습니다." };

  type Trip = {
    title: string;
    budget: number;
    total_settled: number;
    status: string;
  };
  const t = trip as unknown as Trip;
  const reimbursement = t.total_settled - t.budget; // 음수면 회사 환수, 양수면 직원 환급

  const { error } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("business_trips" as any)
    .update({
      status: "settled",
      reimbursement_amount: reimbursement,
      settled_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.trip_id);

  if (error) return { ok: false as const, error: error.message };

  await recordAudit({
    action: "approval.approved",
    entityType: "approval_request",
    entityId: parsed.data.trip_id,
    metadata: {
      kind: "trip_settled",
      total: t.total_settled,
      budget: t.budget,
      reimbursement,
    },
  });

  revalidatePath("/business-trips");
  revalidatePath(`/business-trips/${parsed.data.trip_id}`);
  return { ok: true as const };
}

export async function reimburseTripAction(tripId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("business_trips" as any)
    .update({
      status: "reimbursed",
      reimbursed_at: new Date().toISOString(),
    })
    .eq("id", tripId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/business-trips");
  revalidatePath(`/business-trips/${tripId}`);
  return { ok: true as const };
}

export async function deleteTripExpenseAction(expenseId: string, tripId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("trip_expenses" as any)
    .delete()
    .eq("id", expenseId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/business-trips/${tripId}`);
  return { ok: true as const };
}

export async function createAndRedirectTrip(input: z.infer<typeof CreateSchema>) {
  const result = await createTripAction(input);
  if (result.ok) {
    redirect(`/business-trips/${result.id}`);
  }
  return result;
}
