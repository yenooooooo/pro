/**
 * Ask Nexus — 자연어 → ERP 데이터 질의 (NDJSON 스트리밍).
 *
 * POST /api/ai/query  →  NDJSON stream
 *   {"type":"progress","stage":"intent","label":"질문 분석 중…"}
 *   {"type":"progress","stage":"query","label":"데이터 조회 중…"}
 *   {"type":"meta","query":{...},"rows":[...]}
 *   {"type":"progress","stage":"answer","label":"답변 작성 중…"}
 *   {"type":"chunk","text":"…"}   (반복)
 *   {"type":"done","source":"gemini","cached":false}
 *
 * 또는 캐시 hit 시:
 *   {"type":"cached","answer":"…","query":{...},"rows":[...]}
 *   {"type":"done","source":"gemini","cached":true}
 *
 * 에러:
 *   {"type":"error","source":"...","message":"…"}
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini";
import { SCHEMA_CONTEXT, isSafeQuery } from "@/lib/ai/schema-context";
import { getCached, setCached, makeCacheKey } from "@/lib/ai/query-cache";

// 스트리밍 정상 동작 위해 dynamic 명시 + Node.js runtime
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    return jsonError("auth", "인증이 필요합니다.", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("input", "query 누락 또는 길이 초과", 400);
  }
  const userQuery = parsed.data.query;
  if (!isSafeQuery(userQuery)) {
    return jsonError("input", "허용되지 않는 패턴", 400);
  }

  const client = getGeminiClient();
  if (!client) {
    return jsonError("no-key", "GEMINI_API_KEY 미설정", 200);
  }

  // ★ 캐시 hit — 즉시 응답
  const cacheKey = makeCacheKey(user.id, userQuery);
  const cached = getCached(cacheKey);
  if (cached) {
    return ndjsonStream(async (write) => {
      await write({
        type: "cached",
        answer: cached.answer,
        query: cached.query,
        rows: cached.rows,
      });
      await write({ type: "done", source: "gemini", cached: true });
    });
  }

  return ndjsonStream(async (write) => {
    // 1) 의도 추출
    await write({
      type: "progress",
      stage: "intent",
      label: "질문 분석 중…",
    });

    // ★ Lookup 데이터 사전 조회 — Gemini 가 부서/카테고리/거래처를 ID 로 필터하도록
    // (이전: '개발' 문자열로 department_id 필터 → 0행)
    const [deptList, catList, vendList] = await Promise.all([
      supabase
        .schema("chongmu")
        .from("departments")
        .select("id, name")
        .then((r) => r.data ?? []),
      supabase
        .schema("chongmu")
        .from("expense_categories")
        .select("id, name")
        .then((r) => r.data ?? []),
      supabase
        .schema("chongmu")
        .from("vendors")
        .select("id, name")
        .then((r) => r.data ?? []),
    ]);
    const lookupContext = `\n\n### 실제 데이터 매핑 (필터는 반드시 아래 ID 사용)\ndepartments: ${JSON.stringify(deptList)}\nexpense_categories: ${JSON.stringify(catList)}\nvendors: ${JSON.stringify(vendList)}\n\n부서/카테고리/거래처 이름으로 필터할 땐 위 매핑에서 id 를 찾아 department_id, category_id, vendor_id 로 필터하세요. 매칭되는 이름이 없으면 intent="unknown" + explanation 에 사유.`;

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
                text: `${SCHEMA_CONTEXT}${lookupContext}\n\n오늘 날짜: ${today}\n\n사용자 질문: "${userQuery}"\n\nJSON 만 출력.`,
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
      await write({
        type: "error",
        source: "gemini",
        message: err instanceof Error ? err.message : "의도 추출 실패",
      });
      return;
    }

    if (plan.intent === "unknown" || !plan.table) {
      const answer =
        plan.explanation ??
        "질문을 정확히 이해하지 못했습니다. 더 구체적으로 알려주세요. 예: '개발팀 5월 평균 기본급'";
      await write({ type: "chunk", text: answer });
      await write({ type: "done", source: "gemini", cached: false });
      return;
    }

    if (!ALLOWED_TABLES.has(plan.table)) {
      await write({
        type: "chunk",
        text: `'${plan.table}' 은(는) 접근할 수 없는 테이블입니다.`,
      });
      await write({ type: "done", source: "gemini", cached: false });
      return;
    }

    // 2) 데이터 조회
    await write({
      type: "progress",
      stage: "query",
      label: "데이터 조회 중…",
    });

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
      await write({
        type: "error",
        source: "query",
        message: err instanceof Error ? err.message : "쿼리 실패",
      });
      return;
    }

    const sample = rows.slice(0, 30);
    const queryMeta = {
      table: plan.table,
      description: `${plan.table} (${rows.length}행)`,
    };

    await write({ type: "meta", query: queryMeta, rows: sample });

    // 3) 답변 스트리밍
    await write({
      type: "progress",
      stage: "answer",
      label: "답변 작성 중…",
    });

    let fullAnswer = "";
    let lastFinishReason: string | null = null;
    try {
      const stream = await client.models.generateContentStream({
        model: GEMINI_MODELS.flash,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `사용자 질문: "${userQuery}"

조회된 데이터 (최대 30행, 총 ${rows.length}행):
\`\`\`json
${JSON.stringify(sample, null, 2)}
\`\`\`

위 데이터를 바탕으로 한국어로 친근하게 답변하세요.
- 2~4 문장으로 충분한 분석 포함 (잘리지 않도록 완결된 문장으로)
- 숫자는 천단위 콤마, 금액은 '원' 단위
- 평균/합계/최대값 등 핵심 수치 1개 이상 명시
- 표/리스트 사용 금지, 자연스러운 문장만`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.4,
          maxOutputTokens: 1024, // 충분한 답변 보장
        },
      });

      for await (const piece of stream) {
        const text = piece.text;
        if (text) {
          fullAnswer += text;
          await write({ type: "chunk", text });
        }
        // finishReason 추적 (truncation/safety 감지)
        const fr = piece.candidates?.[0]?.finishReason;
        if (fr) lastFinishReason = String(fr);
      }
    } catch (err) {
      // 스트리밍 실패 — explanation fallback
      const fb = plan.explanation ?? "데이터를 조회했지만 요약 생성에 실패했습니다.";
      if (!fullAnswer) await write({ type: "chunk", text: fb });
      console.error("[ask-nexus] stream failed:", err);
    }

    // 답변이 비정상적으로 짧거나 (truncation 의심) finishReason 이 STOP 이 아니면
    // 안전하게 fallback 추가 안내.
    const trimmed = fullAnswer.trim();
    const looksTruncated =
      trimmed.length > 0 &&
      trimmed.length < 30 &&
      !/[.!?。…」"]$/.test(trimmed);
    if (
      looksTruncated ||
      (lastFinishReason && lastFinishReason !== "STOP" && lastFinishReason !== "FINISH_REASON_STOP")
    ) {
      const tail = ` (응답이 일부만 도착했습니다. 다시 질문해 주세요. 사유: ${lastFinishReason ?? "잘림"})`;
      await write({ type: "chunk", text: tail });
      fullAnswer += tail;
    }

    if (!fullAnswer) {
      // 모델이 빈 응답 — explanation fallback
      const fb = plan.explanation ?? "조회된 데이터를 확인해 주세요.";
      await write({ type: "chunk", text: fb });
      fullAnswer = fb;
    }

    // ★ 캐싱 조건 — 정상 완료된 응답만 (truncation/짧은 응답/빈결과 캐시 금지)
    const okToCache =
      rows.length > 0 &&
      fullAnswer.trim().length >= 20 &&
      !looksTruncated &&
      (!lastFinishReason || lastFinishReason === "STOP" || lastFinishReason === "FINISH_REASON_STOP");
    if (okToCache) {
      setCached(cacheKey, {
        answer: fullAnswer,
        query: queryMeta,
        rows: sample,
        source: "gemini",
      });
    }

    // 감사 로그 (실패해도 응답에 영향 없음)
    recordAudit({
      action: "ai.query",
      entityType: "report",
      metadata: {
        query: userQuery,
        intent: plan.intent,
        table: plan.table,
        row_count: rows.length,
      },
    }).catch(() => {});

    await write({ type: "done", source: "gemini", cached: false });
  });
}

function buildSelect(plan: GeminiPlan): string {
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

// ---------- helpers ----------

type NDJsonEvent = Record<string, unknown>;

function ndjsonStream(
  handler: (write: (event: NDJsonEvent) => Promise<void>) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = async (event: NDJsonEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        await handler(write);
      } catch (err) {
        await write({
          type: "error",
          source: "internal",
          message: err instanceof Error ? err.message : "내부 오류",
        });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", // nginx 프록시 환경 대비
    },
  });
}

function jsonError(source: string, message: string, status: number): Response {
  return new Response(
    JSON.stringify({ ok: false, source, error: message }) + "\n",
    {
      status,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    },
  );
}
