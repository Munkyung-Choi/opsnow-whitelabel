-- =============================================================================
-- Migration: 20260416000001_alter_contents_jsonb.sql
-- Ticket: WL-105 (cloud schema alignment)
-- Description:
--   contents.(title, subtitle, body) 컬럼을 TEXT → JSONB로 변환.
--   클라우드 Supabase는 이미 JSONB 타입으로 생성되어 있음.
--   로컬 스키마를 클라우드와 일치시키기 위한 정렬 마이그레이션.
--
--   멱등성: 이미 JSONB인 컬럼은 IF 조건 false → 아무것도 실행하지 않음.
--   NULLIF(col, ''): 빈 문자열('')은 유효한 JSON이 아니므로 NULL로 변환 후 캐스트.
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
      ALTER COLUMN title    TYPE jsonb USING NULLIF(title, '')::jsonb,
      ALTER COLUMN subtitle TYPE jsonb USING NULLIF(subtitle, '')::jsonb,
      ALTER COLUMN body     TYPE jsonb USING NULLIF(body, '')::jsonb;
  END IF;
END $$;
