-- =============================================================================
-- Migration: 20260417000002_delete_dead_data.sql
-- Description: contents 테이블 Dead Data 정리 (WL-109)
--              section_type 'about', 'contact' 는 SectionRegistry에 미등록,
--              소비 컴포넌트 없음 — src/types/section-type.ts SSOT에도 부재.
-- ✅ 멱등성: 대상 행이 없으면 DELETE는 no-op
-- =============================================================================

DELETE FROM public.contents
WHERE section_type IN ('about', 'contact');
