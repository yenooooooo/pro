import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmployeeForm } from "@/components/features/employees/EmployeeForm";

export default async function NewEmployeePage() {
  const supabase = createClient();
  const [{ data: departments }, { data: positions }] = await Promise.all([
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

  return (
    <div className="space-y-stack-lg">
      <div>
        <Link
          href="/employees"
          className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          직원 목록으로
        </Link>
        <h2 className="mt-3 text-headline-lg font-semibold tracking-tight text-on-surface">
          신규 직원 등록
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          기본 정보를 입력하면 즉시 디렉토리에 반영됩니다.
        </p>
      </div>

      <EmployeeForm
        mode="create"
        departments={departments ?? []}
        positions={positions ?? []}
      />
    </div>
  );
}
