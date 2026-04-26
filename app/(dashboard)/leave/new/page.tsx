import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LeaveRequestForm } from "@/components/features/leave/LeaveRequestForm";

type EmployeeRow = {
  id: string;
  employee_no: string;
  name: string;
  department: { name: string } | null;
};

type BalanceRow = {
  employee_id: string;
  remaining: number;
};

export default async function NewLeaveRequestPage() {
  const supabase = createClient();
  const currentYear = new Date().getFullYear();

  const [{ data: employees }, { data: balances }] = await Promise.all([
    supabase
      .from("employees")
      .select(
        `id, employee_no, name,
         department:departments(name)`,
      )
      .is("deleted_at", null)
      .eq("status", "active")
      .order("name")
      .returns<EmployeeRow[]>(),
    supabase
      .from("leave_balances")
      .select("employee_id, remaining")
      .eq("year", currentYear)
      .returns<BalanceRow[]>(),
  ]);

  const remainingByEmployee = new Map(
    (balances ?? []).map((b) => [b.employee_id, Number(b.remaining)]),
  );

  const options = (employees ?? []).map((e) => ({
    id: e.id,
    employee_no: e.employee_no,
    name: e.name,
    department: e.department?.name ?? null,
    remaining: remainingByEmployee.get(e.id) ?? null,
  }));

  return (
    <div className="space-y-stack-lg">
      <div>
        <Link
          href="/leave"
          className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          연차 현황으로
        </Link>
        <h2 className="mt-3 text-headline-lg font-semibold tracking-tight text-on-surface">
          연차 신청
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          연차 유형은 leave_balances를 차감하고, 그 외(병가·경조사·기타)는 기록만 남깁니다.
        </p>
      </div>

      <LeaveRequestForm employees={options} />
    </div>
  );
}
