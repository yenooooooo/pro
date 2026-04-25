import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployeeForm } from "@/components/features/employees/EmployeeForm";

type EmployeeRow = {
  id: string;
  employee_no: string;
  name: string;
  hire_date: string;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  bank_account: string | null;
  base_salary: number;
  dependents: number;
  department_id: string | null;
  position_id: string | null;
};

export default async function EditEmployeePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const [{ data: emp }, { data: departments }, { data: positions }] = await Promise.all([
    supabase
      .from("employees")
      .select(
        `id, employee_no, name, hire_date, birth_date, phone, email,
         bank_name, bank_account, base_salary, dependents,
         department_id, position_id`,
      )
      .eq("id", params.id)
      .maybeSingle()
      .returns<EmployeeRow | null>(),
    supabase
      .from("departments")
      .select("id, name")
      .order("name")
      .returns<{ id: string; name: string }[]>(),
    supabase
      .from("positions")
      .select("id, name, level")
      .order("level")
      .returns<{ id: string; name: string; level: number }[]>(),
  ]);

  if (!emp) notFound();

  return (
    <div className="space-y-stack-lg">
      <div>
        <Link
          href={`/employees/${emp.id}`}
          className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          직원 상세로
        </Link>
        <h2 className="mt-3 text-headline-lg font-semibold tracking-tight text-on-surface">
          직원 정보 수정
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          {emp.name} · 사번 {emp.employee_no}
        </p>
      </div>

      <EmployeeForm
        mode="edit"
        employeeId={emp.id}
        initialValues={{
          employee_no: emp.employee_no,
          name: emp.name,
          department_id: emp.department_id ?? "",
          position_id: emp.position_id ?? "",
          hire_date: emp.hire_date,
          birth_date: emp.birth_date ?? "",
          phone: emp.phone ?? "",
          email: emp.email ?? "",
          bank_name: emp.bank_name ?? "",
          bank_account: emp.bank_account ?? "",
          base_salary: emp.base_salary,
          dependents: emp.dependents,
        }}
        departments={departments ?? []}
        positions={positions ?? []}
      />
    </div>
  );
}
