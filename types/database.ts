/**
 * Supabase 타입 — chongmu 스키마 대상.
 * 빌드 통과용 placeholder. 실제 사용 전:
 *   npx supabase gen types typescript --linked --schema chongmu > types/database.ts
 * @see https://supabase.com/docs/guides/api/rest/generating-types
 */
export type Database = {
  chongmu: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
