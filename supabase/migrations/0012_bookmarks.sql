-- ============================================================
-- 0012 — 사용자 즐겨찾기 (북마크)
--
-- 자주 쓰는 페이지/직원/거래처를 사이드바 하단에 핀처럼 노출.
-- 사용자별 격리 (user_id 기반 RLS).
-- ============================================================

CREATE TABLE IF NOT EXISTS chongmu.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('page', 'employee', 'vendor')),
  target text NOT NULL,         -- page: href / employee: id / vendor: id
  label text NOT NULL,
  icon text,                    -- lucide-react 아이콘 이름 (선택)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, target)
);

CREATE INDEX IF NOT EXISTS bookmarks_user_idx
  ON chongmu.bookmarks (user_id, created_at DESC);

ALTER TABLE chongmu.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self_bookmarks_all" ON chongmu.bookmarks;
CREATE POLICY "self_bookmarks_all"
  ON chongmu.bookmarks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.bookmarks TO authenticated;
GRANT ALL ON chongmu.bookmarks TO service_role;

NOTIFY pgrst, 'reload schema';
