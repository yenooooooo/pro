"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const LoginSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

type LoginInput = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

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

  const isSubmitting = form.formState.isSubmitting;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="mb-6">
          <h1 className="text-headline-lg font-semibold text-on-surface">로그인</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            관리자 계정으로 입장하세요.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="text-label-sm font-medium text-on-surface-variant"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              {...form.register("email")}
              className="mt-2 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary-electric focus:outline-none focus:ring-1 focus:ring-primary-electric"
              placeholder="admin@company.com"
            />
            {form.formState.errors.email ? (
              <p className="mt-1 text-label-sm text-error-soft">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-label-sm font-medium text-on-surface-variant"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
              className="mt-2 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary-electric focus:outline-none focus:ring-1 focus:ring-primary-electric"
              placeholder="••••••••"
            />
            {form.formState.errors.password ? (
              <p className="mt-1 text-label-sm text-error-soft">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          {serverError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-error-container/40 bg-error-soft/10 p-3 text-label-sm text-error-soft"
            >
              <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container text-data-tabular font-semibold text-on-primary shadow-[0_0_20px_rgba(192,193,255,0.25)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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

        <Link
          href="/"
          className="mt-6 block text-center text-label-sm font-medium text-on-surface-variant hover:text-on-surface"
        >
          ← 랜딩으로
        </Link>
      </div>
    </main>
  );
}
