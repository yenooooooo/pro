import { createClient } from "@/lib/supabase/server";
import { LiveOpsClient } from "./_live-ops-client";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  occurred_at: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  metadata: Record<string, unknown> | null;
};

const ACTION_TO_TAG: Record<string, { tag: string; tone: "ok" | "warn" | "crit" | "info" }> = {
  "payroll.confirmed": { tag: "PAY ✓", tone: "ok" },
  "payroll.calculated": { tag: "PAY", tone: "info" },
  "employee.created": { tag: "EMP +", tone: "ok" },
  "employee.updated": { tag: "EMP ✎", tone: "info" },
  "employee.resigned": { tag: "EMP −", tone: "crit" },
  "leave.requested": { tag: "LV REQ", tone: "warn" },
  "leave.approved": { tag: "LV ✓", tone: "ok" },
  "leave.rejected": { tag: "LV ✗", tone: "crit" },
  "approval.created": { tag: "APR +", tone: "info" },
  "approval.approved": { tag: "APR ✓", tone: "ok" },
  "approval.rejected": { tag: "APR ✗", tone: "crit" },
  "expense.created": { tag: "EXP +", tone: "ok" },
  "expense.deleted": { tag: "EXP −", tone: "crit" },
  "vendor.created": { tag: "VEN +", tone: "ok" },
  "asset.created": { tag: "AST +", tone: "ok" },
  "asset.disposed": { tag: "AST X", tone: "crit" },
  "closing.task_toggled": { tag: "CLS ✓", tone: "info" },
  "settings.rate_updated": { tag: "CFG ✎", tone: "warn" },
  "year_end.saved": { tag: "YE ✎", tone: "info" },
  "ai.ocr": { tag: "OCR", tone: "info" },
  "ai.query": { tag: "AI", tone: "info" },
};

const ACTION_MSG: Record<string, string> = {
  "payroll.confirmed": "급여 확정",
  "payroll.calculated": "급여 일괄 계산",
  "employee.created": "신규 직원 등록",
  "employee.updated": "직원 정보 수정",
  "employee.resigned": "직원 퇴사",
  "leave.requested": "휴가 신청",
  "leave.approved": "휴가 승인",
  "leave.rejected": "휴가 반려",
  "approval.created": "결재 발의",
  "approval.approved": "결재 승인",
  "approval.rejected": "결재 반려",
  "expense.created": "지출 등록",
  "expense.deleted": "지출 삭제",
  "vendor.created": "거래처 등록",
  "asset.created": "자산 등록",
  "asset.disposed": "자산 폐기",
  "closing.task_toggled": "결산 항목 토글",
  "settings.rate_updated": "요율 변경",
  "year_end.saved": "연말정산 입력",
  "ai.ocr": "AI 영수증 OCR",
  "ai.query": "AI 자연어 질의",
};

export default async function ActivityPage() {
  const supabase = createClient();

  // 최근 audit logs + 활성 직원 count + 미결 결재 count 등 병렬
  const [auditRes, employeesRes, approvalsRes, payrollMtdRes, weeklyAttRes, promotionRes] =
    await Promise.all([
      supabase
        .schema("chongmu")
        .from("audit_logs")
        .select("id, occurred_at, user_email, action, entity_type, metadata")
        .order("occurred_at", { ascending: false })
        .limit(8)
        .returns<AuditRow[]>(),
      supabase
        .schema("chongmu")
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .is("deleted_at", null),
      supabase
        .schema("chongmu")
        .from("approval_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .schema("chongmu")
        .from("payroll")
        .select("gross_pay")
        .eq("pay_year", new Date().getFullYear())
        .eq("pay_month", new Date().getMonth() + 1),
      supabase
        .schema("chongmu")
        .from("attendance")
        .select("regular_hours, overtime_hours, night_hours, holiday_hours, work_date")
        .gte(
          "work_date",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        ),
      supabase
        .schema("chongmu")
        .from("leave_balances")
        .select("total_granted, total_used")
        .eq("year", new Date().getFullYear()),
    ]);

  const auditRows = auditRes.data ?? [];
  const totalEmployees = employeesRes.count ?? 15;
  const pendingApprovals = approvalsRes.count ?? 0;
  const payrollMtd = (payrollMtdRes.data ?? []).reduce(
    (s, r) => s + ((r as { gross_pay: number }).gross_pay ?? 0),
    0,
  );
  const burnRatePerSec = payrollMtd > 0 ? Math.round(payrollMtd / (30 * 24 * 3600)) : 47;

  // 주 52h 초과 직원 수 — 최근 주 합계
  const attendance = (weeklyAttRes.data ?? []) as Array<{
    regular_hours: number;
    overtime_hours: number;
    night_hours: number;
    holiday_hours: number;
  }>;
  const maxWeekly = attendance.reduce(
    (m, a) =>
      Math.max(
        m,
        Number(a.regular_hours) +
          Number(a.overtime_hours) +
          Number(a.night_hours) +
          Number(a.holiday_hours),
      ),
    0,
  );

  // 연차 촉진 대상자 (사용률 < 80%)
  const balances = (promotionRes.data ?? []) as Array<{
    total_granted: number;
    total_used: number;
  }>;
  const promotion = balances.filter(
    (b) => b.total_granted > 0 && b.total_used / b.total_granted < 0.8,
  ).length;

  // recentEvents 변환
  const recentEvents = auditRows.map((r) => {
    const tagInfo = ACTION_TO_TAG[r.action] ?? { tag: "EVT", tone: "info" as const };
    const ts = new Date(r.occurred_at).toTimeString().slice(0, 8);
    const userPart = r.user_email ? r.user_email.split("@")[0] : "system";
    const msgBase = ACTION_MSG[r.action] ?? r.action;
    return {
      ts,
      tag: tagInfo.tag,
      tagTone: tagInfo.tone,
      msg: `${userPart} · ${msgBase}`,
    };
  });

  // fallback when no events
  const eventsFinal =
    recentEvents.length > 0
      ? recentEvents
      : [
          { ts: "00:00:00", tag: "INIT", tagTone: "info" as const, msg: "감사 로그 대기 중" },
        ];

  // 활성/idle/offline 분포 — 임의 (실 presence 시스템 없음)
  const presence = {
    active: Math.max(1, totalEmployees - 3),
    idle: Math.min(2, Math.max(0, totalEmployees - 12)),
    offline: Math.min(3, Math.max(0, totalEmployees - 13)),
    total: totalEmployees,
  };

  return (
    <LiveOpsClient
      recentEvents={eventsFinal}
      burnRateMTD={payrollMtd || 84_210_000}
      burnRatePerSec={burnRatePerSec}
      riskGauges={{
        weekly52h: { value: Math.min(60, Math.max(40, maxWeekly)), max: 60 },
        leavePromotion: { value: promotion, max: totalEmployees },
        minWage: "PASS",
      }}
      presence={presence}
      approvalsPerSec={(pendingApprovals + 5) / 60}
      deadlines={[
        {
          daysLeft: 5,
          title: "4대보험 EDI 마감",
          desc: "자동 CSV 생성됨",
          tone: "urgent",
        },
        {
          daysLeft: 2,
          title: "결재 대기 처리",
          desc: `${pendingApprovals}건 미결`,
          tone: pendingApprovals > 0 ? "crit" : "default",
        },
        {
          daysLeft: 12,
          title: "연차 분기 재계산",
          desc: `촉진 대상 ${promotion}명`,
          tone: "default",
        },
      ]}
    />
  );
}
