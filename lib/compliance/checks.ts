import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * 한국 노무·세무 법령 자동 점검 모듈.
 *
 * 근거:
 * - 근로기준법 제53조 (연장근로 한도 주 12h)
 * - 최저임금법 (월 환산 = 시급 × 209h)
 * - 근로기준법 제60조 + 고용노동부 연차 사용 촉진 (사용률 80% 미만)
 * - 4대보험·원천세 신고 마감일 (매월 10일)
 *
 * 모든 함수는 read-only. 기준일을 인자로 받아 시뮬레이션 가능.
 */

export type RiskItem = {
  id: string;
  severity: "info" | "warn" | "danger";
  category: "labor_hours" | "minimum_wage" | "leave" | "contract" | "filing";
  title: string;
  description: string;
  detail?: string;
  href?: string;
  count?: number;
  /** 영향받는 직원/거래처 ID 등 */
  affected?: Array<{ id: string; name: string; meta?: string }>;
};

const MONTHLY_OVERTIME_THRESHOLD = 52; // 주 12h × 4.345주

export async function getComplianceRisks(today = new Date()): Promise<RiskItem[]> {
  const supabase = createClient();
  const items: RiskItem[] = [];

  // ── 1. 주 52h 환산 초과 ─────────────────────────────
  try {
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .getDate();
    const monthEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${lastDay}`;

    type AttRow = {
      employee_id: string;
      overtime_hours: number;
      employees: { name: string; employee_no: string | null } | null;
    };

    const { data: rows } = await supabase
      .schema("chongmu")
      .from("attendance")
      .select(
        `employee_id, overtime_hours,
         employees:employee_id(name, employee_no)`,
      )
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd)
      .returns<AttRow[]>();

    const sumByEmp = new Map<string, { name: string; ot: number; emp_no?: string }>();
    for (const r of rows ?? []) {
      const cur = sumByEmp.get(r.employee_id) ?? {
        name: r.employees?.name ?? "?",
        emp_no: r.employees?.employee_no ?? undefined,
        ot: 0,
      };
      cur.ot += Number(r.overtime_hours) || 0;
      sumByEmp.set(r.employee_id, cur);
    }
    const violators = Array.from(sumByEmp.entries())
      .filter(([, v]) => v.ot > MONTHLY_OVERTIME_THRESHOLD)
      .map(([id, v]) => ({
        id,
        name: v.name,
        meta: `${v.ot.toFixed(1)}h (한도 ${MONTHLY_OVERTIME_THRESHOLD}h)`,
      }));

    if (violators.length > 0) {
      items.push({
        id: "labor-52h",
        severity: "danger",
        category: "labor_hours",
        title: `주 52시간 환산 초과 ${violators.length}명`,
        description:
          "근로기준법 제53조 — 연장근로 한도 주 12시간(월 환산 52h) 초과. 시정 조치 필요.",
        detail: `이번 달(${today.getMonth() + 1}월) 누적 연장근로 시간 기준`,
        href: "/attendance",
        count: violators.length,
        affected: violators.slice(0, 5),
      });
    }
  } catch {
    /* fail-soft */
  }

  // ── 2. 최저임금 미달 ─────────────────────────────
  // 2026년 한국 최저시급 (실제 발표 시점에 갱신 필요 — seed 데이터로 관리 권장)
  const MIN_HOURLY_2026 = 10_500;
  const MONTHLY_HOURS = 209;
  const MIN_MONTHLY = MIN_HOURLY_2026 * MONTHLY_HOURS;

  try {
    type EmpRow = {
      id: string;
      name: string;
      employee_no: string | null;
      base_salary: number;
    };

    const { data: emps } = await supabase
      .schema("chongmu")
      .from("employees")
      .select("id, name, employee_no, base_salary")
      .eq("status", "active")
      .is("deleted_at", null)
      .returns<EmpRow[]>();

    const violators = (emps ?? []).filter((e) => e.base_salary < MIN_MONTHLY);
    if (violators.length > 0) {
      items.push({
        id: "min-wage",
        severity: "danger",
        category: "minimum_wage",
        title: `최저임금 미달 ${violators.length}명`,
        description: `2026년 최저시급 ${MIN_HOURLY_2026.toLocaleString()}원 × 209h = 월 ${MIN_MONTHLY.toLocaleString()}원 미만 직원`,
        detail: "기본급 기준. 식대·수당 등 통상임금 가산 시 충족 가능성 별도 검토",
        href: "/employees",
        count: violators.length,
        affected: violators.slice(0, 5).map((e) => ({
          id: e.id,
          name: e.name,
          meta: `기본급 ${e.base_salary.toLocaleString()}원`,
        })),
      });
    }
  } catch {
    /* fail-soft */
  }

  // ── 3. 연차 사용 촉진 (사용률 80% 미만) ─────────────────────────────
  try {
    type BalRow = {
      employee_id: string;
      total_granted: number;
      total_used: number;
      remaining: number;
      employees: { name: string; employee_no: string | null } | null;
    };

    const { data: balances } = await supabase
      .schema("chongmu")
      .from("leave_balances")
      .select(
        `employee_id, total_granted, total_used, remaining,
         employees:employee_id(name, employee_no)`,
      )
      .eq("year", today.getFullYear())
      .returns<BalRow[]>();

    // 연말 가까울수록 위험. 11월 이후만 체크.
    if (today.getMonth() >= 10) {
      const lowUse = (balances ?? []).filter((b) => {
        const granted = Number(b.total_granted) || 0;
        if (granted < 1) return false;
        const usePct = (Number(b.total_used) || 0) / granted;
        return usePct < 0.8 && b.remaining > 1;
      });
      if (lowUse.length > 0) {
        items.push({
          id: "leave-promotion",
          severity: "warn",
          category: "leave",
          title: `연차 촉진 대상 ${lowUse.length}명`,
          description: "사용률 80% 미만 — 사용 촉진 통보 의무 (사업주 부담 면제 절차)",
          detail: "11월 이후 사용률 점검 시점",
          href: "/leave",
          count: lowUse.length,
          affected: lowUse.slice(0, 5).map((b) => ({
            id: b.employee_id,
            name: b.employees?.name ?? "?",
            meta: `잔여 ${Number(b.remaining).toFixed(1)}일 / ${Number(b.total_granted).toFixed(1)}일`,
          })),
        });
      }
    }
  } catch {
    /* fail-soft */
  }

  // ── 4. 거래처 계약 만료 임박 (D-30 이내) ─────────────────────────────
  try {
    const d30 = new Date(today);
    d30.setDate(d30.getDate() + 30);
    const todayStr = today.toISOString().slice(0, 10);
    const d30Str = d30.toISOString().slice(0, 10);

    const { data: vendors } = await supabase
      .schema("chongmu")
      .from("vendors")
      .select("id, name, contract_end")
      .gte("contract_end", todayStr)
      .lte("contract_end", d30Str);

    if ((vendors ?? []).length > 0) {
      items.push({
        id: "contract-expiry",
        severity: "warn",
        category: "contract",
        title: `거래처 계약 만료 임박 ${vendors!.length}건`,
        description: "D-30 이내 만료 예정. 갱신 협의 필요",
        href: "/vendors",
        count: vendors!.length,
        affected: vendors!.slice(0, 5).map((v) => ({
          id: v.id,
          name: v.name,
          meta: `만료 ${v.contract_end}`,
        })),
      });
    }
  } catch {
    /* fail-soft */
  }

  // ── 5. 4대보험·원천세 신고일 (매월 10일) ─────────────────────────────
  const day = today.getDate();
  if (day <= 10) {
    const remaining = 10 - day;
    items.push({
      id: "filing-10th",
      severity: remaining <= 3 ? "danger" : remaining <= 7 ? "warn" : "info",
      category: "filing",
      title:
        remaining === 0
          ? "4대보험·원천세 신고 D-Day"
          : `4대보험·원천세 신고 D-${remaining}`,
      description:
        "매월 10일까지 — 국민연금/건강/고용/산재 + 원천세(소득세·지방소득세)",
      detail: "감사 로그 기준 결산 항목 체크 권장",
      href: "/closing",
    });
  }

  // ── 6. 미확정 급여 (참고용 — 알림과 중복 가능) ─────────────────────────────
  try {
    const { count } = await supabase
      .schema("chongmu")
      .from("payroll")
      .select("id", { count: "exact", head: true })
      .eq("pay_year", today.getFullYear())
      .eq("pay_month", today.getMonth() + 1)
      .eq("status", "draft");

    if (count && count > 0) {
      items.push({
        id: "payroll-draft",
        severity: "info",
        category: "filing",
        title: `미확정 급여 ${count}건`,
        description: `${today.getMonth() + 1}월 급여가 draft 상태 — 확정 처리 필요`,
        href: "/payroll",
        count,
      });
    }
  } catch {
    /* fail-soft */
  }

  return items;
}

/** 위험도 색상 토큰 */
export function severityColor(s: RiskItem["severity"]): string {
  if (s === "danger") return "border-error-soft/40 bg-error-soft/10 text-error-soft";
  if (s === "warn") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return "border-tertiary/40 bg-tertiary/10 text-tertiary";
}
