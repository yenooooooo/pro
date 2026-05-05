import "server-only";
import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: string;
  type: "closing" | "payroll" | "asset" | "info";
  title: string;
  description: string;
  href: string;
  severity: "info" | "warn" | "danger";
};

/**
 * 대시보드 상단 종 아이콘에 표시할 알림 목록을 집계.
 * - closing: 이번 달 결산 미완료 항목 수
 * - payroll: 이번 달 미확정(draft) 급여 건수
 * - asset:   내용연수 만료 6개월 이내 자산 (CLAUDE.md §6.7)
 */
export async function getNotifications(): Promise<NotificationItem[]> {
  const supabase = createClient();
  const items: NotificationItem[] = [];

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // 1) 이번 달 결산 미완료
  try {
    const { data: pendingTasks } = await supabase
      .schema("chongmu")
      .from("closing_history")
      .select("task_id, is_done")
      .eq("year", year)
      .eq("month", month)
      .eq("is_done", false);

    const pendingCount = pendingTasks?.length ?? 0;
    if (pendingCount > 0) {
      items.push({
        id: `closing-${year}-${month}`,
        type: "closing",
        title: `${month}월 결산 ${pendingCount}건 대기`,
        description: "월말 결산 체크리스트에서 미완료 항목을 확인하세요.",
        href: `/closing?year=${year}&month=${month}`,
        severity: pendingCount >= 3 ? "warn" : "info",
      });
    }
  } catch {
    /* fail-soft */
  }

  // 2) 이번 달 미확정 급여
  try {
    const { count } = await supabase
      .schema("chongmu")
      .from("payroll")
      .select("id", { count: "exact", head: true })
      .eq("pay_year", year)
      .eq("pay_month", month)
      .eq("status", "draft");

    if (count && count > 0) {
      items.push({
        id: `payroll-draft-${year}-${month}`,
        type: "payroll",
        title: `미확정 급여 ${count}건`,
        description: `${month}월 급여가 draft 상태입니다. 검토 후 확정하세요.`,
        href: `/payroll?year=${year}&month=${month}`,
        severity: "warn",
      });
    }
  } catch {
    /* fail-soft */
  }

  // 3) 내용연수 만료 6개월 이내 자산
  try {
    const { data: assets } = await supabase
      .schema("chongmu")
      .from("assets")
      .select("id, name, asset_no, acquisition_date, useful_life, status")
      .eq("status", "in_use")
      .not("acquisition_date", "is", null)
      .not("useful_life", "is", null);

    const today = now;
    const sixMonthsLater = new Date(today);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const expiringSoon = (assets ?? []).filter((a) => {
      if (!a.acquisition_date || !a.useful_life) return false;
      const acq = new Date(a.acquisition_date);
      const expiry = new Date(acq);
      expiry.setFullYear(expiry.getFullYear() + a.useful_life);
      return expiry >= today && expiry <= sixMonthsLater;
    });

    if (expiringSoon.length > 0) {
      items.push({
        id: `asset-expiry`,
        type: "asset",
        title: `자산 내용연수 만료 임박 ${expiringSoon.length}건`,
        description: `6개월 이내 만료 예정. ${expiringSoon
          .slice(0, 2)
          .map((a) => a.name)
          .join(", ")}${expiringSoon.length > 2 ? " 외" : ""}`,
        href: "/assets",
        severity: "info",
      });
    }
  } catch {
    /* fail-soft */
  }

  return items;
}
