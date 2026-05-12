import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("simulator");
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
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M17</b>Planning · Simulator
          </div>
          <h1 className="page-h">
            인건비 <em>시뮬.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
          Workforce Cost Simulator
        </div>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-3">
        <KPI label="총 인원" value={totalHeadcount.toLocaleString("ko-KR")} suffix="명" />
        <KPI label="기본급 총액" value={totalBase.toLocaleString("ko-KR")} prefix="₩" />
        <KPI label="평균 기본급" value={overallAvg.toLocaleString("ko-KR")} prefix="₩" />
      </div>

      {/* ===== 부서별 baseline ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            부서별 <em>Baseline</em>
          </div>
          <div className="meta">{departments.length}개 부서</div>
        </div>
        {departments.length === 0 ? (
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
                  <th className="text-right">기본급 합계</th>
                  <th className="text-right">평균</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.department}>
                    <td>
                      <span className="text-text-1">{d.department}</span>
                    </td>
                    <td className="n">{d.headcount}</td>
                    <td className="n">₩{d.total_base.toLocaleString("ko-KR")}</td>
                    <td className="n">₩{d.avg_base.toLocaleString("ko-KR")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="border-t border-line bg-bg-1 px-[14px] py-[14px] font-mono text-[11px] uppercase tracking-[0.1em] text-text-2">
                    합계
                  </td>
                  <td className="border-t border-line bg-bg-1 px-[14px] py-[14px] text-right font-mono font-semibold tabular-nums text-text-1">
                    {totalHeadcount}
                  </td>
                  <td className="border-t border-line bg-bg-1 px-[14px] py-[14px] text-right font-mono font-semibold tabular-nums text-gold">
                    ₩{totalBase.toLocaleString("ko-KR")}
                  </td>
                  <td className="border-t border-line bg-bg-1 px-[14px] py-[14px] text-right font-mono font-semibold tabular-nums text-text-1">
                    ₩{overallAvg.toLocaleString("ko-KR")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* ===== 인터랙티브 시뮬레이터 ===== */}
      <section className="panel border border-line">
        <SimulatorClient
          departments={departments}
          baseline={{
            headcount: totalHeadcount,
            totalBase,
            overallAvg,
          }}
        />
      </section>
    </div>
  );
}

function KPI({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-l">{label}</div>
      <div className="kpi-v">
        {prefix ? <span className="cur">{prefix}</span> : null}
        {value}
        {suffix ? <span className="ml-2 text-[16px] text-text-3">{suffix}</span> : null}
      </div>
    </div>
  );
}
