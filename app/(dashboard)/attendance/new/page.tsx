import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AttendanceForm } from "@/components/features/attendance/AttendanceForm";

type EmployeeRow = {
  id: string;
  employee_no: string;
  name: string;
  department: { name: string } | null;
};

export default async function NewAttendancePage() {
  const supabase = createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select(
      `id, employee_no, name,
       department:departments(name)`,
    )
    .is("deleted_at", null)
    .eq("status", "active")
    .order("name")
    .returns<EmployeeRow[]>();

  const options = (employees ?? []).map((e) => ({
    id: e.id,
    employee_no: e.employee_no,
    name: e.name,
    department: e.department?.name ?? null,
  }));

  return (
    <div className="space-y-stack-lg">
      <div>
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          근태 목록으로
        </Link>
        <h2 className="mt-3 text-headline-lg font-semibold tracking-tight text-on-surface">
          근태 등록
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          출/퇴근 시각으로 정상근로·연장근로가 자동 계산됩니다.
        </p>
      </div>

      <AttendanceForm employees={options} />
    </div>
  );
}
