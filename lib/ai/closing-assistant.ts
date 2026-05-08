import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * 결산 체크리스트 self-check 어시스턴트.
 *
 * 각 결산 항목을 데이터로 자동 검증해 "완료 가능한가" 판단.
 * 사용자는 추천을 보고 토글하면 됨.
 */

export type ClosingCheckResult = {
  task_title: string;
  /** ready: 완료 가능, warning: 검토 필요, blocked: 미완료 */
  status: "ready" | "warning" | "blocked";
  message: string;
};

const TITLE_PATTERNS: Array<{
  match: (title: string) => boolean;
  check: (year: number, month: number) => Promise<{
    status: ClosingCheckResult["status"];
    message: string;
  }>;
}> = [
  // 근태 마감
  {
    match: (t) => /근태/.test(t),
    check: async (year, month) => {
      const supabase = createClient();
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

      const { count: empCount } = await supabase
        .schema("chongmu")
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .is("deleted_at", null);

      const { data: attRows } = await supabase
        .schema("chongmu")
        .from("attendance")
        .select("employee_id")
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd);

      const recordedEmployees = new Set(
        (attRows ?? []).map((r) => r.employee_id),
      );

      const total = empCount ?? 0;
      const recorded = recordedEmployees.size;
      if (total === 0) {
        return { status: "ready", message: "활성 직원 없음 — 마감 가능" };
      }
      if (recorded < total) {
        return {
          status: "warning",
          message: `${recorded}/${total}명 입력됨. ${total - recorded}명 누락 — 확인 필요`,
        };
      }
      return {
        status: "ready",
        message: `${total}명 모두 근태 입력 완료`,
      };
    },
  },
  // 급여 계산
  {
    match: (t) => /급여\s*계산|급여계산/.test(t),
    check: async (year, month) => {
      const supabase = createClient();
      const { count: total } = await supabase
        .schema("chongmu")
        .from("payroll")
        .select("id", { count: "exact", head: true })
        .eq("pay_year", year)
        .eq("pay_month", month);

      const { count: drafts } = await supabase
        .schema("chongmu")
        .from("payroll")
        .select("id", { count: "exact", head: true })
        .eq("pay_year", year)
        .eq("pay_month", month)
        .eq("status", "draft");

      if (!total || total === 0) {
        return {
          status: "blocked",
          message: "급여 미계산 — 일괄 계산을 먼저 실행하세요",
        };
      }
      if (drafts && drafts > 0) {
        return {
          status: "warning",
          message: `총 ${total}건 중 ${drafts}건 미확정 — 검토 후 확정 권장`,
        };
      }
      return {
        status: "ready",
        message: `${total}건 모두 확정 완료`,
      };
    },
  },
  // 4대보험 신고
  {
    match: (t) => /4대보험|보험\s*신고/.test(t),
    check: async (_year, _month) => {
      const today = new Date();
      const day = today.getDate();
      if (day > 10) {
        return {
          status: "warning",
          message: `오늘이 ${day}일 — 신고 마감(10일) 이미 지남`,
        };
      }
      const remaining = 10 - day;
      return {
        status: remaining <= 3 ? "warning" : "ready",
        message: `신고 마감까지 D-${remaining}`,
      };
    },
  },
  // 지출 정산
  {
    match: (t) => /지출\s*정산|지출정산/.test(t),
    check: async (year, month) => {
      const supabase = createClient();
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

      const { data: rows } = await supabase
        .schema("chongmu")
        .from("expenses")
        .select("id, category_id")
        .gte("expense_date", monthStart)
        .lte("expense_date", monthEnd);

      const total = rows?.length ?? 0;
      const uncategorized =
        (rows ?? []).filter((r) => !r.category_id).length;

      if (total === 0) {
        return { status: "ready", message: "이번 달 지출 없음" };
      }
      if (uncategorized > 0) {
        return {
          status: "warning",
          message: `${total}건 중 ${uncategorized}건 카테고리 미분류`,
        };
      }
      return {
        status: "ready",
        message: `${total}건 모두 분류 완료`,
      };
    },
  },
  // 원천세
  {
    match: (t) => /원천세|소득세/.test(t),
    check: async (year, month) => {
      const supabase = createClient();
      const { data } = await supabase
        .schema("chongmu")
        .from("payroll")
        .select("income_tax")
        .eq("pay_year", year)
        .eq("pay_month", month);
      const total = (data ?? []).reduce(
        (s, r) => s + (Number(r.income_tax) || 0),
        0,
      );
      if (total === 0) {
        return {
          status: "blocked",
          message: "급여 계산 후 검토 가능",
        };
      }
      return {
        status: "ready",
        message: `이번 달 원천세 합계 ${total.toLocaleString("ko-KR")}원 — 신고 자료 준비됨`,
      };
    },
  },
];

export async function checkAllClosingTasks(
  year: number,
  month: number,
): Promise<Map<string, ClosingCheckResult>> {
  const supabase = createClient();
  const { data: tasks } = await supabase
    .schema("chongmu")
    .from("closing_tasks")
    .select("id, title")
    .order("order_no");

  const result = new Map<string, ClosingCheckResult>();

  for (const task of tasks ?? []) {
    const pattern = TITLE_PATTERNS.find((p) => p.match(task.title));
    if (!pattern) {
      result.set(task.id, {
        task_title: task.title,
        status: "warning",
        message: "자동 검증 미지원 — 직접 확인 필요",
      });
      continue;
    }
    try {
      const r = await pattern.check(year, month);
      result.set(task.id, {
        task_title: task.title,
        status: r.status,
        message: r.message,
      });
    } catch {
      result.set(task.id, {
        task_title: task.title,
        status: "warning",
        message: "검증 중 오류 — 직접 확인 필요",
      });
    }
  }

  return result;
}
