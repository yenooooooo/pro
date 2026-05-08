/**
 * AI 채용 공고 자동 작성 — Gemini 2.5 Flash.
 *
 * POST /api/ai/generate-job-posting
 *   { department, position, requirements, preferred?, additional_notes? }
 *
 * 응답: { ok, posting: string (markdown) }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit/actions";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini";

const Schema = z.object({
  department: z.string().min(1).max(40),
  position: z.string().min(1).max(40),
  requirements: z.string().min(2).max(500),
  preferred: z.string().max(500).optional(),
  additional_notes: z.string().max(500).optional(),
});

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

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message ?? "검증 실패" },
      { status: 400 },
    );
  }

  const prompt = `당신은 한국 중소기업의 HR 담당자를 위한 채용 공고 작성 어시스턴트입니다.
아래 정보를 바탕으로 표준적이고 매력적인 한국어 채용 공고를 마크다운으로 작성하세요.

부서: ${parsed.data.department}
직급: ${parsed.data.position}
필수 요구사항: ${parsed.data.requirements}
${parsed.data.preferred ? `우대 사항: ${parsed.data.preferred}` : ""}
${parsed.data.additional_notes ? `추가 메모: ${parsed.data.additional_notes}` : ""}

다음 섹션을 포함하세요:
## 회사 소개
(중소기업 일반 소개 — 구체적 회사명은 [회사명] 으로 placeholder)

## 모집 분야
- 부서·직급·인원

## 주요 업무
(3~5개 bullet)

## 자격 요건
- 필수
- 학력/경력 등

## 우대 사항
(있으면)

## 복지 및 혜택
- 표준 복지 (4대보험, 연차, 퇴직금, 식대, 야근 식대, 경조사, 명절 상여 등)
- 한국 SMB 표준 항목

## 근무 조건
- 근무 시간 (주 40시간, 9-18시 등)
- 근무 형태 (정규직/계약직)
- 근무 위치 ([주소])

## 전형 절차
1. 서류 → 2. 1차 면접 → 3. 최종 면접 → 4. 합격 통보

## 지원 방법
[채용 이메일 / 사이트] 으로 이력서·자기소개서·포트폴리오 제출

마크다운 만 출력. 다른 텍스트 일절 금지.`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODELS.flash,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.6 },
    });

    const text = result.text;
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "빈 응답" },
        { status: 502 },
      );
    }

    await recordAudit({
      action: "ai.query",
      entityType: "report",
      metadata: {
        kind: "job_posting",
        department: parsed.data.department,
        position: parsed.data.position,
      },
    });

    return NextResponse.json({ ok: true, posting: text });
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
