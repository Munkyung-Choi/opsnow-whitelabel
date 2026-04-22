-- WL-150: update_partner_feature RPC allowlist 방어 + jsonb_build_object 재구성 (Layer 1)
-- Track: HIGH
-- Cloud Pre-flight 실증: 2026-04-22 0건 확인 → legacy key 부재, Trap 형성 불가
--
-- ⚠️ 이 파일은 20260419000007_update_partner_feature_fn.sql의 본문을 치환한다.
-- 20260419000007은 원본 상태로 유지 (CLAUDE.md 2026-04-08 운영 규칙).
-- 신규 환경 초기화 시 두 파일이 순서대로 재생되어 최종적으로 allowlist 적용된 본문이 된다.
--
-- 설계 근거 (Auditor 취약점 3 대응):
-- - `||` 병합은 legacy key 보유 행에서 정상 작업을 영구 차단(Trap) 위험
-- - `jsonb_build_object` 재구성은 호출 시 해당 파트너 row를 allowlist 3 key로만 재작성
--   → "인스턴스 기반의 점진적 데이터 정제" 효과 (RPC 호출된 파트너만 정제, 전역 아님)
-- - RPC IF 가드는 CHECK 제약이 감지하지 못하는 특정 에러 메시지 품질을 제공 (Defense in Depth)
--
-- ⚠️ FEATURE_KEYS 확장 시 아래 3곳을 동기 수정 필요 (DEBT-012):
--   1. src/lib/features/features-schema.ts — FEATURE_KEYS 배열 + FeaturesSchema
--   2. 20260422000001_partners_features_check.sql — is_valid_partner_features() NOT IN
--   3. 이 파일 — IF NOT IN 절 + jsonb_build_object 항목

CREATE OR REPLACE FUNCTION public.update_partner_feature(
  p_partner_id UUID,
  p_feature_key TEXT,
  p_enabled BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Layer 1 allowlist — 명시적 RAISE EXCEPTION으로 에러 메시지 품질 확보
  IF p_feature_key NOT IN ('custom_domain', 'analytics', 'multi_locale') THEN
    RAISE EXCEPTION 'Invalid feature key: %. Allowed: custom_domain, analytics, multi_locale', p_feature_key
      USING ERRCODE = 'check_violation';
  END IF;

  -- jsonb_build_object 재구성 — 호출 시점에 해당 파트너 row의 features를 allowlist 3 key로 재작성
  -- 효과: legacy key 자동 prune (호출된 파트너에 한함), 향후 CHECK 위반 Trap 원천 차단
  UPDATE public.partners
  SET features = jsonb_build_object(
        'custom_domain', CASE WHEN p_feature_key = 'custom_domain' THEN to_jsonb(p_enabled)
                              ELSE COALESCE(features->'custom_domain', 'false'::jsonb) END,
        'analytics',     CASE WHEN p_feature_key = 'analytics'     THEN to_jsonb(p_enabled)
                              ELSE COALESCE(features->'analytics', 'false'::jsonb) END,
        'multi_locale',  CASE WHEN p_feature_key = 'multi_locale'  THEN to_jsonb(p_enabled)
                              ELSE COALESCE(features->'multi_locale', 'false'::jsonb) END
      ),
      updated_at = NOW()
  WHERE id = p_partner_id;
END;
$$;

COMMENT ON FUNCTION public.update_partner_feature(UUID, TEXT, BOOLEAN) IS
  'WL-150: Layer 1 allowlist + jsonb_build_object pruning. 호출 시 파트너 row의 features를 allowlist 3 key로 재구성 (점진적 정제).';
