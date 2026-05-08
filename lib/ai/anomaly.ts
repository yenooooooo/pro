import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini";

/**
 * 이상치 자동 탐지 + AI 자연어 인사이트.
 *
 * 데이터 패턴을 휴리스틱으로 1차 추출 → Gemini 가 자연어 해석 추가.
 * Gemini 키 없으면 휴리스틱만 (자연어 코멘트 없이 raw 알림).
 */

export type Insight = {
  id: string;
  severity: "info" | "warn" | "danger";
  category: "expense_spike" | "payroll_jump" | "overtime_surge" | "unusual_pattern";
  title: string;
  body: string;
  detail?: string;
  /** 영향 범위 (부서, 직원 수 등) */
  context?: Record<string, unknown>;
};

const SPIKE_RATIO = 2.5; // 평균의 2.5배 이상이면 spike
const PAYROLL_JUMP_RATIO = 0.2; // 전월 대비 20% 이상 급증

export async function detectAnomalies(today = new Date()): Promise<Insight[]> {
  const supabase = createClient();
  const items: Insight[] = [];

  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // ── 1. 카테고리별 지출 spike ────────────────────────────
  try {
    type ExpenseRow = {
      expense_date: string;
      amount: number;
      vat: number;
      expense_categories: { name: string } | null;
    };

    // 최근 7개월 (이번 달 + 6개월)
    const since = new Date(year, month - 7, 1).toISOString().slice(0, 10);
    const { data: rows } = await supabase
      .schema("chongmu")
      .from("expenses")
      .select(
        `expense_date, amount, vat,
         expense_categories:category_id(name)`,
      )
      .gte("expense_date", since)
      .returns<ExpenseRow[]>();

    // 카테고리 × 월별 합계
    const map = new Map<string, Map<string, number>>(); // cat → (yyyy-mm → sum)
    for (const r of rows ?? []) {
      const cat = r.expense_categories?.name ?? "(미분류)";
      const ym = r.expense_date.slice(0, 7);
      const inner = map.get(cat) ?? new Map();
      inner.set(ym, (inner.get(ym) ?? 0) + (r.amount || 0) + (r.vat || 0));
      map.set(cat, inner);
    }

    const currentYm = `${year}-${String(month).padStart(2, "0")}`;

    for (const [cat, perMonth] of map) {
      const cur = perMonth.get(currentYm) ?? 0;
      if (cur === 0) continue;
      // 이전 6개월 평균
      const prev: number[] = [];
      for (const [ym, sum] of perMonth) {
        if (ym !== currentYm) prev.push(sum);
      }
      if (prev.length < 2) continue;
      const avg = prev.reduce((a, b) => a + b, 0) / prev.length;
      if (avg === 0) continue;
      const ratio = cur / avg;
      if (ratio >= SPIKE_RATIO) {
        items.push({
          id: `expense-spike-${cat}`,
          severity: ratio >= 5 ? "danger" : "warn",
          category: "expense_spike",
          title: `${cat} 지출 급증`,
          body: `이번 달 ${formatKRW(cur)} — 평소 평균 ${formatKRW(Math.round(avg))} 의 ${ratio.toFixed(1)}배`,
          context: { category: cat, current: cur, average: Math.round(avg), ratio },
        });
      }
    }
  } catch {
    /* fail-soft */
  }

  // ── 2. 부서별 인건비 급증 (전월 대비) ─────────────────────
  try {
    type PayrollDeptRow = {
      pay_year: number;
      pay_month: number;
      gross_pay: number;
      employees: { departments: { name: string } | null } | null;
    };

    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;

    const { data: rows } = await supabase
      .schema("chongmu")
      .from("payroll")
      .select(
        `pay_year, pay_month, gross_pay,
         employees:employee_id(departments:department_id(name))`,
      )
      .or(
        `and(pay_year.eq.${year},pay_month.eq.${month}),and(pay_year.eq.${prevYear},pay_month.eq.${prevMonth})`,
      )
      .returns<PayrollDeptRow[]>();

    const cur = new Map<string, number>();
    const prev = new Map<string, number>();
    for (const r of rows ?? []) {
      const dept = r.employees?.departments?.name ?? "(미배정)";
      const target = r.pay_year === year && r.pay_month === month ? cur : prev;
      target.set(dept, (target.get(dept) ?? 0) + (r.gross_pay || 0));
    }

    for (const [dept, c] of cur) {
      const p = prev.get(dept) ?? 0;
      if (p === 0) continue;
      const delta = (c - p) / p;
      if (delta >= PAYROLL_JUMP_RATIO) {
        items.push({
          id: `payroll-jump-${dept}`,
          severity: delta >= 0.5 ? "warn" : "info",
          category: "payroll_jump",
          title: `${dept} 인건비 ${(delta * 100).toFixed(0)}% 증가`,
          body: `전월 ${formatKRW(p)} → 이번 달 ${formatKRW(c)}. 신규 채용 또는 보너스 지급 가능성.`,
          context: { department: dept, current: c, previous: p, delta_pct: delta * 100 },
        });
      }
    }
  } catch {
    /* fail-soft */
  }

  // ── 3. 연장근로 급증 (이번 달 직원별 OT 평균 대비 2배) ──────
  try {
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

    type AttRow = {
      employee_id: string;
      overtime_hours: number;
      employees: { name: string } | null;
    };

    const { data: rows } = await supabase
      .schema("chongmu")
      .from("attendance")
      .select(
        `employee_id, overtime_hours,
         employees:employee_id(name)`,
      )
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd)
      .returns<AttRow[]>();

    const sumByEmp = new Map<string, { name: string; ot: number }>();
    for (const r of rows ?? []) {
      const cur = sumByEmp.get(r.employee_id) ?? {
        name: r.employees?.name ?? "?",
        ot: 0,
      };
      cur.ot += Number(r.overtime_hours) || 0;
      sumByEmp.set(r.employee_id, cur);
    }
    const values = Array.from(sumByEmp.values()).map((v) => v.ot);
    if (values.length >= 5) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const outliers = Array.from(sumByEmp.entries())
        .filter(([, v]) => v.ot > avg * 2 && v.ot >= 30)
        .sort((a, b) => b[1].ot - a[1].ot)
        .slice(0, 3);

      if (outliers.length > 0) {
        items.push({
          id: `overtime-surge`,
          severity: outliers.some(([, v]) => v.ot > 52) ? "danger" : "warn",
          category: "overtime_surge",
          title: `연장근로 집중 ${outliers.length}명`,
          body: outliers
            .map(([, v]) => `${v.name} ${v.ot.toFixed(0)}h`)
            .join(" · "),
          detail: `동료 평균 ${avg.toFixed(0)}h 대비 2배 이상`,
          context: { outliers: outliers.map(([id, v]) => ({ id, ...v })) },
        });
      }
    }
  } catch {
    /* fail-soft */
  }

  // ── 4. Gemini 로 자연어 해석 추가 (선택) ────────────────────
  if (items.length > 0) {
    const client = getGeminiClient();
    if (client) {
      try {
        const result = await client.models.generateContent({
          model: GEMINI_MODELS.flash,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `다음은 한국 중소기업 ERP 시스템이 자동 탐지한 이상치들입니다. 각 항목에 대해 1~2 문장 한국어 인사이트(원인 추정 또는 권장 조치)를 추가하세요. JSON 배열로만 답하세요.

입력:
${JSON.stringify(
  items.map((i) => ({
    id: i.id,
    title: i.title,
    body: i.body,
    context: i.context,
  })),
  null,
  2,
)}

출력 (JSON):
[{"id": "...", "comment": "한국어 인사이트"}, ...]`,
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        });
        if (result.text) {
          const comments = JSON.parse(result.text) as Array<{ id: string; comment: string }>;
          const map = new Map(comments.map((c) => [c.id, c.comment]));
          for (const item of items) {
            const c = map.get(item.id);
            if (c) item.body = `${item.body}\n\n💡 ${c}`;
          }
        }
      } catch {
        /* AI 실패해도 휴리스틱은 그대로 */
      }
    }
  }

  return items;
}

function formatKRW(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}
