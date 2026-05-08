import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini";

/**
 * 재무 분석 통합 모듈.
 * - R5 재무지표 자동 계산
 * - R3 인건비 ROI (부서별)
 * - R4 현금흐름 forecasting (Gemini 기반 추세 분석)
 */

export type FinancialRatios = {
  current_ratio: number | null;       // 유동비율 = 유동자산 / 유동부채
  debt_ratio: number | null;          // 부채비율 = 부채총계 / 자산총계
  operating_margin: number | null;    // 영업이익률 = (매출 - 비용) / 매출
  cash_ratio: number | null;          // 당좌비율 = (유동자산 - 재고) / 유동부채
  // 비교용 raw
  revenue: number;
  total_costs: number;                 // 인건비 + 지출
  net_profit: number;                  // 매출 - 비용
};

export type DepartmentROI = {
  department: string;
  revenue: number;
  payroll: number;
  roi: number | null;                  // (revenue - payroll) / payroll × 100 (%)
  ratio: number | null;                // revenue / payroll
};

export type CashFlowPoint = {
  month: string;                       // YYYY-MM
  inflow: number;                      // 매출 (입금 추정)
  outflow: number;                     // 인건비 + 지출
  net: number;
  is_forecast: boolean;
};

export async function calculateFinancialRatios(
  year: number,
  month: number,
): Promise<FinancialRatios> {
  const supabase = createClient();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  // ★ 4쿼리 병렬화 — 직렬 4 round-trip → 1
  const [
    { data: revenue },
    { data: payroll },
    { data: expenses },
    { data: facts },
  ] = await Promise.all([
    supabase
      .schema("chongmu")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("revenue" as any)
      .select("amount")
      .eq("year", year)
      .eq("month", month),
    supabase
      .schema("chongmu")
      .from("payroll")
      .select("gross_pay")
      .eq("pay_year", year)
      .eq("pay_month", month),
    supabase
      .schema("chongmu")
      .from("expenses")
      .select("amount, vat")
      .gte("expense_date", monthStart)
      .lte("expense_date", monthEnd),
    supabase
      .schema("chongmu")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("financial_facts" as any)
      .select("*")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle(),
  ]);

  const totalRevenue = ((revenue as unknown as { amount: number }[] | null) ?? []).reduce(
    (s, r) => s + r.amount,
    0,
  );
  const totalPayroll = (payroll ?? []).reduce(
    (s, r) => s + (r.gross_pay || 0),
    0,
  );
  const totalExpenses = (expenses ?? []).reduce(
    (s, r) => s + (r.amount || 0) + (r.vat || 0),
    0,
  );

  const totalCosts = totalPayroll + totalExpenses;
  const netProfit = totalRevenue - totalCosts;

  type Facts = {
    current_assets: number | null;
    total_assets: number | null;
    current_liabilities: number | null;
    total_liabilities: number | null;
    inventory: number | null;
  };
  const f = facts as unknown as Facts | null;

  return {
    current_ratio:
      f?.current_assets && f?.current_liabilities && f.current_liabilities > 0
        ? (f.current_assets / f.current_liabilities) * 100
        : null,
    debt_ratio:
      f?.total_liabilities && f?.total_assets && f.total_assets > 0
        ? (f.total_liabilities / f.total_assets) * 100
        : null,
    cash_ratio:
      f?.current_assets && f?.current_liabilities && f.current_liabilities > 0
        ? ((f.current_assets - (f.inventory ?? 0)) / f.current_liabilities) * 100
        : null,
    operating_margin:
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : null,
    revenue: totalRevenue,
    total_costs: totalCosts,
    net_profit: netProfit,
  };
}

export async function calculateDepartmentROI(
  year: number,
  month: number,
): Promise<DepartmentROI[]> {
  const supabase = createClient();

  // ★ 2쿼리 병렬화
  const [{ data: revRows }, { data: payRows }] = await Promise.all([
    supabase
      .schema("chongmu")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("revenue" as any)
      .select("amount, departments:department_id(name)")
      .eq("year", year)
      .eq("month", month),
    supabase
      .schema("chongmu")
      .from("payroll")
      .select(
        "gross_pay, employees:employee_id(departments:department_id(name))",
      )
      .eq("pay_year", year)
      .eq("pay_month", month),
  ]);

  type RevRow = { amount: number; departments: { name: string } | null };
  const revByDept = new Map<string, number>();
  for (const r of ((revRows as unknown as RevRow[]) ?? [])) {
    const dept = r.departments?.name ?? "(미배정)";
    revByDept.set(dept, (revByDept.get(dept) ?? 0) + r.amount);
  }

  type PayRow = {
    gross_pay: number;
    employees: { departments: { name: string } | null } | null;
  };
  const payByDept = new Map<string, number>();
  for (const r of ((payRows as unknown as PayRow[]) ?? [])) {
    const dept = r.employees?.departments?.name ?? "(미배정)";
    payByDept.set(dept, (payByDept.get(dept) ?? 0) + (r.gross_pay || 0));
  }

  // 모든 부서 합치기
  const deptNames = new Set([...revByDept.keys(), ...payByDept.keys()]);
  const result: DepartmentROI[] = [];
  for (const dept of deptNames) {
    const revenue = revByDept.get(dept) ?? 0;
    const payroll = payByDept.get(dept) ?? 0;
    const roi = payroll > 0 ? ((revenue - payroll) / payroll) * 100 : null;
    const ratio = payroll > 0 ? revenue / payroll : null;
    result.push({ department: dept, revenue, payroll, roi, ratio });
  }
  result.sort((a, b) => b.revenue - a.revenue);
  return result;
}

export async function getCashFlowHistory(
  monthsBack = 12,
): Promise<CashFlowPoint[]> {
  const supabase = createClient();
  const today = new Date();

  // ★ 12개월 × 3쿼리 = 36쿼리를 모두 병렬화 — 직렬 12 round-trip → 1
  const monthMeta = Array.from({ length: monthsBack }, (_, idx) => {
    const i = monthsBack - 1 - idx;
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const monthStart = `${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${monthStr}-${String(lastDay).padStart(2, "0")}`;
    return { year, month, monthStr, monthStart, monthEnd };
  });

  const results = await Promise.all(
    monthMeta.map(async (m) => {
      const [{ data: rev }, { data: pay }, { data: exp }] = await Promise.all([
        supabase
          .schema("chongmu")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from("revenue" as any)
          .select("amount")
          .eq("year", m.year)
          .eq("month", m.month),
        supabase
          .schema("chongmu")
          .from("payroll")
          .select("gross_pay")
          .eq("pay_year", m.year)
          .eq("pay_month", m.month),
        supabase
          .schema("chongmu")
          .from("expenses")
          .select("amount, vat")
          .gte("expense_date", m.monthStart)
          .lte("expense_date", m.monthEnd),
      ]);

      const inflow = ((rev as unknown as { amount: number }[] | null) ?? []).reduce(
        (s, r) => s + r.amount,
        0,
      );
      const outflow =
        (pay ?? []).reduce((s, r) => s + (r.gross_pay || 0), 0) +
        (exp ?? []).reduce((s, r) => s + (r.amount || 0) + (r.vat || 0), 0);

      return {
        month: m.monthStr,
        inflow,
        outflow,
        net: inflow - outflow,
        is_forecast: false as const,
      };
    }),
  );

  return results;
}

/**
 * 다음 N개월 현금흐름 추정 — Gemini 가 패턴 분석 + 추세 예측.
 * Gemini 키 없으면 단순 이동평균.
 */
export async function forecastCashFlow(
  history: CashFlowPoint[],
  monthsForward = 3,
): Promise<CashFlowPoint[]> {
  if (history.length < 6) return [];

  const client = getGeminiClient();

  // Gemini 시도
  if (client) {
    try {
      const result = await client.models.generateContent({
        model: GEMINI_MODELS.flash,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `한국 중소기업의 최근 ${history.length}개월 현금흐름 데이터입니다.
계절성과 추세를 분석해 다음 ${monthsForward}개월의 inflow(매출 입금), outflow(비용 지출) 를 예측하세요.

JSON 만 출력:
[
  { "month": "YYYY-MM", "inflow": number, "outflow": number },
  ...
]

데이터 (단위: 원):
${JSON.stringify(history, null, 2)}

규칙:
- ${monthsForward}개 행 정확히
- month 는 history 마지막 다음 달부터 순서대로
- 12월 보너스 (인건비 +50%), 5월 워크샵, 3월 결산 같은 한국 SMB 패턴 반영
- 정수 (소수 X)`,
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
        const arr = JSON.parse(result.text) as Array<{
          month: string;
          inflow: number;
          outflow: number;
        }>;
        return arr.slice(0, monthsForward).map((p) => ({
          month: p.month,
          inflow: Math.round(p.inflow),
          outflow: Math.round(p.outflow),
          net: Math.round(p.inflow - p.outflow),
          is_forecast: true,
        }));
      }
    } catch {
      /* fallback */
    }
  }

  // Fallback: 최근 6개월 이동평균
  const recent = history.slice(-6);
  const avgIn = Math.round(recent.reduce((s, p) => s + p.inflow, 0) / recent.length);
  const avgOut = Math.round(
    recent.reduce((s, p) => s + p.outflow, 0) / recent.length,
  );

  const lastMonth = history[history.length - 1].month;
  const [yStr, mStr] = lastMonth.split("-");
  let y = Number(yStr);
  let m = Number(mStr);

  const points: CashFlowPoint[] = [];
  for (let i = 0; i < monthsForward; i++) {
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    points.push({
      month: `${y}-${String(m).padStart(2, "0")}`,
      inflow: avgIn,
      outflow: avgOut,
      net: avgIn - avgOut,
      is_forecast: true,
    });
  }
  return points;
}
