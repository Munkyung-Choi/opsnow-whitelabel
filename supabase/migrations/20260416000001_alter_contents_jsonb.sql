-- =============================================================================
-- Migration: 20260416000001_alter_contents_jsonb.sql
-- Ticket: WL-105 (cloud schema alignment)
-- Description:
--   contents.(title, subtitle, body) 컬럼을 TEXT → JSONB로 변환.
--   클라우드 Supabase는 이미 JSONB 타입으로 생성되어 있음.
--   로컬 스키마를 클라우드와 일치시키기 위한 정렬 마이그레이션.
--
--   멱등성: 이미 JSONB인 컬럼은 IF 조건 false → 아무것도 실행하지 않음.
--   캐스트 전략: JSON-shaped 텍스트('{"...' or '[...') → ::jsonb 직접 캐스트.
--   평문/{{template}} → to_jsonb() → JSON 문자열 스칼라. (22P02 방어)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'contents'
      AND column_name  = 'title'
      AND data_type    = 'text'
  ) THEN
    ALTER TABLE public.contents
      ALTER COLUMN title    TYPE jsonb USING
        CASE
          WHEN title IS NULL OR title = '' THEN NULL::jsonb
          WHEN title ~ '^\s*\{"' OR title ~ '^\s*\[' THEN title::jsonb
          ELSE to_jsonb(title)
        END,
      ALTER COLUMN subtitle TYPE jsonb USING
        CASE
          WHEN subtitle IS NULL OR subtitle = '' THEN NULL::jsonb
          WHEN subtitle ~ '^\s*\{"' OR subtitle ~ '^\s*\[' THEN subtitle::jsonb
          ELSE to_jsonb(subtitle)
        END,
      ALTER COLUMN body     TYPE jsonb USING
        CASE
          WHEN body IS NULL OR body = '' THEN NULL::jsonb
          WHEN body ~ '^\s*\{"' OR body ~ '^\s*\[' THEN body::jsonb
          ELSE to_jsonb(body)
        END;
  END IF;
END $$;
