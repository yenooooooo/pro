import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  // Phase 0: Supabase 환경변수가 없으면 인증 체크를 건너뛴다.
  // Phase 1에서 .env.local에 키가 채워지면 자동으로 활성화된다.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(
    url,
    anonKey,
    {
      db: { schema: "chongmu" },
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");
  const isPublicRoute =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api/public");

  // 비인증 → 보호 라우트 → /login
  if (!user && !isLoginRoute && !isPublicRoute) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    return NextResponse.redirect(target);
  }

  // 이미 로그인된 사용자가 /login 에 머물 이유가 없음 → /dashboard
  if (user && isLoginRoute) {
    const target = request.nextUrl.clone();
    target.pathname = "/dashboard";
    return NextResponse.redirect(target);
  }

  // ── RBAC 가드 ────────────────────────────────────────────
  // 인증된 사용자가 권한 없는 경로 진입 시 /dashboard 로 리다이렉트.
  // user_roles 조회 실패 시 admin 폴백 (MVP 1인 운영 가정).
  if (user) {
    const path = request.nextUrl.pathname;
    if (!path.startsWith("/api") && path !== "/dashboard") {
      let role: "admin" | "hr" | "finance" | "employee" = "admin";
      try {
        const { data } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          role = (data as { role?: typeof role }).role ?? "admin";
        }
      } catch {
        /* fail-soft */
      }
      if (!isPathAllowed(role, path)) {
        const target = request.nextUrl.clone();
        target.pathname = "/dashboard";
        target.search = "";
        return NextResponse.redirect(target);
      }
    }
  }

  return response;
}

/** Edge Runtime 호환 권한 매트릭스 (lib/rbac.ts 와 동기) */
const ROLE_ACCESS: Record<string, string[]> = {
  admin: ["*"],
  hr: [
    "/employees",
    "/attendance",
    "/leave",
    "/year-end",
    "/audit-logs",
    "/settings",
    "/risks",
    "/simulator",
    "/retirement",
    "/approvals",
    "/calendar",
    "/recruiting",
    "/activity",
    "/contracts",
    "/business-trips",
    "/revenue",
    "/executive",
  ],
  finance: [
    "/payroll",
    "/expenses",
    "/vendors",
    "/assets",
    "/closing",
    "/audit-logs",
    "/risks",
    "/simulator",
    "/retirement",
    "/approvals",
    "/calendar",
    "/recruiting",
    "/activity",
    "/contracts",
    "/business-trips",
    "/revenue",
    "/executive",
  ],
  employee: ["/leave", "/payroll", "/approvals"],
};

function isPathAllowed(role: string, path: string): boolean {
  const allowed = ROLE_ACCESS[role];
  if (!allowed) return true;
  if (allowed.includes("*")) return true;
  return allowed.some((p) => path === p || path.startsWith(`${p}/`));
}
