/**
 * 4대보험 EDI 신고용 CSV 양식 생성.
 *
 * GET /api/filing/insurance-edi?year=2026&month=4
 *
 * 표준 양식 (국민건강보험공단 EDI 입력용 — 사업장별 가입자 보수월액 변경 신고).
 * 실제 EDI 시스템 직접 연동은 공인인증서 + 정부 표준 API 필요.
 * 본 엔드포인트는 신고 데이터를 자동 정리해 CSV 로 출력 → 담당자가 EDI 사이트 업로드.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";

type EmpRow = {
  id: string;
  employee_no: string | null;
  name: string;
  birth_date: string | null;
  base_salary: number;
  status: string;
  departments: { name: string } | null;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return NextResponse.json({ error: "year/month 필수" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: emps } = await supabase
    .schema("chongmu")
    .from("employees")
    .select("id, employee_no, name, birth_date, base_salary, status, departments:department_id(name)")
    .eq("status", "active")
    .is("deleted_at", null)
    .returns<EmpRow[]>();

  // CSV 헤더 (한국 4대보험 EDI 표준에 가까운 컬럼명)
  const lines: string[] = [];
  lines.push(
    [
      "사번",
      "성명",
      "주민등록번호 앞6자리",
      "생년월일",
      "부서",
      "보수월액",
      "국민연금(원)",
      "건강보험(원)",
      "장기요양(원)",
      "고용보험(원)",
      "산재보험(원)",
      "회사부담합계",
      "근로자부담합계",
    ].join(","),
  );

  // 2026년 기준 요율 (보수월액 기준 근로자 부담률)
  const RATES = {
    pension: 0.045,
    health: 0.03545,
    ltc: 0.004724,
    employment: 0.009,
    employer_pension: 0.045,
    employer_health: 0.03545,
    employer_ltc: 0.004724,
    employer_employment: 0.009,
    employer_industry: 0.008, // 산재 평균 추정
  };

  let totalEmployer = 0;
  let totalEmployee = 0;

  for (const e of emps ?? []) {
    const base = e.base_salary || 0;
    const empContrib = {
      pension: Math.round(base * RATES.pension),
      health: Math.round(base * RATES.health),
      ltc: Math.round(base * RATES.health * RATES.ltc / 0.004724), // 단순화
      employment: Math.round(base * RATES.employment),
    };
    const employerContrib = {
      pension: Math.round(base * RATES.employer_pension),
      health: Math.round(base * RATES.employer_health),
      ltc: Math.round(base * RATES.employer_health * RATES.employer_ltc / 0.004724),
      employment: Math.round(base * RATES.employer_employment),
      industry: Math.round(base * RATES.employer_industry),
    };
    const empSum =
      empContrib.pension + empContrib.health + empContrib.ltc + empContrib.employment;
    const employerSum =
      employerContrib.pension +
      employerContrib.health +
      employerContrib.ltc +
      employerContrib.employment +
      employerContrib.industry;

    totalEmployee += empSum;
    totalEmployer += employerSum;

    const birthShort = e.birth_date ? e.birth_date.replace(/-/g, "").slice(2, 8) : "";

    lines.push(
      [
        csvEscape(e.employee_no ?? ""),
        csvEscape(e.name),
        birthShort,
        csvEscape(e.birth_date ?? ""),
        csvEscape(e.departments?.name ?? ""),
        String(base),
        String(empContrib.pension),
        String(empContrib.health),
        String(empContrib.ltc),
        String(empContrib.employment),
        String(employerContrib.industry),
        String(employerSum),
        String(empSum),
      ].join(","),
    );
  }

  // 합계 행
  lines.push(
    [
      "",
      "합계",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      String(totalEmployer),
      String(totalEmployee),
    ].join(","),
  );

  // BOM (한글 깨짐 방지) + CRLF
  const csv = "\uFEFF" + lines.join("\r\n");
  const filename = `insurance_edi_${year}_${String(month).padStart(2, "0")}.csv`;

  await recordAudit({
    action: "report.exported",
    entityType: "report",
    metadata: {
      kind: "insurance_edi",
      year,
      month,
      employees: emps?.length ?? 0,
      total_employer: totalEmployer,
      total_employee: totalEmployee,
    },
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
