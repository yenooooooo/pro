/**
 * 계약서 OCR — Gemini Vision (PDF/이미지).
 *
 * POST /api/ai/ocr/contract
 *   form-data: file (PDF or image, max 10MB)
 *
 * 추출:
 *   - title (계약서 제목)
 *   - parties (당사자 회사명 배열)
 *   - amount (계약 금액, 원)
 *   - start_date / end_date (YYYY-MM-DD)
 *   - signed_date
 *   - contract_type (service/supply/lease/employment/nda/other)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini";

const MAX_BYTES = 10 * 1024 * 1024; // PDF 까지 → 10MB
const ACCEPTED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

const PROMPT = `당신은 한국 기업 계약서를 분석하는 OCR 어시스턴트입니다.
첨부된 계약서에서 다음 항목을 추출해 JSON 으로만 답하세요:

{
  "title": string | null,
  "contract_type": "service" | "supply" | "lease" | "employment" | "nda" | "other" | null,
  "parties": string[],            // 당사자 회사명 (보통 2개)
  "amount": number | null,         // 계약 금액 (원, VAT 별도면 공급가)
  "currency": "KRW" | "USD" | string | null,
  "start_date": string | null,     // YYYY-MM-DD
  "end_date": string | null,
  "signed_date": string | null,
  "notes": string | null           // 특이사항·자동연장 조항 등 짧게
}

규칙:
- 모르는 필드는 null
- 회사명은 한글 그대로 (예: "주식회사 네오비트")
- 금액은 정수, 천단위 콤마 제거
- contract_type 추정 기준:
  * service: 용역·컨설팅·유지보수
  * supply: 물품·재고 공급
  * lease: 임대차 (사무실, 차량 등)
  * employment: 근로계약
  * nda: 비밀유지
  * other: 그 외`;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "인증이 필요합니다." },
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
      { ok: false, error: "file 누락" },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "파일 크기 초과 (10MB)" },
      { status: 400 },
    );
  }
  if (!ACCEPTED_MIME.includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: `지원하지 않는 형식: ${file.type}` },
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
        { ok: false, error: "빈 응답" },
        { status: 502 },
      );
    }
    const parsed = JSON.parse(text);

    await recordAudit({
      action: "ai.ocr",
      entityType: "vendor",
      metadata: { kind: "contract", title: parsed.title ?? null },
    });

    return NextResponse.json({ ok: true, data: parsed });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Gemini 호출 실패",
      },
      { status: 502 },
    );
  }
}
