import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SimulatorClient } from "./_simulator-client";

export const dynamic = "force-dynamic";

type DeptAggregate = {
  department: string;
  headcount: number;
  total_base: number;
  avg_base: number;
};

type EmpRow = {
  base_salary: number;
  status: string;
  departments: { name: string } | null;
};

export default async function SimulatorPage() {
  const supabase = createClient();

  // 부서별 인건비 집계
  const { data: emps } = await supabase
    .schema("chongmu")
    .from("employees")
    .select("base_salary, status, departments:department_id(name)")
    .eq("status", "active")
    .is("deleted_at", null)
    .returns<EmpRow[]>();

  const map = new Map<string, { headcount: number; total_base: number }>();
  for (const e of emps ?? []) {
    const dept = e.departments?.name ?? "(미배정)";
    const cur = map.get(dept) ?? { headcount: 0, total_base: 0 };
    cur.headcount += 1;
    cur.total_base += e.base_salary || 0;
    map.set(dept, cur);
  }
  const departments: DeptAggregate[] = Array.from(map.entries()).map(
    ([department, v]) => ({
      department,
      headcount: v.headcount,
      total_base: v.total_base,
      avg_base: v.headcount > 0 ? Math.round(v.total_base / v.headcount) : 0,
    }),
  );
  departments.sort((a, b) => b.total_base - a.total_base);

  const totalHeadcount = departments.reduce((s, d) => s + d.headcount, 0);
  const totalBase = departments.reduce((s, d) => s + d.total_base, 0);
  const overallAvg = totalHeadcount > 0 ? Math.round(totalBase / totalHeadcount) : 0;

  return (
    <div className="space-y-stack-lg">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
          <TrendingUp aria-hidden className="h-4 w-4" />
          Workforce Cost Simulator
        </p>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          인건비 시뮬레이터
        </h1>
        <p className="text-body-md text-on-surface-variant">
          채용·연봉 인상·최저임금 변동의 월간/연간 비용 임팩트를 실시간으로 계산합니다.
          기본급에 4대보험 회사부담분(약 9.4%)을 합산해 추정합니다.
        </p>
      </header>

      <SimulatorClient
        departments={departments}
        baseline={{
          headcount: totalHeadcount,
          totalBase,
          overallAvg,
        }}
      />
    </div>
  );
}
