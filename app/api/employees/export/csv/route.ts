/**
 * 직원 명부 CSV — Google Sheets IMPORTDATA() 호환.
 *
 * GET /api/employees/export/csv
 *
 * 서명된 토큰으로 외부 sync 가능 (선택). 현재는 인증된 사용자만.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EmpRow = {
  employee_no: string | null;
  name: string;
  status: string;
  hire_date: string | null;
  base_salary: number | null;
  email: string | null;
  phone: string | null;
  departments: { name: string } | null;
  positions: { name: string } | null;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { data: rows } = await supabase
    .schema("chongmu")
    .from("employees")
    .select(
      `employee_no, name, status, hire_date, base_salary, email, phone,
       departments:department_id(name), positions:position_id(name)`,
    )
    .is("deleted_at", null)
    .order("employee_no")
    .returns<EmpRow[]>();

  const headers = [
    "사번",
    "이름",
    "부서",
    "직급",
    "상태",
    "입사일",
    "기본급",
    "이메일",
    "전화",
  ];

  const lines = [headers.join(",")];
  for (const r of rows ?? []) {
    lines.push(
      [
        csv(r.employee_no ?? ""),
        csv(r.name),
        csv(r.departments?.name ?? ""),
        csv(r.positions?.name ?? ""),
        csv(r.status),
        csv(r.hire_date ?? ""),
        String(r.base_salary ?? 0),
        csv(r.email ?? ""),
        csv(r.phone ?? ""),
      ].join(","),
    );
  }

  // BOM (Excel/Sheets 한글 호환)
  const body = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

function csv(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
