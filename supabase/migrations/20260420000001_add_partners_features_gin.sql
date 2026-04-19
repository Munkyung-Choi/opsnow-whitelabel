-- WL-124/NFR §5.4: partners.features JSONB Feature Flag GIN 인덱스
-- 목적: `features @> '{"key": true}'::jsonb` 조회를 sequential scan(O(n))에서
--       GIN index scan으로 전환 — 파트너 100+ 시 풀 스캔 위험 제거.
-- CONCURRENTLY 미사용: supabase migration up 로컬 파이프라인 미지원 (WL-120과 동일 근거).
--   프로덕션 무중단이 필요할 경우 SQL Editor에서 직접 CONCURRENTLY로 실행 가능.
-- 롤백: DROP INDEX idx_partners_features_gin; 즉시 복구 가능.
-- 멱등성: IF NOT EXISTS 보장.

CREATE INDEX IF NOT EXISTS idx_partners_features_gin
  ON public.partners USING GIN (features);
