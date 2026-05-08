"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

const Schema = z.object({
  employeeId: z.string().uuid(),
});

export async function anonymizeEmployeeAction(
  input: z.infer<typeof Schema>,
) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "인증 필요" };

  // 메타데이터 조회 (audit 용)
  const { data: emp } = await supabase
    .schema("chongmu")
    .from("employees")
    .select("name, employee_no, resign_date")
    .eq("id", parsed.data.employeeId)
    .maybeSingle();

  if (!emp) return { ok: false as const, error: "직원을 찾을 수 없습니다." };

  const today = new Date();
  const stamp = `${today.getFullYear().toString().slice(2)}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  // 민감 정보 제거 (NULL/마스킹)
  const updatePayload: Record<string, string | null> = {
    name: `익명_${stamp}`,
    email: null,
    phone: null,
    bank_account: null,
    bank_name: null,
    birth_date: null,
  };
  const { error } = await supabase
    .schema("chongmu")
    .from("employees")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updatePayload as any)
    .eq("id", parsed.data.employeeId);

  if (error) return { ok: false as const, error: error.message };

  await recordAudit({
    action: "employee.resigned", // 별도 액션 추가 전까지 재사용 + metadata 로 구분
    entityType: "employee",
    entityId: parsed.data.employeeId,
    metadata: {
      kind: "anonymize",
      previous_name: emp.name,
      previous_employee_no: emp.employee_no,
      resign_date: emp.resign_date,
      by: user.email ?? null,
      reason: "개인정보 보존기간 만료 자동 폐기",
    },
  });

  revalidatePath("/settings/privacy");
  revalidatePath("/employees");
  return { ok: true as const };
}
