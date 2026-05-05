import "server-only";
import { Resend } from "resend";

/**
 * Resend 이메일 클라이언트.
 *
 * 무료 tier: 100건/일, 3,000건/월. 자체 도메인 인증 후 production 사용 가능.
 * 미인증 도메인은 발송 가능한 수신자가 본인 (Resend 계정 이메일) 로 제한 — 데모/테스트용.
 *
 * 환경변수:
 *   RESEND_API_KEY: https://resend.com/api-keys 에서 발급
 *   RESEND_FROM_EMAIL: 발송자 (예: 'Nexus ERP <noreply@your-domain.com>')
 *
 * 키 미설정 시: null 반환 → 호출부는 graceful skip (console.warn).
 */

let _client: Resend | null = null;

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (_client) return _client;
  _client = new Resend(key);
  return _client;
}

export function getFromEmail(): string {
  // Resend 의 onboarding 도메인은 본인 이메일로만 발송 가능
  return process.env.RESEND_FROM_EMAIL ?? "Nexus ERP <onboarding@resend.dev>";
}

export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
