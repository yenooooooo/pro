import { Settings as SettingsIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InsuranceRatesForm } from "./_components/insurance-rates-form";
import { ClosingTasksManager } from "./_components/closing-tasks-manager";

export default async function SettingsPage() {
  const supabase = createClient();

  const [{ data: rates }, { data: tasks }] = await Promise.all([
    supabase
      .schema("chongmu")
      .from("insurance_rates")
      .select("*")
      .order("year", { ascending: false }),
    supabase
      .schema("chongmu")
      .from("closing_tasks")
      .select("*")
      .order("order_no", { ascending: true }),
  ]);

  const currentYear = new Date().getFullYear();
  const currentRate =
    rates?.find((r) => r.year === currentYear) ?? rates?.[0] ?? null;

  return (
    <div className="space-y-stack-lg">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
          <SettingsIcon aria-hidden className="h-4 w-4" />
          System
        </p>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          시스템 설정
        </h1>
        <p className="text-body-md text-on-surface-variant">
          4대보험 요율과 월말결산 체크리스트를 관리합니다. 모든 변경은 감사 로그에 기록됩니다.
        </p>
      </header>

      <section className="glass-panel space-y-6 p-6">
        <div>
          <h2 className="text-headline-md font-semibold text-on-surface">
            4대보험 요율
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            보수월액 기준 근로자 본인 부담률(소수, 예: 4.75% → 0.0475). 매년 갱신.
          </p>
        </div>
        <InsuranceRatesForm
          rates={rates ?? []}
          initialYear={currentRate?.year ?? currentYear}
          initial={currentRate}
        />
      </section>

      <section className="glass-panel space-y-6 p-6">
        <div>
          <h2 className="text-headline-md font-semibold text-on-surface">
            월말결산 체크리스트 템플릿
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            모든 월의 결산 진행에 사용되는 항목 목록입니다. 추가·삭제 시 다음 달
            결산부터 반영됩니다.
          </p>
        </div>
        <ClosingTasksManager tasks={tasks ?? []} />
      </section>
    </div>
  );
}
