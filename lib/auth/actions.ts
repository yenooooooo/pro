"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * 데모 계정 자동 로그인.
 *
 * 환경변수 DEMO_EMAIL / DEMO_PASSWORD 가 설정되어 있어야 동작.
 * 면접관/방문자가 가입 없이 사이트 둘러볼 수 있게 하기 위함.
 *
 * 보안:
 *  - 비밀번호는 서버에만 존재 (클라이언트 번들 노출 X)
 *  - 데모 계정은 별도 Supabase 사용자로 만들어 격리
 *  - RLS 또는 데모 모드 가드로 destructive action 차단 (본 PR은 격리 + 표시만)
 */
export async function demoLoginAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) {
    return {
      ok: false,
      error:
        "데모 계정이 설정되지 않았습니다. 환경변수 DEMO_EMAIL / DEMO_PASSWORD 를 설정하세요.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      ok: false,
      error:
        error.message === "Invalid login credentials"
          ? "데모 계정 자격 증명 오류 — 환경변수의 비밀번호가 Supabase 계정과 일치하는지 확인하세요."
          : error.message,
    };
  }
  return { ok: true };
}

