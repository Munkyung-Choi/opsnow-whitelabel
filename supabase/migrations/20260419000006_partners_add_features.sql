-- WL-124: partners.features JSONB Feature Flag 인프라 (NFR §5.4)
-- Track: HIGH-Standard (nullable → NOT NULL DEFAULT '{}' 카탈로그 레벨 처리, 명시적 UPDATE 없음)
-- Approved: 2026-04-19 (비동기 승인)

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'::jsonb;
