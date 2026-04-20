-- ================================================================
-- WL-103: pain_points 글로벌 시딩 SQL (global_contents 테이블)
-- 실행 주체: Supabase SQL Editor (문경 님 직접 실행)
-- 작성일: 2026-04-16
--
-- ⚠️  pain_points는 global_contents.meta 에 저장됩니다 (contents 아님).
--     모든 파트너 공통 데이터입니다.
--
-- parsers.ts parsePainPoints() 인터페이스:
--   meta.cards: { icon, title, description, tag?, pain? }[]
--
-- 롤백 / 현재 데이터 확인:
--   SELECT section_type, meta, updated_at
--   FROM global_contents
--   WHERE section_type = 'pain_points';
-- ================================================================

INSERT INTO global_contents (section_type, meta, updated_at)
VALUES (
  'pain_points',
  '{
    "cards": [
      {
        "icon": "EyeOff",
        "tag": "PROBLEM 01",
        "title": "가시성 부족",
        "description": "AWS, Azure, GCP 비용이 각기 다른 콘솔에 분산되어 있어 통합 현황을 파악하는 것 자체가 하루 업무가 됩니다. 어느 팀이 얼마를 쓰는지조차 알 수 없죠.",
        "pain": "평균 3개 이상의 콘솔을 매일 오가는 팀"
      },
      {
        "icon": "Clock",
        "tag": "PROBLEM 02",
        "title": "대응 지연",
        "description": "이달 말에야 청구서를 받아보는 구조에서는 이미 낭비가 일어난 뒤입니다. 경고 알림 하나 설정하는 데도 수동 작업이 수반됩니다.",
        "pain": "이상 지출 탐지까지 평균 18일 소요"
      },
      {
        "icon": "Puzzle",
        "tag": "PROBLEM 03",
        "title": "최적화 난제",
        "description": "Reserved Instance, Savings Plan, Spot Instance의 복잡한 조합은 클라우드 전문가도 최적 선택이 어렵습니다. 잘못된 선택은 오히려 비용을 늘립니다.",
        "pain": "RI/SP 활용률 평균 34%에 그치는 현실"
      }
    ]
  }'::jsonb,
  now()
)
ON CONFLICT (section_type) DO UPDATE
  SET meta = EXCLUDED.meta, updated_at = now();

-- ── 검증 쿼리 ─────────────────────────────────────────────────────────────────
-- SELECT section_type, jsonb_array_length(meta->'cards') AS card_count, updated_at
-- FROM global_contents
-- WHERE section_type = 'pain_points';
