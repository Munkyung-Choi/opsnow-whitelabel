-- =============================================================================
-- Migration: 20260415000001_normalize_partner_content.sql
-- Ticket: WL-83 (follow-up) / WL-64
-- Approved by: 문경 님 — 실행 전 반드시 승인 확인
-- Description:
--   전체 활성 파트너의 데이터를 정규화한다.
--   1. partner_sections — 마케팅 8개 섹션 누락 row 보완
--   2. contents (마케팅) — 파트너별 섹션 row 및 title 기본값 보장
--   3. contents (법적 고지) — terms / privacy / cookie_policy 분리 보장
--
-- 멱등성 보장 전략:
--   INSERT: ON CONFLICT DO NOTHING (기존 데이터 덮어쓰기 없음)
--   UPDATE: WHERE title IS NULL (값이 있는 행은 건드리지 않음)
--
-- 실행 방법: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
-- 주의: service_role 키로 실행되므로 RLS 우회됨. 문경 님 직접 실행 필수.
-- =============================================================================


-- =============================================================================
-- PART 1: partner_sections 정규화
-- 모든 활성 파트너에게 마케팅 8개 섹션 row가 존재하도록 보장.
-- DO NOTHING: 어드민이 의도적으로 is_visible=false 설정한 경우 보존.
-- =============================================================================

INSERT INTO public.partner_sections (partner_id, section_type, is_visible, display_order)
SELECT
  p.id          AS partner_id,
  s.section_type,
  true          AS is_visible,
  s.display_order
FROM public.partners p
CROSS JOIN (VALUES
  ('pain_points'::text,    1),
  ('stats',                2),
  ('how_it_works',         3),
  ('finops_automation',    4),
  ('core_engines',         5),
  ('role_based_value',     6),
  ('faq',                  7),
  ('final_cta',            8)
) AS s(section_type, display_order)
WHERE p.is_active = true
ON CONFLICT (partner_id, section_type) DO NOTHING;

-- 검증: 파트너별 섹션 수 확인 (모두 8이어야 함)
-- SELECT partner_id, COUNT(*) FROM partner_sections GROUP BY partner_id;


-- =============================================================================
-- PART 2: contents (마케팅 섹션) 정규화
-- 활성 파트너별로 마케팅 섹션 row가 없으면 기본값으로 INSERT.
-- title은 i18n JSON 형식 {"ko": "...", "en": "..."} 으로 저장.
-- {PartnerName}은 app 레이어(interpolateString)에서 치환됨 — DB에 그대로 저장.
-- is_published=true: 마케팅 섹션은 코드 DEFAULT로 즉시 렌더링 가능.
-- =============================================================================

INSERT INTO public.contents (partner_id, section_type, title, subtitle, is_published)
SELECT
  p.id AS partner_id,
  s.section_type,
  s.default_title,
  s.default_subtitle,
  true AS is_published
FROM public.partners p
CROSS JOIN (VALUES
  (
    'hero'::text,
    '{"ko": "클라우드 비용, {PartnerName}으로 절감하세요", "en": "Reduce Cloud Costs with {PartnerName}"}',
    '{"ko": "지금 바로 시작하면 첫 달 무료", "en": "Start today — first month free"}'
  ),
  (
    'stats',
    '{"ko": "데이터가 증명하는 {PartnerName}의 실제 성과", "en": "{PartnerName} Results by Numbers"}',
    NULL
  ),
  (
    'how_it_works',
    '{"ko": "{PartnerName} 시작하기", "en": "How {PartnerName} Works"}',
    '{"ko": "3단계로 클라우드 비용을 최적화하세요", "en": "Optimize cloud costs in 3 steps"}'
  ),
  (
    'faq',
    '{"ko": "자주 묻는 질문", "en": "Frequently Asked Questions"}',
    NULL
  ),
  (
    'final_cta',
    '{"ko": "{PartnerName}와 함께 시작하세요", "en": "Get Started with {PartnerName}"}',
    '{"ko": "지금 바로 무료로 연동해보세요", "en": "Connect for free today"}'
  ),
  (
    'about',
    '{"ko": "{PartnerName} 소개", "en": "About {PartnerName}"}',
    NULL
  ),
  (
    'contact',
    '{"ko": "문의하기", "en": "Contact Us"}',
    NULL
  ),
  (
    'footer',
    NULL,
    NULL
  )
) AS s(section_type, default_title, default_subtitle)
WHERE p.is_active = true
ON CONFLICT (partner_id, section_type) DO NOTHING;


-- =============================================================================
-- PART 2-B: title IS NULL인 기존 마케팅 섹션 행에 표준 타이틀 적용
-- 이미 content가 있지만 title만 누락된 파트너(partner-c, d 등)를 대상으로 함.
-- title이 있는 행은 건드리지 않음.
-- =============================================================================

UPDATE public.contents
SET
  title      = tmpl.default_title,
  updated_at = NOW()
FROM (VALUES
  ('stats'::text,      '{"ko": "데이터가 증명하는 {PartnerName}의 실제 성과", "en": "{PartnerName} Results by Numbers"}'),
  ('how_it_works',     '{"ko": "{PartnerName} 시작하기", "en": "How {PartnerName} Works"}'),
  ('faq',              '{"ko": "자주 묻는 질문", "en": "Frequently Asked Questions"}'),
  ('final_cta',        '{"ko": "{PartnerName}와 함께 시작하세요", "en": "Get Started with {PartnerName}"}'),
  ('hero',             '{"ko": "클라우드 비용, {PartnerName}으로 절감하세요", "en": "Reduce Cloud Costs with {PartnerName}"}'),
  ('about',            '{"ko": "{PartnerName} 소개", "en": "About {PartnerName}"}'),
  ('contact',          '{"ko": "문의하기", "en": "Contact Us"}')
) AS tmpl(section_type, default_title)
WHERE public.contents.section_type = tmpl.section_type
  AND public.contents.title IS NULL;


-- =============================================================================
-- PART 3: contents (법적 고지) 정규화
-- 이용약관(terms) / 개인정보 처리방침(privacy) / 쿠키 정책(cookie_policy)
-- 파트너별로 완전히 분리된 row로 저장.
-- is_published=false: 법적 문서는 내용 없이 발행 불가 — 어드민이 직접 작성 후 발행.
-- =============================================================================

INSERT INTO public.contents (partner_id, section_type, title, is_published)
SELECT
  p.id AS partner_id,
  s.section_type,
  s.default_title,
  false AS is_published   -- 초안 상태: 어드민이 본문 작성 후 직접 발행
FROM public.partners p
CROSS JOIN (VALUES
  (
    'terms'::text,
    '{"ko": "{PartnerName} 이용약관", "en": "{PartnerName} Terms of Service"}'
  ),
  (
    'privacy',
    '{"ko": "{PartnerName} 개인정보 처리방침", "en": "{PartnerName} Privacy Policy"}'
  ),
  (
    'cookie_policy',
    '{"ko": "{PartnerName} 쿠키 정책", "en": "{PartnerName} Cookie Policy"}'
  )
) AS s(section_type, default_title)
WHERE p.is_active = true
ON CONFLICT (partner_id, section_type) DO NOTHING;

-- 법적 문서 title IS NULL 보완 (기존 행)
UPDATE public.contents
SET
  title      = tmpl.default_title,
  updated_at = NOW()
FROM (VALUES
  ('terms'::text,    '{"ko": "{PartnerName} 이용약관", "en": "{PartnerName} Terms of Service"}'),
  ('privacy',        '{"ko": "{PartnerName} 개인정보 처리방침", "en": "{PartnerName} Privacy Policy"}'),
  ('cookie_policy',  '{"ko": "{PartnerName} 쿠키 정책", "en": "{PartnerName} Cookie Policy"}')
) AS tmpl(section_type, default_title)
WHERE public.contents.section_type = tmpl.section_type
  AND public.contents.title IS NULL;


-- =============================================================================
-- 실행 후 검증 쿼리 (SQL Editor에서 별도 실행)
-- =============================================================================

-- 1) partner_sections: 파트너별 섹션 수 (모두 8이어야 정상)
-- SELECT p.subdomain, COUNT(ps.id) AS section_count
-- FROM partners p
-- LEFT JOIN partner_sections ps ON ps.partner_id = p.id
-- WHERE p.is_active = true
-- GROUP BY p.subdomain
-- ORDER BY p.subdomain;

-- 2) contents: 파트너별 섹션 row 현황
-- SELECT p.subdomain, c.section_type, c.is_published,
--        CASE WHEN c.title IS NULL THEN '⚠ NULL' ELSE '✓' END AS title_status
-- FROM partners p
-- LEFT JOIN contents c ON c.partner_id = p.id
-- WHERE p.is_active = true
-- ORDER BY p.subdomain, c.section_type;

-- 3) cookie_policy 신규 row 확인
-- SELECT p.subdomain, c.section_type, c.is_published
-- FROM partners p
-- JOIN contents c ON c.partner_id = p.id
-- WHERE c.section_type = 'cookie_policy'
-- ORDER BY p.subdomain;
