import "server-only";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "hr" | "finance" | "employee";

/**
 * 현재 사용자의 역할 조회.
 * - chongmu.user_roles 에 매핑된 행 없으면 'admin' 으로 폴백 (MVP — 첫 사용자는 admin)
 * - 폴백은 v1.1 에서 'employee' 디폴트로 강화 예정
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "employee";

  const { data } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("user_roles" as any)
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return (((data as { role?: UserRole } | null)?.role as UserRole | undefined) ?? "admin") as UserRole;
}

/** 권한 매트릭스 — 역할별 접근 가능한 페이지 prefix */
const ROLE_ACCESS: Record<UserRole, string[]> = {
  admin: ["*"],
  hr: [
    "/dashboard",
    "/employees",
    "/attendance",
    "/leave",
    "/year-end",
    "/audit-logs",
    "/settings",
    "/risks",
    "/simulator",
    "/retirement",
  ],
  finance: [
    "/dashboard",
    "/payroll",
    "/expenses",
    "/vendors",
    "/assets",
    "/closing",
    "/audit-logs",
    "/risks",
    "/simulator",
    "/retirement",
  ],
  employee: ["/dashboard", "/leave", "/payroll"],
};

export function canAccess(role: UserRole, path: string): boolean {
  const allowed = ROLE_ACCESS[role];
  if (allowed.includes("*")) return true;
  return allowed.some((p) => path === p || path.startsWith(`${p}/`));
}
