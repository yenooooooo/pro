import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 .env.local에 설정되지 않았습니다. Phase 1에서 Supabase 프로젝트를 만든 뒤 .env.example을 복사해 채워 주세요.",
    );
  }
  return createBrowserClient<Database>(url, anonKey, {
    db: { schema: "chongmu" },
  });
}
