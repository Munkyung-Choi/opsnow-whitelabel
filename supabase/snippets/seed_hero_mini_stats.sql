-- WL-94: 파트너별 차별화된 hero mini_stats 시딩
-- 대상: contents.body (JSONB 배열) — section_type = 'hero'
-- 데이터 흐름: body → deepLocalizeJson(locale) → body_json → parseMiniStats() → HeroSection
-- 실행 방법: Supabase SQL Editor에서 전체 블록 실행

DO $$
DECLARE v_rows INT;
BEGIN

  -- partner-a: OpsNow 표준 포지셔닝
  UPDATE public.contents c SET
    body = '[
      {"value":"최대 40%","label":{"ko":"월 청구서 자동 절감","en":"Monthly bill savings","ja":"月次請求削減","zh":"月账单自动节省"}},
      {"value":"5분","label":{"ko":"초기 연동 완료","en":"Initial setup time","ja":"初期設定完了","zh":"初始集成完成"}},
      {"value":"무료","label":{"ko":"분석 상담 제공","en":"Free consultation","ja":"無料分析相談","zh":"免费分析咨询"}}
    ]'::jsonb,
    updated_at = now()
  FROM public.partners p
  WHERE c.partner_id = p.id AND p.subdomain = 'partner-a' AND c.section_type = 'hero';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'partner-a hero row not found'; END IF;
  RAISE NOTICE 'partner-a: % row(s) updated', v_rows;

  -- partner-b: 고성능 포지셔닝
  UPDATE public.contents c SET
    body = '[
      {"value":"최대 47%","label":{"ko":"월 청구서 자동 절감","en":"Monthly bill savings","ja":"月次請求削減","zh":"月账单自动节省"}},
      {"value":"3분","label":{"ko":"초기 연동 완료","en":"Initial setup time","ja":"初期設定完了","zh":"初始集成完成"}},
      {"value":"무료","label":{"ko":"분석 상담 제공","en":"Free consultation","ja":"無料分析相談","zh":"免费分析咨询"}}
    ]'::jsonb,
    updated_at = now()
  FROM public.partners p
  WHERE c.partner_id = p.id AND p.subdomain = 'partner-b' AND c.section_type = 'hero';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'partner-b hero row not found'; END IF;
  RAISE NOTICE 'partner-b: % row(s) updated', v_rows;

  -- partner-c: 안정적 포지셔닝
  UPDATE public.contents c SET
    body = '[
      {"value":"최대 35%","label":{"ko":"월 청구서 자동 절감","en":"Monthly bill savings","ja":"月次請求削減","zh":"月账单自动节省"}},
      {"value":"5분","label":{"ko":"초기 연동 완료","en":"Initial setup time","ja":"初期設定完了","zh":"初始集成完成"}},
      {"value":"무료","label":{"ko":"분석 상담 제공","en":"Free consultation","ja":"無料分析相談","zh":"免费分析咨询"}}
    ]'::jsonb,
    updated_at = now()
  FROM public.partners p
  WHERE c.partner_id = p.id AND p.subdomain = 'partner-c' AND c.section_type = 'hero';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'partner-c hero row not found'; END IF;
  RAISE NOTICE 'partner-c: % row(s) updated', v_rows;

  -- partner-d: 엔터프라이즈 포지셔닝
  UPDATE public.contents c SET
    body = '[
      {"value":"최대 42%","label":{"ko":"월 청구서 자동 절감","en":"Monthly bill savings","ja":"月次請求削減","zh":"月账单자动节省"}},
      {"value":"7분","label":{"ko":"초기 연동 완료","en":"Initial setup time","ja":"初期設定完了","zh":"初始集成完成"}},
      {"value":"무료","label":{"ko":"분석 상담 제공","en":"Free consultation","ja":"無料分析相談","zh":"免费分析咨询"}}
    ]'::jsonb,
    updated_at = now()
  FROM public.partners p
  WHERE c.partner_id = p.id AND p.subdomain = 'partner-d' AND c.section_type = 'hero';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'partner-d hero row not found'; END IF;
  RAISE NOTICE 'partner-d: % row(s) updated', v_rows;

END $$;

-- 결과 확인
SELECT p.subdomain, left(c.body::text, 80) AS body_preview, c.updated_at
FROM public.contents c
JOIN public.partners p ON p.id = c.partner_id
WHERE c.section_type = 'hero'
ORDER BY p.subdomain;
