/**
 * AI 기능 공용 타입.
 */

export type OcrParsedReceipt = {
  date: string | null;
  amount: number | null;
  vat: number | null;
  total: number | null;
  vendor_name: string | null;
  business_no: string | null;
  payment_method: "card" | "cash" | "transfer" | "other" | null;
  description: string | null;
};

export type OcrSource = "gemini" | "tesseract" | "no-key";

export type AskNexusAnswer = {
  /** 자연어 응답 (사용자에게 보여줄 답변) */
  answer: string;
  /** 실행한 데이터 쿼리의 요약. 디버깅·신뢰도 표시용. */
  query: {
    table: string;
    description: string;
  } | null;
  /** 데이터 행 (있으면) */
  rows: Record<string, unknown>[] | null;
  /** Gemini 가 만든 답인지, fallback 인지 */
  source: "gemini" | "fallback" | "no-key";
};
