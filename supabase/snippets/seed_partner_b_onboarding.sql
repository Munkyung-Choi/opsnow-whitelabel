-- ================================================================
-- WL-105: partner-b 온보딩 SQL
-- 실행 주체: Supabase SQL Editor (문경 님 직접 실행)
-- 작성일: 2026-04-16
--
-- 사전 조건:
--   Supabase Dashboard → Authentication → Users → [Add user]
--   Email: admin@partner-b.com  Password: (임의)  Confirm User: ✓
--   생성된 User UID를 복사하여 아래 <partner_b_owner_uid> 교체
--
-- 멱등성: ON CONFLICT DO NOTHING — 중복 실행 안전
--
-- 트리거 효과 (fn_init_partner_defaults):
--   INSERT 즉시 자동 생성:
--     - partner_sections 8개 (pain_points ~ final_cta, is_visible=true)
--     - contents 11개 (마케팅 8개 is_published=true + 법적 3개 is_published=false)
-- ================================================================


-- ── Step 1: partner-b 파트너 생성 ─────────────────────────────────────────────
INSERT INTO public.partners (
  owner_id,
  business_name,
  subdomain,
  is_active,
  theme_key,
  default_locale,
  published_locales
)
VALUES (
  '<partner_b_owner_uid>',   -- ← admin@partner-b.com 계정 UID로 교체
  'DataFlow',                -- E2E M-1-2 참조값 (partner-a는 'CloudSave')
  'partner-b',
  true,
  'blue',                    -- E2E M-1-4: --primary '234 100% 36%' (partner-a는 'gray')
  'en',                      -- partner-a(ko)와 다른 default_locale → locale 격리 강화
  ARRAY['ko', 'en']::TEXT[]
)
ON CONFLICT (subdomain) DO NOTHING;


-- ── Step 2: profiles 등록 (partner_admin 역할 부여) ────────────────────────────
-- contents_partner_admin_write, partners_partner_admin_select 정책이
-- profiles.role = 'partner_admin' 대신 partners.owner_id = auth.uid()로 동작하므로
-- RLS 격리 자체는 profiles 없이도 작동함.
-- 단, 어드민 대시보드 기능(WL 어드민) 사용 시 아래 INSERT가 필요:
--
-- INSERT INTO public.profiles (id, role, partner_id)
-- SELECT
--   '<partner_b_owner_uid>',
--   'partner_admin',
--   (SELECT id FROM public.partners WHERE subdomain = 'partner-b')
-- ON CONFLICT (id) DO NOTHING;


-- ── Step 3: 트리거 작동 검증 ──────────────────────────────────────────────────
-- 실행 후 아래 SELECT로 자동 초기화 결과 확인:
SELECT
  p.subdomain,
  p.business_name,
  p.theme_key,
  p.default_locale,
  (SELECT COUNT(*) FROM partner_sections ps WHERE ps.partner_id = p.id) AS sections_count,
  (SELECT COUNT(*) FROM contents c WHERE c.partner_id = p.id)           AS contents_count
FROM partners p
WHERE p.subdomain = 'partner-b';
-- 기대:
--   sections_count = 8   (pain_points ~ final_cta)
--   contents_count = 11  (마케팅 8 + 법적 3)
