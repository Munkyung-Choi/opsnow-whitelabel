-- ================================================================
-- WL-105: partner-b 전용 stats 콘텐츠 시딩
-- 실행 주체: Supabase SQL Editor (문경 님 직접 실행)
-- 작성일: 2026-04-16
--
-- 목적: partner-a(30%·5분·99.9%)와 다른 수치로 격리 효과를 가시적으로 증명.
--       E2E M-1-3 테스트는 partner-a의 30%·5분·99.9% 수치만 검증하므로
--       partner-b 수치 변경 시 회귀 없음.
--
-- 전제: seed_partner_b_onboarding.sql 실행 완료 (partner-b 행 존재)
-- 멱등성: ON CONFLICT DO UPDATE — 중복 실행 안전
-- ================================================================

-- ── partner-b 전용 stats (partner-a와 다른 수치) ──────────────────────────────
INSERT INTO public.contents (partner_id, section_type, body, is_published, updated_at)
SELECT
  p.id,
  'stats',
  '[
    {
      "value": "45%",
      "unit":   {"ko": "평균",    "en": "avg",   "ja": "平均",  "zh": "平均"},
      "label":  {"ko": "연간 클라우드 비용 절감",         "en": "Annual Cloud Cost Reduction",     "ja": "年間クラウドコスト削減",    "zh": "年均云成本节省"},
      "detail": {"ko": "DataFlow 고객사 중앙값 기준",     "en": "Based on DataFlow customer median","ja": "DataFlow顧客の中央値基準",  "zh": "基于DataFlow客户中位数"}
    },
    {
      "value": "3",
      "unit":   {"ko": "분 이내",  "en": "min",   "ja": "分以内", "zh": "分钟内"},
      "label":  {"ko": "최초 연동 완료",   "en": "First Integration Complete",  "ja": "初回連携完了",   "zh": "首次集成完成"},
      "detail": {"ko": "API 키 1개로 즉시 시작", "en": "Start instantly with one API key", "ja": "APIキー1つで即時開始", "zh": "只需一个API密钥即可开始"}
    },
    {
      "value": "99.95%",
      "unit":   {"ko": "SLA",  "en": "SLA",  "ja": "SLA",  "zh": "SLA"},
      "label":  {"ko": "가용성 보장",   "en": "Uptime Guarantee",   "ja": "稼働率保証",   "zh": "可用性保障"},
      "detail": {"ko": "글로벌 멀티리전 인프라", "en": "Global multi-region infrastructure", "ja": "グローバルマルチリージョンインフラ", "zh": "全球多区域基础设施"}
    }
  ]',
  true,
  now()
FROM public.partners p
WHERE p.subdomain = 'partner-b'
ON CONFLICT (partner_id, section_type)
  DO UPDATE SET body = EXCLUDED.body, updated_at = now();


-- ── 격리 검증 쿼리 ────────────────────────────────────────────────────────────
-- 실행 후 아래 SELECT로 두 파트너의 stats 수치가 다른지 확인:
SELECT
  p.subdomain,
  p.business_name,
  json_array_element(c.body::json, 0)->>'value' AS first_stat_value,
  json_array_element(c.body::json, 1)->>'value' AS second_stat_value,
  json_array_element(c.body::json, 2)->>'value' AS third_stat_value
FROM public.contents c
JOIN public.partners p ON c.partner_id = p.id
WHERE c.section_type = 'stats'
  AND p.subdomain IN ('partner-a', 'partner-b')
ORDER BY p.subdomain;
-- 기대:
--   partner-a: 30% | 5   | 99.9%   (기존 시딩)
--   partner-b: 45% | 3   | 99.95%  (이번 시딩)
-- → 두 파트너가 다른 수치를 가짐 = 데이터 격리 가시적 증명
