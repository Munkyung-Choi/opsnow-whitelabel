-- =============================================================================
-- Migration: 20260418000002_fix_section_type_check
-- Ticket: WL-105 fix / WL-110 hotfix
-- Description: 20260417000003_add_section_type_check에서 누락된 'about', 'contact'
--              섹션 타입을 CHECK 제약에 추가.
--              trg_init_partner_defaults 트리거가 두 섹션을 contents에 INSERT하는데
--              기존 CHECK 목록에 없어 파트너 생성 자체가 차단되는 버그 수정.
-- Impact: LOCAL + CLOUD 모두 적용 필요 (20260417000003이 WL-115 push와 함께 적용됨)
-- =============================================================================

BEGIN;

ALTER TABLE public.contents
  DROP CONSTRAINT IF EXISTS contents_section_type_check;

ALTER TABLE public.contents
  ADD CONSTRAINT contents_section_type_check
  CHECK (section_type IN (
    'pain_points', 'stats', 'how_it_works', 'finops_automation',
    'core_engines', 'role_based_value', 'faq', 'final_cta',
    'hero', 'footer',
    'terms', 'privacy', 'cookie_policy',
    'about', 'contact'
  ));

COMMIT;
