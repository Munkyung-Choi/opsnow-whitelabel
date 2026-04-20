-- ================================================================
-- supabase/seeds/seed_core_engines_icons.sql
-- WL-95: core_engines meta.engines에 icon 필드 추가
--
-- 적용 대상: 기존 dev/prod DB (seed.sql로 초기화된 환경 포함)
-- 멱등성: WHERE + jsonb_set — 몇 번 실행해도 안전.
-- ================================================================

UPDATE public.global_contents
SET
  meta       = jsonb_set(
    COALESCE(meta, '{}'::jsonb),
    '{engines}',
    '[
      {"name": "Cost Intelligence",  "description": "멀티클라우드 비용 데이터를 통합 수집·분석하여 실시간 현황판을 제공합니다.", "icon": "BrainCircuit"},
      {"name": "AI Optimizer",       "description": "머신러닝 기반 사용 패턴 분석으로 과잉 프로비저닝을 자동 감지하고 최적화 권고안을 생성합니다.", "icon": "Zap"},
      {"name": "FinOps Governance",  "description": "예산 정책, 태깅 규칙, 알림 임계값을 코드로 관리하여 거버넌스를 자동화합니다.", "icon": "Cloud"}
    ]'::jsonb
  ),
  updated_at = now()
WHERE section_type = 'core_engines';

-- 검증
SELECT
  section_type,
  jsonb_array_length(meta->'engines')               AS engine_count,
  meta->'engines'->0->>'icon'                       AS icon_0,
  meta->'engines'->1->>'icon'                       AS icon_1,
  meta->'engines'->2->>'icon'                       AS icon_2
FROM public.global_contents
WHERE section_type = 'core_engines';
