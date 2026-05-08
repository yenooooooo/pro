/**
 * 명함 OCR — Gemini Vision.
 *
 * POST /api/ai/ocr/business-card
 *   form-data: file (image, max 5MB)
 *
 * 응답:
 *   { ok: true, data: { name, company, role, phone, email, business_no? } }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/webp"];

const PROMPT = `당신은 한국 명함을 분석하는 OCR 어시스턴트입니다.
첨부된 명함 이미지에서 다음 항목을 추출해 JSON 으로만 답하세요:

{
  "company": string | null,        // 회사명
  "name": string | null,            // 담당자 이름
  "role": string | null,            // 직급/직책
  "phone": string | null,           // 전화 (010-XXXX-XXXX 또는 02-XXXX-XXXX)
  "email": string | null,           // 이메일
  "business_no": string | null,     // 사업자번호 (000-00-00000 형식, 명함에 있으면)
  "address": string | null          // 주소 (있으면)
}

규칙:
- 모르는 필드는 null
- 한국어 이름·회사명은 한글 그대로
- 전화번호는 하이픈 포함
- 명함에 사업자번호가 보이지 않으면 null`;

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

  const formData = await req.formData();
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
      entityType: "vendor",
      metadata: { kind: "business_card", company: parsed.company ?? null },
    });

    return NextResponse.json({
      ok: true,
      source: "gemini",
      data: parsed,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        source: "gemini",
        error: err instanceof Error ? err.message : "Gemini 호출 실패",
      },
      { status: 502 },
    );
  }
}
