-- ================================================================
-- supabase/seeds/partner_c_seed.sql
-- Partner-C (GreenCloud) 전체 상태 동기화
--
-- ⚠️  임시 조치 안내 (2026-04-16)
-- 이 파일은 Admin UI 파트너 온보딩 기능 완성 전까지만 사용하는 임시 수단입니다.
-- Admin UI 완성 후에는 파트너 생성 → 트리거 자동 초기화 → Admin에서 콘텐츠 편집
-- 으로 대체됩니다. 관련 티켓: WL-106
--
-- 전제: partner-c가 DB에 없다면 먼저 아래를 실행
-- 1. Supabase Dashboard → Auth → Users → [Add user]
--    Email: admin@partner-c.com  Confirm User: ✓
-- 2. 생성된 UID로 아래 주석 해제 후 실행:
--
-- INSERT INTO public.partners (owner_id, business_name, subdomain, theme_key, default_locale, published_locales, is_active)
-- VALUES ('<uid_here>', 'GreenCloud', 'partner-c', 'green', 'ko', ARRAY['ko','en']::TEXT[], true)
-- ON CONFLICT (subdomain) DO NOTHING;
--
-- 멱등성: ON CONFLICT DO UPDATE — 몇 번 실행해도 안전
-- ================================================================


-- ================================================================
-- 1. partners
-- ================================================================

UPDATE public.partners
SET
  business_name     = 'GreenCloud',
  theme_key         = 'green',
  default_locale    = 'ko',
  published_locales = ARRAY['ko', 'en']::TEXT[],
  is_active         = true
WHERE subdomain = 'partner-c';

SELECT subdomain, business_name, theme_key, default_locale, published_locales
FROM public.partners WHERE subdomain = 'partner-c';


-- ================================================================
-- 2. partner_sections
-- ================================================================

INSERT INTO public.partner_sections (partner_id, section_type, is_visible, display_order)
SELECT p.id, s.section_type, s.is_visible, s.display_order
FROM public.partners p
CROSS JOIN (VALUES
  ('pain_points'::text,     true::boolean, 1::int),
  ('stats',                 true,          2),
  ('how_it_works',          true,          3),
  ('finops_automation',     true,          4),
  ('core_engines',          true,          5),
  ('role_based_value',      true,          6),
  ('faq',                   true,          7),
  ('final_cta',             true,          8)
) AS s(section_type, is_visible, display_order)
WHERE p.subdomain = 'partner-c'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET is_visible = EXCLUDED.is_visible, display_order = EXCLUDED.display_order;


-- ================================================================
-- 3. contents
-- ================================================================

-- hero
INSERT INTO public.contents (partner_id, section_type, title, subtitle, is_published)
SELECT p.id, 'hero',
  '{"ko": "클라우드 비용, {PartnerName}으로 절감하세요", "en": "Reduce Cloud Costs with {PartnerName}"}'::jsonb,
  '{"ko": "지금 바로 시작하면 첫 달 무료", "en": "Start today — first month free"}'::jsonb,
  true
FROM public.partners p WHERE p.subdomain = 'partner-c'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, is_published = true, updated_at = now();

-- stats (partner-c 전용 수치: 35% · 4분 · 99.8%)
INSERT INTO public.contents (partner_id, section_type, title, body, is_published)
SELECT p.id, 'stats',
  '{"ko": "데이터가 증명하는 {PartnerName}의 실제 성과", "en": "{PartnerName} Results by Numbers"}'::jsonb,
  '[
    {
      "value": "35%",
      "unit":   {"ko": "평균",    "en": "avg"},
      "label":  {"ko": "연간 클라우드 비용 절감", "en": "Annual Cloud Cost Reduction"},
      "detail": {"ko": "GreenCloud 고객사 평균 기준", "en": "Based on GreenCloud customer average"}
    },
    {
      "value": "4",
      "unit":   {"ko": "분 이내", "en": "min"},
      "label":  {"ko": "초기 설정 완료", "en": "Initial Setup Complete"},
      "detail": {"ko": "간편한 API 연동", "en": "Simple API integration"}
    },
    {
      "value": "99.8%",
      "unit":   {"ko": "SLA", "en": "SLA"},
      "label":  {"ko": "서비스 가용성 보장", "en": "Service Availability Guarantee"},
      "detail": {"ko": "친환경 그린 인프라 운영", "en": "Eco-friendly green infrastructure"}
    }
  ]'::jsonb,
  true
FROM public.partners p WHERE p.subdomain = 'partner-c'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET title = EXCLUDED.title, body = EXCLUDED.body, is_published = true, updated_at = now();

-- how_it_works
INSERT INTO public.contents (partner_id, section_type, title, subtitle, body, is_published)
SELECT p.id, 'how_it_works',
  '{"ko": "{PartnerName} 시작하기", "en": "How {PartnerName} Works"}'::jsonb,
  '{"ko": "3단계로 클라우드 비용을 최적화하세요", "en": "Optimize cloud costs in 3 steps"}'::jsonb,
  '[
    {"step":1,"title":"Connect","subtitle":{"ko":"클라우드 계정 연결","en":"Cloud Account Connection"},"description":{"ko":"AWS, Azure, GCP를 빠르게 연동합니다.","en":"Quickly connect AWS, Azure, GCP."},"iconName":"Link"},
    {"step":2,"title":"Diagnose","subtitle":{"ko":"AI 비용 진단","en":"AI Cost Diagnosis"},"description":{"ko":"AI가 전체 리소스를 자동 스캔합니다.","en":"AI automatically scans all resources."},"iconName":"ScanSearch"},
    {"step":3,"title":"Automate","subtitle":{"ko":"자동 절감 실행","en":"Automated Savings"},"description":{"ko":"정책에 따라 절감을 자동 실행합니다.","en":"Automatically execute savings per policies."},"iconName":"Zap"}
  ]'::jsonb,
  true
FROM public.partners p WHERE p.subdomain = 'partner-c'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, body = EXCLUDED.body, is_published = true, updated_at = now();

-- faq / final_cta / about / contact / footer
INSERT INTO public.contents (partner_id, section_type, title, subtitle, is_published)
SELECT p.id, s.section_type, s.title::jsonb, s.subtitle::jsonb, true
FROM public.partners p
CROSS JOIN (VALUES
  ('faq'::text,   '{"ko":"자주 묻는 질문","en":"Frequently Asked Questions"}',                       NULL::text),
  ('final_cta',   '{"ko":"{PartnerName}와 함께 시작하세요","en":"Get Started with {PartnerName}"}',  '{"ko":"지금 바로 무료로 연동해보세요","en":"Connect for free today"}'),
  ('about',       '{"ko":"{PartnerName} 소개","en":"About {PartnerName}"}',                           NULL),
  ('contact',     '{"ko":"문의하기","en":"Contact Us"}',                                              NULL)
) AS s(section_type, title, subtitle)
WHERE p.subdomain = 'partner-c'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, is_published = true, updated_at = now();

INSERT INTO public.contents (partner_id, section_type, is_published)
SELECT p.id, 'footer', true FROM public.partners p WHERE p.subdomain = 'partner-c'
ON CONFLICT (partner_id, section_type) DO NOTHING;

INSERT INTO public.contents (partner_id, section_type, title, is_published)
SELECT p.id, s.section_type, s.title::jsonb, false
FROM public.partners p
CROSS JOIN (VALUES
  ('terms'::text,   '{"ko":"{PartnerName} 이용약관","en":"{PartnerName} Terms of Service"}'),
  ('privacy',       '{"ko":"{PartnerName} 개인정보 처리방침","en":"{PartnerName} Privacy Policy"}'),
  ('cookie_policy', '{"ko":"{PartnerName} 쿠키 정책","en":"{PartnerName} Cookie Policy"}')
) AS s(section_type, title)
WHERE p.subdomain = 'partner-c'
ON CONFLICT (partner_id, section_type) DO NOTHING;


-- ================================================================
-- 4. 검증
-- ================================================================

SELECT p.subdomain, p.business_name, p.theme_key, p.published_locales,
  (SELECT COUNT(*) FROM partner_sections ps WHERE ps.partner_id = p.id) AS sections,
  (SELECT COUNT(*) FROM contents c WHERE c.partner_id = p.id AND c.is_published = true) AS published,
  (SELECT COUNT(*) FROM contents c WHERE c.partner_id = p.id AND c.is_published = false) AS drafts
FROM public.partners p WHERE p.subdomain = 'partner-c';
