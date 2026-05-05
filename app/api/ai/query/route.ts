/**
 * Ask Nexus — 자연어 → ERP 데이터 질의.
 *
 * POST /api/ai/query
 *   { query: string }
 *
 * 응답:
 *   { ok: true, source: "gemini" | "fallback", answer: string, query?: {...}, rows?: [...] }
 *   { ok: false, source: "no-key" | "input" | "gemini", error: string }
 *
 * 처리 흐름:
 *   1) 사용자 자연어 → Gemini (응답: 의도 분류 + 테이블/필터/집계 JSON)
 *   2) 결과를 화이트리스트 검사 후 Supabase 쿼리로 실행
 *   3) Gemini 에 데이터 결과 + 원래 질문 다시 보내 → 자연어 답변 생성
 *   4) 사용자에게 답변 + 출처(테이블) + 일부 행 함께 반환
 *
 * 키 없을 때:
 *   - 클라이언트가 정규식 fallback 으로 처리 (제한적)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini";
import { SCHEMA_CONTEXT, isSafeQuery } from "@/lib/ai/schema-context";

const InputSchema = z.object({
  query: z.string().min(2).max(500),
});

const ALLOWED_TABLES = new Set([
  "employees",
  "departments",
  "attendance",
  "payroll",
  "leave_balances",
  "leave_requests",
  "expenses",
  "expense_categories",
  "vendors",
  "assets",
]);

const ALLOWED_OPS = new Set(["eq", "gt", "gte", "lt", "lte", "between", "ilike"]);

type GeminiPlan = {
  intent: string;
  table: string | null;
  filters?: Array<{ column: string; op: string; value: unknown }>;
  aggregate?: { fn: string; column: string } | null;
  groupBy?: string | null;
  limit?: number | null;
  join?: string[] | null;
  explanation?: string;
};

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, source: "auth", error: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, source: "input", error: "query 누락 또는 길이 초과" },
      { status: 400 },
    );
  }
  const userQuery = parsed.data.query;
  if (!isSafeQuery(userQuery)) {
    return NextResponse.json(
      { ok: false, source: "input", error: "허용되지 않는 패턴" },
      { status: 400 },
    );
  }

  const client = getGeminiClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, source: "no-key", error: "GEMINI_API_KEY 미설정" },
      { status: 200 },
    );
  }

  // 1) 의도 추출
  let plan: GeminiPlan;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const planRes = await client.models.generateContent({
      model: GEMINI_MODELS.flash,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SCHEMA_CONTEXT}\n\n오늘 날짜: ${today}\n\n사용자 질문: "${userQuery}"\n\nJSON 만 출력.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });
    if (!planRes.text) throw new Error("Gemini 빈 응답");
    plan = JSON.parse(planRes.text) as GeminiPlan;
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        source: "gemini",
        error: err instanceof Error ? err.message : "의도 추출 실패",
      },
      { status: 502 },
    );
  }

  if (plan.intent === "unknown" || !plan.table) {
    return NextResponse.json({
      ok: true,
      source: "gemini",
      answer:
        plan.explanation ??
        "질문을 정확히 이해하지 못했습니다. 더 구체적으로 알려주세요. 예: '개발팀 5월 평균 기본급'",
      query: null,
      rows: null,
    });
  }

  if (!ALLOWED_TABLES.has(plan.table)) {
    return NextResponse.json({
      ok: true,
      source: "gemini",
      answer: `'${plan.table}' 은(는) 접근할 수 없는 테이블입니다.`,
      query: null,
      rows: null,
    });
  }

  // 2) 데이터 조회
  let rows: Record<string, unknown>[] = [];
  try {
    const select = buildSelect(plan);
    let query = supabase
      .schema("chongmu")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(plan.table as any)
      .select(select)
      .limit(Math.min(plan.limit ?? 50, 200));

    for (const f of plan.filters ?? []) {
      if (!ALLOWED_OPS.has(f.op)) continue;
      switch (f.op) {
        case "eq":
          query = query.eq(f.column, f.value as never);
          break;
        case "gt":
          query = query.gt(f.column, f.value as never);
          break;
        case "gte":
          query = query.gte(f.column, f.value as never);
          break;
        case "lt":
          query = query.lt(f.column, f.value as never);
          break;
        case "lte":
          query = query.lte(f.column, f.value as never);
          break;
        case "ilike":
          query = query.ilike(f.column, `%${String(f.value)}%`);
          break;
        case "between":
          if (Array.isArray(f.value) && f.value.length === 2) {
            query = query
              .gte(f.column, f.value[0] as never)
              .lte(f.column, f.value[1] as never);
          }
          break;
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    rows = (data as unknown as Record<string, unknown>[]) ?? [];
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        source: "query",
        error: err instanceof Error ? err.message : "쿼리 실패",
      },
      { status: 500 },
    );
  }

  // 3) 자연어 답변 생성 — 데이터를 다시 Gemini 에 넘겨 결론 요약
  const sample = rows.slice(0, 30); // 토큰 절약
  let answer = plan.explanation ?? "";
  try {
    const summaryRes = await client.models.generateContent({
      model: GEMINI_MODELS.flash,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `사용자 질문: "${userQuery}"\n\n조회된 데이터 (최대 30행, 총 ${rows.length}행):\n\`\`\`json\n${JSON.stringify(sample, null, 2)}\n\`\`\`\n\n위 데이터를 바탕으로 한국어로 친근하게 답변하세요.\n- 1~3 문장\n- 숫자는 천단위 콤마, 금액은 '원' 단위
- 인사이트(평균 대비, 월대비 등) 1개 포함하면 좋음
- 데이터가 비어있으면 그렇게 답변
- 표/리스트 사용 금지, 자연스러운 문장만`,
            },
          ],
        },
      ],
      config: { temperature: 0.4 },
    });
    if (summaryRes.text) answer = summaryRes.text.trim();
  } catch {
    // 요약 실패해도 plan.explanation 또는 빈 문자열로 진행
  }

  await recordAudit({
    action: "ai.query",
    entityType: "report",
    metadata: {
      query: userQuery,
      intent: plan.intent,
      table: plan.table,
      row_count: rows.length,
    },
  });

  return NextResponse.json({
    ok: true,
    source: "gemini",
    answer,
    query: {
      table: plan.table,
      description: `${plan.table} (${rows.length}행)`,
    },
    rows: sample,
  });
}

function buildSelect(plan: GeminiPlan): string {
  // 기본은 모든 컬럼. join 요청이 있으면 부서/직급/카테고리/거래처 join 별칭으로 추가
  const joins: string[] = [];
  if (plan.join?.includes("departments"))
    joins.push("department:departments(name)");
  if (plan.join?.includes("positions"))
    joins.push("position:positions(name)");
  if (plan.join?.includes("expense_categories"))
    joins.push("category:expense_categories(name)");
  if (plan.join?.includes("vendors")) joins.push("vendor:vendors(name)");
  return joins.length > 0 ? `*, ${joins.join(", ")}` : "*";
}
