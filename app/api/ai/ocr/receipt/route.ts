/**
 * 영수증 OCR — Gemini Vision.
 *
 * POST /api/ai/ocr/receipt
 *   form-data: file (image/png|jpeg|webp, max 5MB)
 *
 * 응답:
 *   { ok: true, source: "gemini", data: { date, amount, vat, vendor_name, description, payment_method } }
 *   { ok: false, source: "gemini", error: "..." }
 *   { ok: false, source: "no-key" } → 클라이언트는 Tesseract fallback 시도
 *
 * Gemini 무료 tier 사용. 파싱은 JSON mode 로 강제.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/webp"];

const PROMPT = `당신은 한국 영수증을 분석하는 정밀 OCR 어시스턴트입니다.
첨부된 영수증 이미지에서 다음 항목을 추출해 JSON 으로만 답하세요.
설명·주석 일절 금지, 오직 JSON 만:

{
  "date": "YYYY-MM-DD" | null,        // 결제일자. 모르면 null
  "amount": number | null,             // 공급가액(부가세 제외). 영수증에 합계만 있으면 합계 / 1.1 로 추정
  "vat": number | null,                // 부가세. 영수증에 명시된 값 또는 amount * 0.1
  "total": number | null,              // 총 결제금액 (amount + vat)
  "vendor_name": string | null,        // 가맹점/상호
  "business_no": string | null,        // 사업자등록번호 (000-00-00000 형식, 모르면 null)
  "payment_method": "card" | "cash" | "transfer" | "other" | null,
  "description": string | null         // 요약 (예: "OO식당 점심 회식")
}

규칙:
- 금액은 정수(원). 천단위 콤마 제거.
- 일자는 반드시 ISO 8601 (YYYY-MM-DD).
- 사업자번호 패턴이 안 보이면 null.
- 결제 수단을 추정 못 하면 영수증에 "신용카드"가 있으면 card, "현금"이면 cash.
- 한국어 설명을 자연스러운 한 줄로 작성.`;

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

  const client = getGeminiClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, source: "no-key", error: "GEMINI_API_KEY 미설정" },
      { status: 200 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, source: "input", error: "form-data 형식 오류" },
      { status: 400 },
    );
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, source: "input", error: "file 누락" },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, source: "input", error: "파일 크기 초과 (5MB)" },
      { status: 400 },
    );
  }
  if (!ACCEPTED_MIME.includes(file.type)) {
    return NextResponse.json(
      { ok: false, source: "input", error: `지원하지 않는 형식: ${file.type}` },
      { status: 400 },
    );
  }

  const arrayBuf = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuf).toString("base64");

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODELS.flash,
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT },
            {
              inlineData: {
                mimeType: file.type,
                data: base64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const text = result.text;
    if (!text) {
      return NextResponse.json(
        { ok: false, source: "gemini", error: "빈 응답" },
        { status: 502 },
      );
    }
    const parsed = JSON.parse(text);

    await recordAudit({
      action: "ai.ocr",
      entityType: "expense",
      metadata: {
        size: file.size,
        mime: file.type,
        recognized_amount: parsed.amount ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      source: "gemini",
      data: parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini 호출 실패";
    return NextResponse.json(
      { ok: false, source: "gemini", error: message },
      { status: 502 },
    );
  }
}
