import Link from "next/link";
import { ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TwoFactorEnroll } from "./_2fa";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 등록된 MFA 팩터 조회
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totpFactors = factors?.totp ?? [];
  const verified = totpFactors.find((f) => f.status === "verified");

  return (
    <div className="space-y-stack-lg">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        시스템 설정
      </Link>

      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Account Security
        </p>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          계정 보안
        </h1>
        <p className="text-body-md text-on-surface-variant">
          2단계 인증 (TOTP) 으로 계정 보안 강화. Google Authenticator·1Password·Authy 등 표준 앱 지원.
        </p>
      </header>

      {/* 계정 정보 */}
      <section className="glass-panel rounded-xl p-6">
        <h2 className="mb-4 text-headline-md font-semibold text-on-surface">
          로그인 계정
        </h2>
        <div className="space-y-2 text-body-md">
          <div className="flex justify-between border-b border-outline-variant/15 pb-2">
            <span className="text-on-surface-variant">이메일</span>
            <span className="text-on-surface">{user?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">2단계 인증</span>
            {verified ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
                활성
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                <KeyRound aria-hidden className="h-3.5 w-3.5" />
                비활성
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 2FA 등록/관리 */}
      <TwoFactorEnroll
        verified={!!verified}
        verifiedFactorId={verified?.id ?? null}
      />

      <div className="glass-panel rounded-xl p-4">
        <p className="text-label-sm text-on-surface-variant">
          ⚖️ TOTP (Time-based One-Time Password) 는 RFC 6238 표준입니다. Supabase Auth
          MFA 가 백엔드 처리. 복구 코드는 Supabase 콘솔에서도 별도 관리 권장.
        </p>
      </div>
    </div>
  );
}
