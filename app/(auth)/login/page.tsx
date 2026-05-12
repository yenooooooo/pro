"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { demoLoginAction } from "@/lib/auth/actions";

const LoginSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

type LoginInput = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoPending, startDemoTransition] = useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError(
        error.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않습니다"
          : error.message,
      );
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  function loginAsDemo() {
    setServerError(null);
    startDemoTransition(async () => {
      const result = await demoLoginAction();
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <main className="min-h-screen bg-bg text-text-1">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 lg:grid-cols-2">
        {/* LEFT — Editorial brand panel */}
        <aside className="relative flex flex-col justify-between border-b border-line p-8 lg:border-b-0 lg:border-r lg:p-14">
          <div>
            <div className="flex items-center gap-3">
              <span className="brand-mark" aria-hidden />
              <span className="font-serif text-[22px] tracking-tight text-text-1">
                NEXUS<em className="not-italic text-text-3"> ERP</em>
              </span>
            </div>

            <div className="eyebrow mt-12">
              <b>01</b>Enterprise OS · Editorial Edition
            </div>
            <h1 className="page-h mt-4">
              엔터프라이즈 ERP,
              <br />
              <em>1인 운영자</em>를 위해.
            </h1>
            <p className="page-sub max-w-md">
              급여·근태·자산·결산 — 흩어진 시트를 하나의 운영 콘솔로. 한 사람이
              한 회사를 지휘하는 데 필요한 모든 지표.
            </p>
          </div>

          {/* Mission stat strip */}
          <div className="mt-12 grid grid-cols-3 gap-px border border-line bg-line">
            <div className="bg-bg p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
                Modules
              </div>
              <div className="mt-3 font-serif text-3xl tabular-nums text-text-1">
                12
              </div>
            </div>
            <div className="bg-bg p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
                Compliance
              </div>
              <div className="mt-3 font-serif text-3xl text-text-1">2026</div>
            </div>
            <div className="bg-bg p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
                Uptime
              </div>
              <div className="mt-3 font-serif text-3xl tabular-nums text-gold">
                99.9
                <span className="font-mono text-base text-text-3">%</span>
              </div>
            </div>
          </div>

          <div className="mt-12 font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            © 2026 Nexus ERP · Built for the solo operator.
          </div>
        </aside>

        {/* RIGHT — Login form */}
        <section className="flex items-center justify-center p-6 lg:p-14">
          <div className="w-full max-w-md border border-line bg-bg-1 p-8">
            <div className="eyebrow">
              <b>·</b>Sign In · Operations OS
            </div>
            <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-text-1">
              운영자 로그인<em className="font-serif italic text-gold">.</em>
            </h2>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-3">
              Authorized administrators only
            </p>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-8 space-y-5"
              noValidate
            >
              <div>
                <label
                  htmlFor="email"
                  className="block font-mono text-[10px] uppercase tracking-[0.12em] text-text-3"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  {...form.register("email")}
                  className="mt-2 h-11 w-full border border-line bg-bg px-4 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-gold focus:outline-none"
                  placeholder="admin@company.com"
                />
                {form.formState.errors.email ? (
                  <p className="mt-2 font-mono text-[11px] text-[#E06B5F]">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block font-mono text-[10px] uppercase tracking-[0.12em] text-text-3"
                  >
                    Password
                  </label>
                  <Link
                    href="#"
                    className="font-mono text-[11px] uppercase tracking-[0.06em] text-gold hover:text-gold-2"
                  >
                    비밀번호 찾기
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register("password")}
                  className="mt-2 h-11 w-full border border-line bg-bg px-4 font-mono text-[13px] text-text-1 placeholder:text-text-3 focus:border-gold focus:outline-none"
                  placeholder="••••••••"
                />
                {form.formState.errors.password ? (
                  <p className="mt-2 font-mono text-[11px] text-[#E06B5F]">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              {serverError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 border border-[#E06B5F]/40 bg-[#E06B5F]/[0.06] p-3 font-mono text-[11px] leading-relaxed text-[#E06B5F]"
                >
                  <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{serverError}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary !h-11 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                    인증 중…
                  </>
                ) : (
                  <>
                    로그인
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* 데모 계정 자동 로그인 */}
            <div className="mt-8">
              <div className="section-rule">
                <div className="l">
                  <b>·</b>OR
                </div>
                <div className="line" />
              </div>

              <button
                type="button"
                onClick={loginAsDemo}
                disabled={demoPending || isSubmitting}
                className="btn !h-11 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                {demoPending ? (
                  <>
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                    데모 계정 입장 중…
                  </>
                ) : (
                  <>
                    <Sparkles aria-hidden className="h-4 w-4 text-gold" />
                    데모 계정으로 둘러보기
                  </>
                )}
              </button>

              <div className="mt-4 border border-gold-soft bg-gold/[0.06] p-3 font-mono text-[11px] leading-relaxed text-text-2">
                <div className="text-[10px] uppercase tracking-[0.12em] text-gold">
                  Demo Access
                </div>
                <p className="mt-1 text-text-2">
                  가입 없이 1년치 시나리오 데이터로 모든 기능을 체험하세요.
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="mt-8 block text-center font-mono text-[11px] uppercase tracking-[0.06em] text-text-3 hover:text-text-1"
            >
              ← Back to landing
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
