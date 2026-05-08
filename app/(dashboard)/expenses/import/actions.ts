"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini";

const RowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  merchant: z.string().min(1).max(120),
  amount: z.number().int().nonnegative(),
  vat: z.number().int().nonnegative(),
  category_id: z.string().uuid().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
});

const InputSchema = z.object({
  rows: z.array(RowSchema).min(1).max(500),
});

export async function bulkImportExpensesAction(
  input: z.infer<typeof InputSchema>,
): Promise<
  | { ok: true; inserted: number }
  | { ok: false; error: string }
> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "검증 실패" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "인증 필요" };

  const inserts = parsed.data.rows.map((r) => ({
    expense_date: r.date,
    amount: r.amount,
    vat: r.vat,
    payment_method: "card" as const,
    description: r.merchant,
    category_id: r.category_id ?? null,
    vendor_id: r.vendor_id ?? null,
    is_taxable: true,
  }));

  const { error } = await supabase
    .schema("chongmu")
    .from("expenses")
    .insert(inserts);

  if (error) return { ok: false, error: error.message };

  await recordAudit({
    action: "expense.created",
    entityType: "expense",
    metadata: {
      kind: "card_import",
      count: inserts.length,
      total_amount: inserts.reduce((s, r) => s + r.amount + r.vat, 0),
    },
  });

  revalidatePath("/expenses");
  return { ok: true, inserted: inserts.length };
}

/**
 * AI 카테고리 자동 분류.
 * 가맹점 이름들을 batch 로 Gemini 에 보내 카테고리 추천.
 */
export async function classifyMerchantsAction(
  merchants: string[],
): Promise<
  { ok: true; classifications: Record<string, string> } | { ok: false; error: string }
> {
  if (merchants.length === 0)
    return { ok: true, classifications: {} };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "인증 필요" };

  const client = getGeminiClient();
  if (!client) {
    return { ok: false, error: "GEMINI_API_KEY 미설정" };
  }

  // 사용 가능한 카테고리 목록
  const { data: categories } = await supabase
    .schema("chongmu")
    .from("expense_categories")
    .select("id, name");

  if (!categories || categories.length === 0) {
    return { ok: false, error: "지출 카테고리가 등록되지 않았습니다." };
  }

  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));
  const categoryNames = categories.map((c) => c.name);

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODELS.flash,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `한국 중소기업의 법인카드 가맹점 목록을 적절한 지출 카테고리로 분류하세요.

사용 가능한 카테고리: ${categoryNames.join(", ")}

가맹점 목록 (중복 제거):
${merchants.map((m, i) => `${i + 1}. ${m}`).join("\n")}

JSON 만 출력. 형식:
{ "merchant_name_1": "카테고리명", "merchant_name_2": "카테고리명", ... }

규칙:
- 가맹점명을 그대로 키로 사용
- 카테고리는 위 목록 중 하나로 정확히 매칭
- 모르겠으면 "기타"`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    if (!result.text) return { ok: false, error: "빈 응답" };

    const parsed = JSON.parse(result.text) as Record<string, string>;
    const classifications: Record<string, string> = {};
    for (const [merchant, catName] of Object.entries(parsed)) {
      const catId = categoryMap.get(catName) ?? categoryMap.get("기타");
      if (catId) classifications[merchant] = catId;
    }

    return { ok: true, classifications };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gemini 호출 실패",
    };
  }
}
