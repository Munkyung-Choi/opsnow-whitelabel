-- WL-150: partners.features JSONB shape CHECK 제약 (Layer 2 — 최후의 보루)
-- Track: HIGH (Auditor 취약점 1 대응으로 NOT VALID + VALIDATE 2단계 채택)
-- Cloud Pre-flight 실증: 2026-04-22 0건 확인 → 기존 데이터 위반 없음
--
-- 설계 근거:
-- - Jira 원안은 CHECK 내 서브쿼리 사용 → PostgreSQL "CHECK expressions cannot contain subqueries"
--   규칙 위반으로 실행 불가. IMMUTABLE 함수로 우회하여 내부에 jsonb_each 격리.
-- - NOT VALID + VALIDATE 2단계: 기존 행 검증 실패 시 마이그레이션 전체 롤백 방지
--   (Cloud Pre-flight로 0건 실증했으나 방어적 구조 유지 — 향후 재생 시에도 안전)
--
-- ⚠️ FEATURE_KEYS 확장 시 아래 3곳을 동기 수정 필요 (DEBT-012):
--   1. src/lib/features/features-schema.ts — FEATURE_KEYS 배열 + FeaturesSchema
--   2. 이 파일 — is_valid_partner_features() 함수 내 NOT IN 목록
--   3. 20260422000002_update_partner_feature_fn_allowlist.sql — p_feature_key NOT IN 목록

CREATE OR REPLACE FUNCTION public.is_valid_partner_features(f jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public
AS $$
  SELECT
    jsonb_typeof(f) = 'object'
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_each(f) AS e(key, value)
      WHERE e.key NOT IN ('custom_domain', 'analytics', 'multi_locale')
         OR jsonb_typeof(e.value) != 'boolean'
    );
$$;

COMMENT ON FUNCTION public.is_valid_partner_features(jsonb) IS
  'WL-150: partners.features JSONB shape 검증. IMMUTABLE + search_path 고정으로 CHECK 제약 안전 사용.';

ALTER TABLE public.partners
  ADD CONSTRAINT partners_features_shape
  CHECK (public.is_valid_partner_features(features)) NOT VALID;

ALTER TABLE public.partners
  VALIDATE CONSTRAINT partners_features_shape;
