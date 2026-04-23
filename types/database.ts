/**
 * Supabase 타입 — Phase 1에서 `supabase gen types typescript` 명령으로 자동 생성 예정.
 * 현재는 빌드 통과용 최소 placeholder.
 * @see https://supabase.com/docs/guides/api/rest/generating-types
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
