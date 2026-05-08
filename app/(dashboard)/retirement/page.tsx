import { PiggyBank, Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { calcProvision, type RetirementProvision } from "@/lib/retirement/calculator";

export const dynamic = "force-dynamic";

type EmpRow = {
  id: string;
  employee_no: string | null;
  name: string;
  hire_date: string;
  base_salary: number;
  status: string;
  departments: { name: string } | null;
};

export default async function RetirementPage() {
  const t = await getTranslations("retirement");
  const supabase = createClient();

  const { data: emps } = await supabase
    .schema("chongmu")
    .from("employees")
    .select(
      "id, employee_no, name, hire_date, base_salary, status, departments:department_id(name)",
    )
    .eq("status", "active")
    .is("deleted_at", null)
    .order("hire_date", { ascending: true })
    .returns<EmpRow[]>();

  const today = new Date();
  const provisions: RetirementProvision[] = (emps ?? []).map((e) => {
    const calc = calcProvision({
      hire_date: e.hire_date,
      base_salary: e.base_salary,
      baseDate: today,
    });
    return {
      employee_id: e.id,
      employee_no: e.employee_no,
      name: e.name,
      department: e.departments?.name ?? "—",
      hire_date: e.hire_date,
      base_salary: e.base_salary,
      tenure_days: calc.tenure_days,
      tenure_years: calc.tenure_years,
      provision: calc.provision,
      plan_type: "DB", // 모두 DB형 가정 (실제는 직원별 계약 따라)
    };
  });

  const totalProvision = provisions.reduce((s, p) => s + p.provision, 0);
  const eligibleCount = provisions.filter((p) => p.tenure_years >= 1).length;
  const ineligibleCount = provisions.length - eligibleCount;

  // 부서별 집계
  const byDept = new Map<string, { count: number; provision: number }>();
  for (const p of provisions) {
    const cur = byDept.get(p.department) ?? { count: 0, provision: 0 };
    cur.count += 1;
    cur.provision += p.provision;
    byDept.set(p.department, cur);
  }

  return (
    <div className="space-y-stack-lg">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
            <PiggyBank aria-hidden className="h-4 w-4" />
            Retirement Provision
          </p>
          <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            {t("title")}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {t("subtitle")}
          </p>
        </div>
        <a
          href="/api/retirement/export"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
        >
          <Download aria-hidden className="h-4 w-4" />
          엑셀 내보내기
        </a>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KpiCard
          label="총 충당부채"
          value={`${totalProvision.toLocaleString("ko-KR")}원`}
          tone="primary"
          hint="회계 부채 항목"
        />
        <KpiCard
          label="대상 직원"
          value={`${eligibleCount}명`}
          tone="default"
          hint={`전체 ${provisions.length}명 중`}
        />
        <KpiCard
          label="1년 미만"
          value={`${ineligibleCount}명`}
          tone="info"
          hint="법정 의무 없음"
        />
      </div>

      {/* 부서별 */}
      <section className="glass-panel rounded-xl p-6">
        <h2 className="mb-4 text-headline-md font-semibold text-on-surface">
          부서별
        </h2>
        <ul className="space-y-2">
          {Array.from(byDept.entries())
            .sort((a, b) => b[1].provision - a[1].provision)
            .map(([dept, v]) => (
              <li
                key={dept}
                className="flex items-center justify-between rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-2"
              >
                <span>
                  <span className="font-medium text-on-surface">{dept}</span>
                  <span className="ml-2 text-label-sm text-on-surface-variant">
                    {v.count}명
                  </span>
                </span>
                <span className="text-data-tabular font-semibold tabular-nums text-on-surface">
                  {v.provision.toLocaleString("ko-KR")}원
                </span>
              </li>
            ))}
        </ul>
      </section>

      {/* 직원별 표 */}
      <section className="glass-panel overflow-hidden rounded-xl">
        <h2 className="border-b border-outline-variant/30 px-6 py-4 text-headline-md font-semibold text-on-surface">
          직원별 충당부채
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-data-tabular">
            <thead>
              <tr className="border-b border-outline-variant/30 text-label-sm uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3 text-left">사번</th>
                <th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-left">부서</th>
                <th className="px-4 py-3 text-left">입사일</th>
                <th className="px-4 py-3 text-right">근속(년)</th>
                <th className="px-4 py-3 text-right">기본급</th>
                <th className="px-4 py-3 text-right">충당금</th>
                <th className="px-4 py-3 text-center">유형</th>
              </tr>
            </thead>
            <tbody>
              {provisions.map((p) => (
                <tr
                  key={p.employee_id}
                  className="border-b border-outline-variant/15 last:border-0 transition-colors hover:bg-primary/5"
                >
                  <td className="px-4 py-3 text-on-surface-variant">
                    {p.employee_no ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-on-surface">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {p.department}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                    {p.hire_date}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-on-surface">
                    {p.tenure_years.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">
                    {p.base_salary.toLocaleString("ko-KR")}
                  </td>
                  <td
                    className={
                      "px-4 py-3 text-right tabular-nums font-semibold " +
                      (p.tenure_years >= 1 ? "text-primary-electric" : "text-on-surface-variant/40")
                    }
                  >
                    {p.tenure_years >= 1
                      ? `${p.provision.toLocaleString("ko-KR")}원`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      {p.plan_type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-container/50 text-label-sm">
                <td className="px-4 py-3 font-semibold text-on-surface" colSpan={6}>
                  합계
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-primary-electric">
                  {totalProvision.toLocaleString("ko-KR")}원
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="glass-panel rounded-xl p-4">
        <p className="text-label-sm text-on-surface-variant">
          ⚖️ 근거: 근로자퇴직급여보장법 §8 (계속근로 1년에 30일분 평균임금). 본 계산은
          기본급을 평균임금으로 가정한 추정치입니다. 정밀 회계는 직원별 평균임금
          (직전 3개월 평균) + 비과세 통상임금까지 반영한 외부 PB 시스템 권장.
        </p>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "primary" | "default" | "info";
  hint?: string;
}) {
  const colorMap = {
    primary: "text-primary-electric",
    default: "text-on-surface",
    info: "text-tertiary",
  };
  return (
    <div className="glass-panel rounded-xl p-5">
      <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p className={`mt-2 text-display-xl font-bold tabular-nums ${colorMap[tone]}`}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-label-sm text-on-surface-variant/70">{hint}</p>
      ) : null}
    </div>
  );
}
