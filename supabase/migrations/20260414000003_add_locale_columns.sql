-- =============================================================================
-- Migration: 20260414000003_add_locale_columns
-- Ticket: WL-61
-- Description: partners 테이블에 로케일 감지용 컬럼 추가.
--              proxy.ts의 detectLocale() 파이프라인에서 참조.
--              IF NOT EXISTS로 멱등성 보장 — 호스팅 DB에 이미 존재하는 경우 무시.
-- =============================================================================

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS default_locale TEXT NOT NULL DEFAULT 'ko'
    CONSTRAINT partners_default_locale_check CHECK (default_locale IN ('ko', 'en')),
  ADD COLUMN IF NOT EXISTS published_locales TEXT[] NOT NULL DEFAULT ARRAY['ko']::TEXT[];

COMMENT ON COLUMN public.partners.default_locale IS
  'IP/쿠키 기반 로케일 감지 실패 시 폴백. proxy.ts detectLocale() 우선순위 3번.';

COMMENT ON COLUMN public.partners.published_locales IS
  '파트너가 실제 발행한 언어 목록. 미발행 언어 접근 시 default_locale로 soft-landing.';

-- 기존 파트너(이미 존재하는 경우) — 한국어 기본값 유지
-- ADD COLUMN IF NOT EXISTS + DEFAULT가 이미 처리하므로 별도 UPDATE 불필요.
