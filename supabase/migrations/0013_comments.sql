-- ============================================================
-- 0013 — 댓글 + @멘션 시스템
--
-- 결재 / 지출 / 자산 / 직원 등 모든 entity 에 댓글 가능.
-- @멘션은 ARRAY 컬럼 (이메일 또는 직원 id 배열).
-- ============================================================

CREATE TABLE IF NOT EXISTS chongmu.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN (
    'approval_request',
    'expense',
    'asset',
    'employee',
    'vendor',
    'leave_request',
    'closing_history'
  )),
  entity_id text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_email text NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  mentions text[] NOT NULL DEFAULT '{}',
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_entity_idx
  ON chongmu.comments (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_author_idx
  ON chongmu.comments (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_mentions_idx
  ON chongmu.comments USING GIN (mentions);

ALTER TABLE chongmu.comments ENABLE ROW LEVEL SECURITY;

-- 인증된 모든 사용자 SELECT/INSERT 가능
DROP POLICY IF EXISTS "auth_comments_read" ON chongmu.comments;
CREATE POLICY "auth_comments_read"
  ON chongmu.comments
  FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_comments_insert" ON chongmu.comments;
CREATE POLICY "auth_comments_insert"
  ON chongmu.comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- 본인 댓글만 수정·삭제 가능
DROP POLICY IF EXISTS "self_comments_modify" ON chongmu.comments;
CREATE POLICY "self_comments_modify"
  ON chongmu.comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "self_comments_delete" ON chongmu.comments;
CREATE POLICY "self_comments_delete"
  ON chongmu.comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON chongmu.comments TO authenticated;
GRANT ALL ON chongmu.comments TO service_role;

NOTIFY pgrst, 'reload schema';
