import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * 직원별 이직 위험도 예측 — 휴리스틱 점수.
 *
 * 0~100 점수. ML 모델 없이 노동연구원 통계 기반 가중치.
 * 진단 도구일 뿐 — 실제 이직 결정은 다양한 요인 영향.
 */

export type TurnoverRisk = {
  score: number; // 0~100
  level: "low" | "medium" | "high";
  factors: Array<{ name: string; score: number; description: string }>;
};

export async function calculateTurnoverRisk(
  employeeId: string,
): Promise<TurnoverRisk | null> {
  const supabase = createClient();

  // 1. 기본 정보
  const { data: emp } = await supabase
    .schema("chongmu")
    .from("employees")
    .select("id, hire_date, base_salary, department_id, position_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (!emp) return null;

  const factors: TurnoverRisk["factors"] = [];

  // ── 요인 1: 근속 연수 (2~3년차 가장 위험) ───────────────
  const hireDate = new Date(emp.hire_date);
  const tenureYears = (Date.now() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  let tenureScore = 0;
  if (tenureYears >= 1.5 && tenureYears <= 3.5) tenureScore = 20;
  else if (tenureYears >= 1 && tenureYears < 1.5) tenureScore = 12;
  else if (tenureYears > 3.5 && tenureYears <= 5) tenureScore = 10;
  else if (tenureYears < 1) tenureScore = 5; // 신규는 위험 낮음
  else tenureScore = 8; // 5년+
  factors.push({
    name: "근속 연수",
    score: tenureScore,
    description: `${tenureYears.toFixed(1)}년차 ${
      tenureYears >= 1.5 && tenureYears <= 3.5
        ? "(이직률 가장 높은 구간)"
        : tenureYears < 1
          ? "(신규)"
          : "(안정 구간)"
    }`,
  });

  // ── 요인 2: 최근 3개월 연장근로 시간 (>40h/월 → 위험) ───
  const today = new Date();
  const since = new Date(today);
  since.setMonth(since.getMonth() - 3);

  const { data: attRows } = await supabase
    .schema("chongmu")
    .from("attendance")
    .select("overtime_hours, night_hours")
    .eq("employee_id", employeeId)
    .gte("work_date", since.toISOString().slice(0, 10));

  const totalOt = (attRows ?? []).reduce(
    (s, r) => s + (Number(r.overtime_hours) || 0),
    0,
  );
  const totalNight = (attRows ?? []).reduce(
    (s, r) => s + (Number(r.night_hours) || 0),
    0,
  );
  const monthlyOt = totalOt / 3;
  let otScore = 0;
  if (monthlyOt > 60) otScore = 25;
  else if (monthlyOt > 40) otScore = 18;
  else if (monthlyOt > 25) otScore = 10;
  else otScore = 3;
  factors.push({
    name: "연장근로 강도",
    score: otScore,
    description: `최근 3개월 평균 ${monthlyOt.toFixed(0)}h/월 ${
      monthlyOt > 40 ? "(주 52h 환산 한도 근접)" : ""
    }`,
  });

  // ── 요인 3: 야간근로 빈도 ───────────────
  const monthlyNight = totalNight / 3;
  let nightScore = 0;
  if (monthlyNight > 10) nightScore = 12;
  else if (monthlyNight > 5) nightScore = 7;
  else if (monthlyNight > 0) nightScore = 3;
  factors.push({
    name: "야간근로 빈도",
    score: nightScore,
    description: `최근 3개월 평균 ${monthlyNight.toFixed(1)}h/월`,
  });

  // ── 요인 4: 연차 사용률 (낮으면 burnout 위험) ───────────
  const { data: balance } = await supabase
    .schema("chongmu")
    .from("leave_balances")
    .select("total_granted, total_used")
    .eq("employee_id", employeeId)
    .eq("year", today.getFullYear())
    .maybeSingle();

  let leaveScore = 0;
  let leaveDesc = "연차 데이터 없음";
  if (balance) {
    const granted = Number(balance.total_granted) || 0;
    const used = Number(balance.total_used) || 0;
    const useRate = granted > 0 ? used / granted : 0;
    if (today.getMonth() >= 6) {
      // 7월 이후 사용률 평가 (상반기 거의 안 썼으면 위험 신호)
      if (useRate < 0.2) leaveScore = 18;
      else if (useRate < 0.4) leaveScore = 10;
      else if (useRate < 0.6) leaveScore = 5;
      else leaveScore = 2;
    } else {
      leaveScore = useRate < 0.1 ? 5 : 2;
    }
    leaveDesc = `${used}/${granted}일 사용 (${(useRate * 100).toFixed(0)}%)`;
  }
  factors.push({
    name: "연차 사용률",
    score: leaveScore,
    description: leaveDesc,
  });

  // ── 요인 5: 동일 직급 임금 비교 ───────────────
  const { data: peers } = await supabase
    .schema("chongmu")
    .from("employees")
    .select("base_salary")
    .eq("status", "active")
    .eq("position_id", emp.position_id ?? "")
    .is("deleted_at", null);

  const peerSalaries = (peers ?? [])
    .map((e) => e.base_salary)
    .filter((s): s is number => typeof s === "number");

  let payScore = 0;
  let payDesc = "동일 직급 비교 데이터 부족";
  if (peerSalaries.length >= 3) {
    const avg = peerSalaries.reduce((a, b) => a + b, 0) / peerSalaries.length;
    const diff = (emp.base_salary - avg) / avg;
    if (diff < -0.15) payScore = 20;
    else if (diff < -0.05) payScore = 12;
    else if (diff < 0.05) payScore = 5;
    else payScore = 2;
    payDesc = `동일 직급 평균 대비 ${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(1)}%`;
  }
  factors.push({
    name: "동일 직급 임금",
    score: payScore,
    description: payDesc,
  });

  // 합계
  const score = Math.min(
    100,
    factors.reduce((s, f) => s + f.score, 0),
  );
  const level: TurnoverRisk["level"] =
    score >= 60 ? "high" : score >= 35 ? "medium" : "low";

  return { score, level, factors };
}
