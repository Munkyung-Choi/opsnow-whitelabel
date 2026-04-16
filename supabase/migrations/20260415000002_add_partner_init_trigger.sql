-- =============================================================================
-- Migration: 20260415000002_add_partner_init_trigger.sql
-- Ticket: WL-86
-- Approved by: 문경 님 — 2026-04-15
-- Description:
--   partners 테이블에 신규 row가 INSERT될 때 자동으로 기본 데이터를 초기화하는
--   트리거를 등록한다.
--
--   생성 대상:
--     1. partner_sections — 마케팅 8개 섹션 (is_visible=true)
--     2. contents (마케팅) — hero/stats/how_it_works/faq/final_cta/about/contact/footer
--     3. contents (법적 고지) — terms/privacy/cookie_policy (is_published=false)
--
--   멱등성:
--     - 함수/트리거: CREATE OR REPLACE / DROP IF EXISTS
--     - INSERT: ON CONFLICT DO NOTHING — 수동 생성 row·기존 파트너 보존
--
--   보안:
--     - SECURITY DEFINER: anon RLS가 partner_sections INSERT를 막으므로
--       트리거 함수는 정의자(postgres) 권한으로 실행 (trg_sync_domain_to_partner 동일 패턴)
--     - SET search_path = public: Schema Injection 방어
--     - REVOKE EXECUTE FROM PUBLIC: 직접 함수 호출 차단, 트리거 경로만 허용
--
--   실행 방법: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
--   주의: 문경 님 직접 실행 필수.
-- =============================================================================


-- =============================================================================
-- STEP 1: 트리거 함수 생성
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_init_partner_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  -- -------------------------------------------------------------------
  -- 1. partner_sections: 마케팅 8개 섹션
  --    CHECK 제약 허용 목록과 정확히 일치. 순서 변경 시 CHECK 제약도 함께 확인할 것.
  -- -------------------------------------------------------------------
  INSERT INTO public.partner_sections (partner_id, section_type, is_visible, display_order)
  VALUES
    (NEW.id, 'pain_points',       true, 1),
    (NEW.id, 'stats',             true, 2),
    (NEW.id, 'how_it_works',      true, 3),
    (NEW.id, 'finops_automation',  true, 4),
    (NEW.id, 'core_engines',      true, 5),
    (NEW.id, 'role_based_value',  true, 6),
    (NEW.id, 'faq',               true, 7),
    (NEW.id, 'final_cta',         true, 8)
  ON CONFLICT (partner_id, section_type) DO NOTHING;

  -- -------------------------------------------------------------------
  -- 2. contents: 마케팅 섹션 (is_published=true — 즉시 렌더링 가능)
  --    {PartnerName} 토큰은 앱 레이어(interpolateString)에서 치환됨.
  --    i18n 형식: {"ko": "...", "en": "..."} — TEXT 컬럼에 JSON 문자열로 저장.
  -- -------------------------------------------------------------------
  INSERT INTO public.contents (partner_id, section_type, title, subtitle, is_published)
  VALUES
    (
      NEW.id, 'hero',
      '{"ko": "클라우드 비용, {PartnerName}으로 절감하세요", "en": "Reduce Cloud Costs with {PartnerName}"}',
      '{"ko": "지금 바로 시작하면 첫 달 무료", "en": "Start today — first month free"}',
      true
    ),
    (
      NEW.id, 'stats',
      '{"ko": "데이터가 증명하는 {PartnerName}의 실제 성과", "en": "{PartnerName} Results by Numbers"}',
      NULL,
      true
    ),
    (
      NEW.id, 'how_it_works',
      '{"ko": "{PartnerName} 시작하기", "en": "How {PartnerName} Works"}',
      '{"ko": "3단계로 클라우드 비용을 최적화하세요", "en": "Optimize cloud costs in 3 steps"}',
      true
    ),
    (
      NEW.id, 'faq',
      '{"ko": "자주 묻는 질문", "en": "Frequently Asked Questions"}',
      NULL,
      true
    ),
    (
      NEW.id, 'final_cta',
      '{"ko": "{PartnerName}와 함께 시작하세요", "en": "Get Started with {PartnerName}"}',
      '{"ko": "지금 바로 무료로 연동해보세요", "en": "Connect for free today"}',
      true
    ),
    (
      NEW.id, 'about',
      '{"ko": "{PartnerName} 소개", "en": "About {PartnerName}"}',
      NULL,
      true
    ),
    (
      NEW.id, 'contact',
      '{"ko": "문의하기", "en": "Contact Us"}',
      NULL,
      true
    ),
    (
      NEW.id, 'footer',
      NULL,
      NULL,
      true
    )
  ON CONFLICT (partner_id, section_type) DO NOTHING;

  -- -------------------------------------------------------------------
  -- 3. contents: 법적 고지 (is_published=false — 어드민 작성 후 직접 발행)
  --    본문(body)이 없는 상태로 초안 생성. 어드민이 내용 입력 후 발행.
  -- -------------------------------------------------------------------
  INSERT INTO public.contents (partner_id, section_type, title, is_published)
  VALUES
    (
      NEW.id, 'terms',
      '{"ko": "{PartnerName} 이용약관", "en": "{PartnerName} Terms of Service"}',
      false
    ),
    (
      NEW.id, 'privacy',
      '{"ko": "{PartnerName} 개인정보 처리방침", "en": "{PartnerName} Privacy Policy"}',
      false
    ),
    (
      NEW.id, 'cookie_policy',
      '{"ko": "{PartnerName} 쿠키 정책", "en": "{PartnerName} Cookie Policy"}',
      false
    )
  ON CONFLICT (partner_id, section_type) DO NOTHING;

  RETURN NEW;
END;
$$;


-- =============================================================================
-- STEP 2: 보안 — PUBLIC 직접 실행 차단
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.fn_init_partner_defaults() FROM PUBLIC;


-- =============================================================================
-- STEP 3: 트리거 등록
-- =============================================================================

DROP TRIGGER IF EXISTS trg_init_partner_defaults ON public.partners;

CREATE TRIGGER trg_init_partner_defaults
  AFTER INSERT ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_init_partner_defaults();


-- =============================================================================
-- 실행 후 검증 쿼리 (SQL Editor에서 별도 실행)
-- 아래 INSERT로 테스트 파트너를 생성한 뒤 검증 SELECT를 실행하라.
-- 테스트 완료 후 반드시 DELETE로 제거할 것.
-- =============================================================================

-- [테스트 INSERT] 실행 전 owner_id를 실제 존재하는 auth.users(id)로 교체할 것
-- INSERT INTO public.partners (owner_id, business_name, subdomain)
-- VALUES ('00000000-0000-0000-0000-000000000000', '테스트파트너', 'partner-test');

-- [검증 1] partner_sections: 8개 row 존재 확인
-- SELECT section_type, is_visible, display_order
-- FROM public.partner_sections
-- WHERE partner_id = (SELECT id FROM public.partners WHERE subdomain = 'partner-test')
-- ORDER BY display_order;
-- 기대: 8행, is_visible = true

-- [검증 2] contents: 11개 row 존재 확인 (마케팅 8 + 법적 고지 3)
-- SELECT section_type, is_published,
--        CASE WHEN title IS NULL THEN '⚠ NULL' ELSE '✓' END AS title_status
-- FROM public.contents
-- WHERE partner_id = (SELECT id FROM public.partners WHERE subdomain = 'partner-test')
-- ORDER BY section_type;
-- 기대: 11행, terms/privacy/cookie_policy is_published = false

-- [정리] 테스트 파트너 삭제 (CASCADE로 partner_sections, contents 함께 삭제됨)
-- DELETE FROM public.partners WHERE subdomain = 'partner-test';
