/**
 * 전체 데이터 JSON 백업 — admin 전용.
 *
 * GET /api/backup/json
 *
 * 모든 도메인 테이블 데이터를 단일 JSON 으로 export.
 * 민감 정보 (password 등) 는 포함 X.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";
import { getCurrentUserRole } from "@/lib/rbac";

const TABLES = [
  "employees",
  "departments",
  "positions",
  "attendance",
  "payroll",
  "leave_balances",
  "leave_requests",
  "expenses",
  "expense_categories",
  "vendors",
  "assets",
  "closing_history",
  "closing_tasks",
  "approval_requests",
  "approval_steps",
  "year_end_settlements",
  "audit_logs",
  "insurance_rates",
  "income_tax_table",
];

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const role = await getCurrentUserRole();
  if (role !== "admin") {
    return NextResponse.json(
      { error: "admin 권한이 필요합니다." },
      { status: 403 },
    );
  }

  const backup: Record<string, unknown[]> = {};
  const meta = {
    generated_at: new Date().toISOString(),
    generated_by: user.email ?? "unknown",
    tables: TABLES.length,
    rows: 0,
  };

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase
        .schema("chongmu")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .select("*");
      if (error) {
        backup[table] = [];
        continue;
      }
      backup[table] = (data as unknown[]) ?? [];
      meta.rows += backup[table].length;
    } catch {
      backup[table] = [];
    }
  }

  await recordAudit({
    action: "report.exported",
    entityType: "report",
    metadata: {
      kind: "json_backup",
      table_count: TABLES.length,
      total_rows: meta.rows,
    },
  });

  const payload = JSON.stringify(
    { meta, data: backup },
    null,
    2,
  );

  const stamp = new Date().toISOString().replace(/[:T.]/g, "-").slice(0, 19);
  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="nexus-erp-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
