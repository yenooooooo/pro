/**
 * Notion 데이터베이스로 직원 명부 단방향 sync.
 *
 * POST /api/integrations/notion/sync-employees
 *
 * 환경변수:
 *   NOTION_TOKEN: Internal Integration Token (https://www.notion.so/my-integrations)
 *   NOTION_EMPLOYEES_DB_ID: 직원 데이터베이스 ID (URL 의 32자 hex)
 *
 * Notion DB 의 표준 속성:
 *   - 이름 (Title)
 *   - 사번 (Text)
 *   - 부서 (Select)
 *   - 직급 (Select)
 *   - 상태 (Select: 재직/휴직/퇴사)
 *   - 입사일 (Date)
 *   - 이메일 (Email)
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

type EmpRow = {
  id: string;
  employee_no: string | null;
  name: string;
  status: string;
  hire_date: string | null;
  email: string | null;
  departments: { name: string } | null;
  positions: { name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  active: "재직",
  leave: "휴직",
  resigned: "퇴사",
};

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "인증 필요" },
      { status: 401 },
    );
  }

  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_EMPLOYEES_DB_ID;
  if (!token || !dbId) {
    return NextResponse.json(
      {
        ok: false,
        error: "NOTION_TOKEN / NOTION_EMPLOYEES_DB_ID 미설정. /settings/integrations 에서 설정 가이드 확인.",
      },
      { status: 200 },
    );
  }

  const { data: rows } = await supabase
    .schema("chongmu")
    .from("employees")
    .select(
      `id, employee_no, name, status, hire_date, email,
       departments:department_id(name), positions:position_id(name)`,
    )
    .is("deleted_at", null)
    .returns<EmpRow[]>();

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const emp of rows) {
    try {
      // 단순 INSERT — 기존 행과 중복 가능성 있지만 사용자가 수동 정리.
      // 실제 운영에선 사번으로 검색 후 update 권장 (Notion query API 활용).
      const properties: Record<string, unknown> = {
        이름: {
          title: [{ text: { content: emp.name } }],
        },
        사번: {
          rich_text: [{ text: { content: emp.employee_no ?? "" } }],
        },
        부서: emp.departments?.name
          ? { select: { name: emp.departments.name } }
          : { select: null },
        직급: emp.positions?.name
          ? { select: { name: emp.positions.name } }
          : { select: null },
        상태: {
          select: { name: STATUS_LABEL[emp.status] ?? emp.status },
        },
      };

      if (emp.hire_date) {
        properties.입사일 = { date: { start: emp.hire_date } };
      }
      if (emp.email) {
        properties.이메일 = { email: emp.email };
      }

      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { database_id: dbId },
          properties,
        }),
      });

      if (res.ok) {
        synced++;
      } else {
        failed++;
        const body = await res.text();
        errors.push(`${emp.name}: ${body.slice(0, 100)}`);
      }
    } catch (err) {
      failed++;
      errors.push(
        `${emp.name}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  await recordAudit({
    action: "report.exported",
    entityType: "report",
    metadata: {
      kind: "notion_sync_employees",
      synced,
      failed,
      total: rows.length,
    },
  });

  return NextResponse.json({
    ok: true,
    synced,
    failed,
    total: rows.length,
    errors: errors.slice(0, 5),
  });
}
