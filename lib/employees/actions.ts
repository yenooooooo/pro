"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

/**
 * 직원 퇴사 처리 — soft delete.
 * status='resigned' + resign_date=오늘 + deleted_at=now().
 * 급여·근태 기록은 보존되며 직원 리스트(deleted_at IS NULL)에서만 제외.
 */
export async function resignEmployeeAction(employeeId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: prior } = await supabase
    .schema("chongmu")
    .from("employees")
    .select("name, employee_no")
    .eq("id", employeeId)
    .maybeSingle<{ name: string; employee_no: string }>();

  const { error } = await supabase
    .schema("chongmu")
    .from("employees")
    .update({
      status: "resigned",
      resign_date: today,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", employeeId);
  if (error) throw new Error(`퇴사 처리 실패: ${error.message}`);

  await recordAudit({
    action: "employee.resigned",
    entityType: "employee",
    entityId: employeeId,
    metadata: {
      name: prior?.name ?? null,
      employee_no: prior?.employee_no ?? null,
      resign_date: today,
    },
  });

  revalidatePath("/employees");
  redirect("/employees");
}
