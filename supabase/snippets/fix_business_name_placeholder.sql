-- =============================================================================
-- Hotfix: {business_name} → {PartnerName} 플레이스홀더 교정
-- 원인: 20260415000001 마이그레이션이 잘못된 토큰({business_name})을 사용.
--       interpolateString 엔진의 실제 토큰은 {PartnerName}.
-- 실행: Supabase SQL Editor (service_role)
-- 멱등성: {business_name}이 없는 행은 WHERE 조건으로 자동 제외됨.
-- =============================================================================

UPDATE public.contents
SET
  title    = REPLACE(title,    '{business_name}', '{PartnerName}'),
  subtitle = REPLACE(subtitle, '{business_name}', '{PartnerName}'),
  cta_text = REPLACE(cta_text, '{business_name}', '{PartnerName}'),
  updated_at = NOW()
WHERE
  title    LIKE '%{business_name}%'
  OR subtitle LIKE '%{business_name}%'
  OR cta_text LIKE '%{business_name}%';

-- 검증: 잔존하는 {business_name} 확인 (0건이어야 정상)
SELECT id, partner_id, section_type, title
FROM public.contents
WHERE
  title    LIKE '%{business_name}%'
  OR subtitle LIKE '%{business_name}%'
  OR cta_text LIKE '%{business_name}%';
