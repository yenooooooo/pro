"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/**
 * 감사 로그 기록.
 *
 * 민감 행위가 일어날 때마다 호출. 실패해도 본 작업은 막지 않는다(로그가 본 작업의
 * 트랜잭션 일부가 되면 안 된다 — try/catch 후 console.error). production에서는
 * 별도의 모니터링 채널(Sentry 등)로도 발송되도록 확장 예정.
 *
 * RLS상 user_id를 위조할 수 없도록 서버에서 auth.getUser() 결과로 채운다.
 */

export type AuditAction =
  | "payroll.calculated"
  | "payroll.confirmed"
  | "employee.created"
  | "employee.updated"
  | "employee.bank_changed"
  | "employee.resigned"
  | "leave.granted"
  | "leave.requested"
  | "leave.approved"
  | "leave.rejected"
  | "expense.deleted"
  | "vendor.deleted"
  | "asset.disposed"
  | "closing.task_toggled"
  | "settings.rate_updated"
  | "settings.closing_task_added"
  | "settings.closing_task_removed"
  | "report.exported"
  | "ai.ocr"
  | "ai.query"
  | "approval.created"
  | "approval.approved"
  | "approval.rejected"
  | "approval.cancelled"
  | "year_end.saved"
  | "vendor.created"
  | "vendor.updated"
  | "vendor.deleted"
  | "asset.created"
  | "asset.updated"
  | "expense.created"
  | "expense.updated";

export type AuditEntityType =
  | "payroll"
  | "employee"
  | "leave_request"
  | "expense"
  | "vendor"
  | "asset"
  | "closing_history"
  | "insurance_rate"
  | "closing_task"
  | "report"
  | "approval_request"
  | "year_end";

export type AuditMetadata = Record<string, unknown>;

export async function recordAudit(params: {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  metadata?: AuditMetadata;
}): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return; // 비인증 호출은 무시 — RLS가 막아주지만 명시적으로 종료

    const headerList = headers();
    const ipAddress =
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      null;
    const userAgent = headerList.get("user-agent") ?? null;

    const { error } = await supabase
      .schema("chongmu")
      .from("audit_logs")
      .insert({
        user_id: user.id,
        user_email: user.email ?? null,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId ?? null,
        metadata: (params.metadata ?? {}) as Json,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (error) {
      console.error("[audit] insert failed:", error.message, params);
    }
  } catch (err) {
    console.error("[audit] unexpected error:", err);
  }
}
