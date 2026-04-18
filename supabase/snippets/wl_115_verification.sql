-- =============================================================================
-- Snippet: WL-115 Migration Verification
-- Usage: supabase db push 전/후 SQL Editor에서 수동 실행.
-- =============================================================================

-- ── A. Pre-migration (실행 직전) ────────────────────────────────────────────

-- A1. 신규 불변 위반 행 존재 확인 (기대값 = 0)
SELECT COUNT(*) AS violations
FROM public.partners
WHERE default_locale <> ALL(published_locales);

-- A2. 기존 제약 존재 확인 (기대: partners_default_locale_check 1건)
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'partners'
  AND constraint_type = 'CHECK'
  AND constraint_name LIKE 'partners_default_locale%';

-- ── B. Post-migration (실행 직후) ───────────────────────────────────────────

-- B1. 신규 제약 존재 + 구 제약 제거 확인
--     기대: partners_default_locale_in_published 1건만 반환
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'partners'
  AND constraint_type = 'CHECK'
  AND constraint_name LIKE 'partners_default_locale%';

-- B2. Runtime 위반 테스트 (에러 발생해야 통과)
--     partner-a.published_locales=[ko,en,ja,zh]에 'da' 없음 → 제약 위반
BEGIN;
  UPDATE public.partners
  SET default_locale = 'da'
  WHERE subdomain = 'partner-a';
  -- 기대: ERROR — new row violates check constraint "partners_default_locale_in_published"
ROLLBACK;

-- B3. 양성 테스트 — published 멤버로 변경은 성공해야 함
BEGIN;
  UPDATE public.partners
  SET default_locale = 'en'
  WHERE subdomain = 'partner-a';
  -- 기대: UPDATE 1
ROLLBACK;
