import { GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OnboardingTaskList } from "./onboarding-task-list";

type Props = {
  employeeId: string;
  employeeStatus: string; // active / leave / resigned
  hireDate: string;
  resignDate: string | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_done: boolean;
  completed_at: string | null;
  note: string | null;
};

export async function OnboardingTab({
  employeeId,
  employeeStatus,
  hireDate,
  resignDate,
}: Props) {
  const supabase = createClient();
  const kind = employeeStatus === "resigned" ? "offboarding" : "onboarding";

  // 1. 기존 task 조회
  const { data: existingTasks } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("onboarding_tasks" as any)
    .select("id, title, description, category, is_done, completed_at, note, kind")
    .eq("employee_id", employeeId)
    .eq("kind", kind)
    .order("created_at", { ascending: true });

  let tasks = (existingTasks as unknown as Task[]) ?? [];

  // 2. 기존 task 가 없으면 템플릿에서 자동 생성
  if (tasks.length === 0) {
    const { data: templates } = await supabase
      .schema("chongmu")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("onboarding_templates" as any)
      .select("id, title, description, category, order_no")
      .eq("kind", kind)
      .order("order_no", { ascending: true });

    const tmpls =
      (templates as unknown as Array<{
        id: string;
        title: string;
        description: string | null;
        category: string | null;
      }>) ?? [];

    if (tmpls.length > 0) {
      const inserts = tmpls.map((t) => ({
        employee_id: employeeId,
        template_id: t.id,
        kind,
        title: t.title,
        description: t.description,
        category: t.category,
        is_done: false,
      }));

      const { data: created } = await supabase
        .schema("chongmu")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("onboarding_tasks" as any)
        .insert(inserts)
        .select("id, title, description, category, is_done, completed_at, note");

      tasks = (created as unknown as Task[]) ?? [];
    }
  }

  const done = tasks.filter((t) => t.is_done).length;
  const total = tasks.length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-stack-md">
      <header className="glass-panel rounded-xl p-6">
        <div className="mb-3 flex items-center gap-2">
          <GraduationCap aria-hidden className="h-5 w-5 text-primary-electric" />
          <h3 className="text-headline-md font-semibold text-on-surface">
            {kind === "onboarding" ? "온보딩 체크리스트" : "오프보딩 체크리스트"}
          </h3>
          <span className="ml-auto rounded bg-primary-electric/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-electric">
            {done} / {total} 완료 · {progressPct}%
          </span>
        </div>

        <div className="mb-4 h-2 w-full rounded-full bg-surface-container-high">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-container to-primary-electric"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <p className="text-label-sm text-on-surface-variant">
          {kind === "onboarding"
            ? `입사일 ${hireDate} 기준 표준 절차. 모두 완료하면 정식 입사 절차 마무리.`
            : `퇴사일 ${resignDate ?? "—"} 기준 마무리 절차. 자산 회수·연차 정산·4대보험 상실 신고까지.`}
        </p>
      </header>

      {tasks.length === 0 ? (
        <div className="glass-panel rounded-xl p-8 text-center">
          <p className="text-body-md text-on-surface-variant">
            템플릿이 없습니다. 0015 마이그레이션을 적용하세요.
          </p>
        </div>
      ) : (
        <OnboardingTaskList tasks={tasks} kind={kind} employeeId={employeeId} />
      )}
    </div>
  );
}
