-- WL-125: 파트너 자산 Storage 버킷 + 접근 정책 (Critical)
--
-- 설계 근거: Confluence 4.2 §3 (Storage 정책 SSOT), Auditor HIGH·MEDIUM 지적 전량 반영.
--
-- 주요 설계 결정:
--   1) 버킷 2개 분리 — Defense in Depth (파비콘 512KB 제약 DB 레벨 강제)
--   2) SVG 미허용 — Stored XSS 방어 (필요 시 별도 티켓으로 DOMPurify 선행)
--   3) 경로 정규식 WITH CHECK — master_admin도 예외 없이 UUID+type+ext 규약 강제
--   4) UPDATE USING + WITH CHECK 모두 명시 — 크로스테넌트 rename 공격 차단 (WL-122 선례)
--   5) 기존 파트너 격리 패턴(`partners.owner_id = auth.uid()` 서브쿼리) 사용 — 삼중 SSOT 진입 회피
--
-- MIME 목록은 src/lib/storage/partner-asset.schema.ts와 동기화 필수.
-- 변경 시 양쪽 모두 업데이트.

BEGIN;

-- ============================================================
-- [1] 버킷 2개 생성 (멱등성 보장)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'partner-logos',
    'partner-logos',
    true,  -- public: 마케팅 사이트 인증 없이 SELECT
    2097152,  -- 2MB
    ARRAY['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'partner-favicons',
    'partner-favicons',
    true,
    524288,  -- 512KB
    ARRAY['image/x-icon', 'image/vnd.microsoft.icon', 'image/png']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ============================================================
-- [2] Storage RLS 정책 (storage.objects)
-- ============================================================

-- SELECT: anon 포함 모두 읽기 허용 (public 버킷)
DROP POLICY IF EXISTS "partner_assets_public_read" ON storage.objects;
CREATE POLICY "partner_assets_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('partner-logos', 'partner-favicons'));


-- INSERT: partner_admin은 자사 경로만, master_admin은 규약 준수 시 전체
-- 경로 규약: {partner_uuid}/{logo|favicon}.{png|jpg|jpeg|webp|ico}
DROP POLICY IF EXISTS "partner_assets_admin_insert" ON storage.objects;
CREATE POLICY "partner_assets_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('partner-logos', 'partner-favicons')
    AND array_length(storage.foldername(name), 1) = 1
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(logo|favicon)\.(png|jpg|jpeg|webp|ico)$'
    AND (
      get_my_role() = 'master_admin'
      OR (
        get_my_role() = 'partner_admin'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.partners WHERE owner_id = auth.uid()
        )
      )
    )
  );


-- UPDATE: USING(수정 전 검증) + WITH CHECK(수정 후 검증) 모두 명시
-- WITH CHECK 없으면 rename으로 크로스테넌트 이동 공격 가능 (WL-122 선례)
DROP POLICY IF EXISTS "partner_assets_admin_update" ON storage.objects;
CREATE POLICY "partner_assets_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('partner-logos', 'partner-favicons')
    AND (
      get_my_role() = 'master_admin'
      OR (
        get_my_role() = 'partner_admin'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.partners WHERE owner_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    bucket_id IN ('partner-logos', 'partner-favicons')
    AND array_length(storage.foldername(name), 1) = 1
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(logo|favicon)\.(png|jpg|jpeg|webp|ico)$'
    AND (
      get_my_role() = 'master_admin'
      OR (
        get_my_role() = 'partner_admin'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.partners WHERE owner_id = auth.uid()
        )
      )
    )
  );


-- DELETE: 본인 경로만 삭제 가능
DROP POLICY IF EXISTS "partner_assets_admin_delete" ON storage.objects;
CREATE POLICY "partner_assets_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('partner-logos', 'partner-favicons')
    AND (
      get_my_role() = 'master_admin'
      OR (
        get_my_role() = 'partner_admin'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.partners WHERE owner_id = auth.uid()
        )
      )
    )
  );

COMMIT;
