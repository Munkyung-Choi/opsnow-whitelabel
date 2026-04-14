-- =============================================================================
-- Migration: 20260414000002_drop_color_columns
-- Ticket: WL-65
-- Description: partners 테이블에서 hex 기반 primary_color, secondary_color 컬럼 제거.
--              theme_key (20260414000001에서 추가)가 단일 소스로 대체.
-- =============================================================================

ALTER TABLE public.partners
  DROP COLUMN IF EXISTS primary_color,
  DROP COLUMN IF EXISTS secondary_color;
