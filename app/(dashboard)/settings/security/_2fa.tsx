"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Loader2,
  AlertCircle,
  Check,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  verified: boolean;
  verifiedFactorId: string | null;
};

export function TwoFactorEnroll({ verified, verifiedFactorId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [enrollData, setEnrollData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");

  async function startEnroll() {
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Nexus ERP — ${new Date().toISOString().slice(0, 10)}`,
    });
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setEnrollData({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    }
  }

  async function verifyEnroll() {
    if (!enrollData) return;
    if (!/^\d{6}$/.test(code)) {
      setError("6자리 숫자 코드를 입력하세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data: challenge, error: challengeErr } =
        await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
      if (challengeErr || !challenge) {
        setError(challengeErr?.message ?? "challenge 실패");
        return;
      }
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyErr) {
        setError(verifyErr.message);
        return;
      }
      setEnrollData(null);
      setCode("");
      router.refresh();
    });
  }

  async function unenroll() {
    if (!verifiedFactorId) return;
    if (!confirm("2단계 인증을 해제하시겠습니까? 보안이 약화됩니다.")) return;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactorId,
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.refresh();
    });
  }

  if (verified && !enrollData) {
    return (
      <section className="glass-panel rounded-xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck aria-hidden className="h-5 w-5 text-emerald-300" />
          <h2 className="text-headline-md font-semibold text-on-surface">
            2단계 인증 활성됨
          </h2>
        </div>
        <p className="text-body-md text-on-surface-variant">
          이메일·비밀번호 로그인 후 인증 앱의 6자리 코드 입력이 필요합니다.
        </p>
        <button
          type="button"
          onClick={unenroll}
          disabled={pending}
          className="mt-4 inline-flex min-h-9 items-center gap-1 rounded-lg border border-error-soft/40 bg-error-soft/10 px-3 py-1.5 text-label-sm font-semibold text-error-soft transition-colors hover:bg-error-soft/20 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 aria-hidden className="h-4 w-4" />
          )}
          2FA 해제
        </button>
        {error ? (
          <p className="mt-2 inline-flex items-center gap-1 text-label-sm text-error-soft">
            <AlertCircle aria-hidden className="h-4 w-4" />
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  if (enrollData) {
    return (
      <section className="glass-panel rounded-xl p-6 space-y-4">
        <h2 className="text-headline-md font-semibold text-on-surface">
          QR 코드 등록
        </h2>
        <ol className="ml-4 list-decimal space-y-2 text-body-md text-on-surface-variant">
          <li>인증 앱 (Google Authenticator / 1Password / Authy) 열기</li>
          <li>아래 QR 코드 스캔 (또는 시크릿 키 수동 입력)</li>
          <li>앱에 표시된 6자리 코드를 입력</li>
        </ol>

        <div className="flex flex-col items-center gap-4 rounded-lg border border-outline-variant/30 bg-white p-6 md:flex-row md:items-start">
          <div
            className="flex-shrink-0 rounded bg-white"
            dangerouslySetInnerHTML={{ __html: enrollData.qrCode }}
          />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-label-sm font-semibold text-slate-700">
                시크릿 키 (수동 입력용)
              </p>
              <code className="mt-1 block break-all rounded bg-slate-100 px-3 py-2 font-mono text-label-sm text-slate-900">
                {enrollData.secret}
              </code>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface-variant">
            인증 앱의 6자리 코드
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="mt-1 min-h-11 w-40 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-center text-headline-md font-mono tracking-[0.3em] text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={verifyEnroll}
            disabled={pending || code.length !== 6}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-5 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Check aria-hidden className="h-4 w-4" />
            )}
            확인 및 활성화
          </button>
          <button
            type="button"
            onClick={() => {
              setEnrollData(null);
              setCode("");
              setError(null);
            }}
            className="text-label-sm text-on-surface-variant hover:text-on-surface"
          >
            취소
          </button>
        </div>

        {error ? (
          <p className="inline-flex items-center gap-1 text-body-md text-error-soft">
            <AlertCircle aria-hidden className="h-4 w-4" />
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  // 등록 시작 전
  return (
    <section className="glass-panel rounded-xl p-6 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound aria-hidden className="h-5 w-5 text-primary-electric" />
        <h2 className="text-headline-md font-semibold text-on-surface">
          2단계 인증 활성화
        </h2>
      </div>
      <p className="text-body-md text-on-surface-variant">
        TOTP (Time-based One-Time Password) 표준 앱과 연동됩니다. 비밀번호 외 6자리
        시간 기반 코드를 추가로 입력해야 로그인할 수 있어 보안이 크게 강화됩니다.
      </p>
      <button
        type="button"
        onClick={startEnroll}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-5 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
      >
        <KeyRound aria-hidden className="h-4 w-4" />
        등록 시작
      </button>
      {error ? (
        <p className="inline-flex items-center gap-1 text-body-md text-error-soft">
          <AlertCircle aria-hidden className="h-4 w-4" />
          {error}
        </p>
      ) : null}
    </section>
  );
}
