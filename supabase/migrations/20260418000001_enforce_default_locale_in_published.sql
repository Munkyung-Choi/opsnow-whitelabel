-- =============================================================================
-- Migration: 20260418000001_enforce_default_locale_in_published
-- Ticket: WL-115
-- Description: default_locale 제약을 화이트리스트(ko/en)에서 published_locales
--              array 멤버십 강제로 교체.
-- Rationale: Option B-2 — 관계적 정합성 모델.
--              default_locale은 반드시 published_locales의 원소여야 한다.
-- Rollback Policy: Forward-only. 긴급 복구 시 신규 제약만 DROP하고 화이트리스트
--              CHECK는 재부과하지 않는다. ja/zh 파트너 등록 이후에는 화이트리스트
--              복원이 기존 데이터 위반으로 실패하므로, 복구는 "앞으로" 나아간다.
-- Pre-check (실행 전 필수):
--   SELECT COUNT(*) FROM public.partners
--   WHERE default_locale <> ALL(published_locales);
--   -- 기대값: 0. 1 이상이면 실행 중단하고 위반 행을 먼저 정합화.
-- =============================================================================

BEGIN;

-- Step 1: 기존 화이트리스트 CHECK 제거
ALTER TABLE public.partners
  DROP CONSTRAINT IF EXISTS partners_default_locale_check;

-- Step 2: 멱등성 보장 — 기존 신규 제약 존재 시 드롭 후 재생성
ALTER TABLE public.partners
  DROP CONSTRAINT IF EXISTS partners_default_locale_in_published;

-- Step 3: 새 CHECK 추가 — default_locale은 반드시 published_locales 멤버
ALTER TABLE public.partners
  ADD CONSTRAINT partners_default_locale_in_published
  CHECK (default_locale = ANY(published_locales));

-- Step 4: 메타데이터 기록
COMMENT ON CONSTRAINT partners_default_locale_in_published ON public.partners IS
  'WL-115: default_locale은 published_locales array의 원소여야 한다. '
  '화이트리스트(ko/en) 제약을 폐기하고 정합성 모델로 전환.';

COMMIT;
