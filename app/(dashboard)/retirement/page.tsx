import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
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
      plan_type: "DB",
    };
  });

  const totalProvision = provisions.reduce((s, p) => s + p.provision, 0);
  const eligibleCount = provisions.filter((p) => p.tenure_years >= 1).length;
  const ineligibleCount = provisions.length - eligibleCount;

  const byDept = new Map<string, { count: number; provision: number }>();
  for (const p of provisions) {
    const cur = byDept.get(p.department) ?? { count: 0, provision: 0 };
    cur.count += 1;
    cur.provision += p.provision;
    byDept.set(p.department, cur);
  }
  const deptList = Array.from(byDept.entries()).sort(
    (a, b) => b[1].provision - a[1].provision,
  );

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M09</b>Reserves · Retirement
          </div>
          <h1 className="page-h">
            퇴직 <em>충당.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/retirement/export" className="btn">
            엑셀 내보내기
          </a>
        </div>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-4">
        <KPI
          label="총 추계액"
          value={totalProvision.toLocaleString("ko-KR")}
          prefix="₩"
          tone="warn"
          subtext="회계 부채 항목"
        />
        <KPI
          label="대상 직원"
          value={String(eligibleCount)}
          suffix="명"
          subtext={`전체 ${provisions.length}명 중`}
        />
        <KPI
          label="1년 미만"
          value={String(ineligibleCount)}
          suffix="명"
          subtext="법정 의무 없음"
        />
        <KPI
          label="평균 추계액"
          value={(eligibleCount > 0
            ? Math.round(totalProvision / eligibleCount)
            : 0
          ).toLocaleString("ko-KR")}
          prefix="₩"
          subtext="대상 직원 평균"
        />
      </div>

      {/* ===== 부서별 ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            부서별 <em>충당</em>
          </div>
          <div className="meta">{deptList.length}개 부서</div>
        </div>
        {deptList.length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-8 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            부서 데이터가 없습니다.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl min-w-[560px]">
              <thead>
                <tr>
                  <th>부서</th>
                  <th className="text-right">인원</th>
                  <th className="text-right">충당금</th>
                  <th className="text-right">비중</th>
                </tr>
              </thead>
              <tbody>
                {deptList.map(([dept, v]) => {
                  const ratio = totalProvision > 0 ? v.provision / totalProvision : 0;
                  return (
                    <tr key={dept}>
                      <td>
                        <span className="text-text-1">{dept}</span>
                      </td>
                      <td className="n">{v.count}</td>
                      <td className="n">
                        ₩{v.provision.toLocaleString("ko-KR")}
                      </td>
                      <td className="n">{Math.round(ratio * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== 직원별 퇴직급여 ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            직원별 <em>퇴직급여</em>
          </div>
          <div className="meta">{provisions.length}명</div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="tbl min-w-[920px]">
            <thead>
              <tr>
                <th>사번</th>
                <th>이름</th>
                <th>부서</th>
                <th>입사일</th>
                <th className="text-right">근속(년)</th>
                <th className="text-right">기본급</th>
                <th className="text-right">충당금</th>
                <th>유형</th>
              </tr>
            </thead>
            <tbody>
              {provisions.map((p) => {
                const eligible = p.tenure_years >= 1;
                return (
                  <tr key={p.employee_id}>
                    <td>{p.employee_no ?? "—"}</td>
                    <td>
                      <span className="text-text-1">{p.name}</span>
                    </td>
                    <td>{p.department}</td>
                    <td className="font-mono text-[12px]">{p.hire_date}</td>
                    <td className="n">{p.tenure_years.toFixed(2)}</td>
                    <td className="n">
                      ₩{p.base_salary.toLocaleString("ko-KR")}
                    </td>
                    <td
                      className={cn(
                        "n",
                        eligible ? "text-gold" : "text-text-3",
                      )}
                    >
                      {eligible ? `₩${p.provision.toLocaleString("ko-KR")}` : "—"}
                    </td>
                    <td>
                      <span className="chip">{p.plan_type}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={6}
                  className="border-t border-line bg-bg-1 px-[14px] py-[14px] font-mono text-[11px] uppercase tracking-[0.1em] text-text-2"
                >
                  합계
                </td>
                <td className="border-t border-line bg-bg-1 px-[14px] py-[14px] text-right font-mono font-semibold tabular-nums text-gold">
                  ₩{totalProvision.toLocaleString("ko-KR")}
                </td>
                <td className="border-t border-line bg-bg-1" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ===== 근거 ===== */}
      <div className="border border-line bg-bg-1 p-5">
        <p className="font-mono text-[11px] leading-[1.6] tracking-[0.02em] text-text-3">
          근거: 근로자퇴직급여보장법 §8 (계속근로 1년에 30일분 평균임금). 본 계산은
          기본급을 평균임금으로 가정한 추정치입니다. 정밀 회계는 직원별 평균임금
          (직전 3개월 평균) + 비과세 통상임금까지 반영한 외부 PB 시스템 권장.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
 * Subcomponents
 * ============================================================ */

function KPI({
  label,
  value,
  prefix,
  suffix,
  subtext,
  tone = "default",
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  subtext?: string;
  tone?: "default" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-[#E06B5F] italic"
      : tone === "warn"
        ? "text-gold italic"
        : "text-text-1";
  return (
    <div className="kpi-card">
      <div className="kpi-l">{label}</div>
      <div className={cn("kpi-v", toneClass)}>
        {prefix ? <span className="cur">{prefix}</span> : null}
        {value}
        {suffix ? <span className="ml-2 text-[16px] text-text-3">{suffix}</span> : null}
      </div>
      {subtext ? (
        <div className="kpi-meta">
          <span>{subtext}</span>
        </div>
      ) : null}
    </div>
  );
}
