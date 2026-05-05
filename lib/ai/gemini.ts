import "server-only";
import { GoogleGenAI } from "@google/genai";

/**
 * Gemini 클라이언트 — server-only.
 *
 * 환경변수 GEMINI_API_KEY 가 없으면 null 반환. 호출부는 fallback 으로 분기한다.
 * - 무료 tier: gemini-2.5-flash (멀티모달 + 텍스트), 100만 토큰/일
 * - 키는 https://aistudio.google.com/apikey 에서 발급 (카드 등록 불필요)
 */

let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (_client) return _client;
  _client = new GoogleGenAI({ apiKey: key });
  return _client;
}

export function isGeminiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export const GEMINI_MODELS = {
  // Vision + 텍스트 통합. 영수증 OCR + 자연어 쿼리 둘 다.
  flash: "gemini-2.5-flash",
} as const;
