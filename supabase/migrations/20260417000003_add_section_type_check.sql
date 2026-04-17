-- =============================================================================
-- Migration: 20260417000003_add_section_type_check.sql
-- Description: contents.section_type CHECK 제약 조건 추가 (WL-110)
--              SSOT(src/types/section-type.ts)와 동기화 — 13종
-- ✅ 멱등성: 제약 조건이 이미 존재하면 no-op
-- ✅ 사전 검증: 위반 데이터 존재 시 마이그레이션 실패 (데이터 유실 방지)
-- =============================================================================

-- Step 1: 기존 데이터 위반 여부 사전 검증
DO $$
DECLARE
  violation_count INT;
BEGIN
  SELECT COUNT(*)
  INTO violation_count
  FROM public.contents
  WHERE section_type NOT IN (
    'pain_points', 'stats', 'how_it_works', 'finops_automation',
    'core_engines', 'role_based_value', 'faq', 'final_cta',
    'hero', 'footer',
    'terms', 'privacy', 'cookie_policy'
  );

  IF violation_count > 0 THEN
    RAISE EXCEPTION
      'WL-110 사전 검증 실패: contents 테이블에 % 건의 위반 section_type이 존재합니다. '
      '제약 조건 목록에 없는 값을 먼저 정리하세요.',
      violation_count;
  END IF;
END $$;

-- Step 2: CHECK 제약 조건 추가 (멱등)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema    = 'public'
      AND table_name      = 'contents'
      AND constraint_name = 'contents_section_type_check'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE public.contents
      ADD CONSTRAINT contents_section_type_check
      CHECK (section_type IN (
        'pain_points', 'stats', 'how_it_works', 'finops_automation',
        'core_engines', 'role_based_value', 'faq', 'final_cta',
        'hero', 'footer',
        'terms', 'privacy', 'cookie_policy'
      ));
  END IF;
END $$;
