-- ============================================================
-- 0005 — 영수증 업로드용 Storage 버킷
--
-- Phase 5.1.2 — 지출 등록 시 영수증 이미지/PDF를 Supabase Storage에 저장.
-- bucket_id = 'receipts' · public read (URL은 UUID 경로로 obscure)
-- 업로드/수정/삭제는 authenticated 권한만.
--
-- Production 강화 시:
--   - public=false + signed URL 사용 (만료 1h)
--   - bucket-level CORS 설정
--   - 파일 size·MIME 제한은 클라이언트에서 5MB / image+pdf로 강제 (ExpenseForm)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 인증된 사용자만 업로드/수정/삭제. 읽기는 public이므로 SELECT 정책 불필요.
DROP POLICY IF EXISTS "auth_insert_receipts" ON storage.objects;
CREATE POLICY "auth_insert_receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "auth_update_receipts" ON storage.objects;
CREATE POLICY "auth_update_receipts"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "auth_delete_receipts" ON storage.objects;
CREATE POLICY "auth_delete_receipts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts');
