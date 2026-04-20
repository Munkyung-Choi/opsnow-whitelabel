-- WL-94: hero mini_stats 시딩 — 전 파트너 동일 고정값
-- mini_stats는 파트너별 차별화 불가. 동일 솔루션이므로 모든 파트너가 같은 수치를 표시.
-- 데이터 흐름: body(TEXT→JSONB배열) → deepLocalizeJson(locale) → body_json → parseMiniStats() → HeroSection
-- 실행 방법: Supabase SQL Editor에서 전체 블록 실행

DO $$
DECLARE v_rows INT;
BEGIN

  -- 모든 파트너 동일값: 최대 40% / 5분 / 무료
  UPDATE public.contents c SET
    body = jsonb_build_array(
      jsonb_build_object('value','최대 40%','label',jsonb_build_object('ko','월 청구서 자동 절감','en','Monthly bill savings','ja','月次請求削減','zh','月账单自动节省')),
      jsonb_build_object('value','5분','label',jsonb_build_object('ko','초기 연동 완료','en','Initial setup time','ja','初期設定完了','zh','初始集成完成')),
      jsonb_build_object('value','무료','label',jsonb_build_object('ko','분석 상담 제공','en','Free consultation','ja','無料分析相談','zh','免费分析咨询'))
    )::text,
    updated_at = now()
  FROM public.partners p
  WHERE c.partner_id = p.id
    AND p.subdomain IN ('partner-a', 'partner-b', 'partner-c', 'partner-d')
    AND c.section_type = 'hero';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'hero rows not found — check section_type and subdomain values'; END IF;
  RAISE NOTICE '% row(s) updated', v_rows;

END $$;

-- 결과 확인
SELECT p.subdomain, left(c.body::text, 100) AS body_preview, c.updated_at
FROM public.contents c
JOIN public.partners p ON p.id = c.partner_id
WHERE c.section_type = 'hero'
ORDER BY p.subdomain;
