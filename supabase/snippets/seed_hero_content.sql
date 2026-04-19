-- WL-94: hero 섹션 전체 콘텐츠 시딩 (body + cta_text)
-- - body(JSONB): mini_stats 배열. 파트너별 실측 수치 반영. DB 우선, 없으면 dictionary 폴백.
-- - cta_text(TEXT): i18n JSON 문자열. Admin UI 미노출 — SQL로만 운영 변경 가능(Operational Flexibility).
-- 대체: seed_hero_mini_stats.sql (구 파일 — 삭제 가능)
-- 실행: Supabase SQL Editor 전체 블록 실행

DO $$
DECLARE v_rows INT;
BEGIN

  -- partner-a: OpsNow 표준 (최대 40% / 5분 / 무료)
  UPDATE public.contents c SET
    body = jsonb_build_array(
      jsonb_build_object('value','최대 40%','label',jsonb_build_object('ko','월 청구서 자동 절감','en','Monthly bill savings','ja','月次請求削減','zh','月账单自动节省')),
      jsonb_build_object('value','5분','label',jsonb_build_object('ko','초기 연동 완료','en','Initial setup time','ja','初期設定完了','zh','初始集成完成')),
      jsonb_build_object('value','무료','label',jsonb_build_object('ko','분석 상담 제공','en','Free consultation','ja','無料分析相談','zh','免费分析咨询'))
    ),
    cta_text = '{"ko":"무료 진단 신청","en":"Start Free Trial","ja":"無料診断を申し込む","zh":"申请免费诊断"}',
    updated_at = now()
  FROM public.partners p
  WHERE c.partner_id = p.id AND p.subdomain = 'partner-a' AND c.section_type = 'hero';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'partner-a hero row not found'; END IF;
  RAISE NOTICE 'partner-a: % row(s) updated', v_rows;

  -- partner-b: 고성능 포지셔닝 (최대 47% / 3분 / 무료)
  UPDATE public.contents c SET
    body = jsonb_build_array(
      jsonb_build_object('value','최대 47%','label',jsonb_build_object('ko','월 청구서 자동 절감','en','Monthly bill savings','ja','月次請求削減','zh','月账单自动节省')),
      jsonb_build_object('value','3분','label',jsonb_build_object('ko','초기 연동 완료','en','Initial setup time','ja','初期設定完了','zh','初始集成完成')),
      jsonb_build_object('value','무료','label',jsonb_build_object('ko','분석 상담 제공','en','Free consultation','ja','無料分析相談','zh','免费分析咨询'))
    ),
    cta_text = '{"ko":"무료 진단 신청","en":"Start Free Trial","ja":"無料診断を申し込む","zh":"申请免费诊断"}',
    updated_at = now()
  FROM public.partners p
  WHERE c.partner_id = p.id AND p.subdomain = 'partner-b' AND c.section_type = 'hero';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'partner-b hero row not found'; END IF;
  RAISE NOTICE 'partner-b: % row(s) updated', v_rows;

  -- partner-c: 안정적 포지셔닝 (최대 35% / 5분 / 무료)
  UPDATE public.contents c SET
    body = jsonb_build_array(
      jsonb_build_object('value','최대 35%','label',jsonb_build_object('ko','월 청구서 자동 절감','en','Monthly bill savings','ja','月次請求削減','zh','月账单자动节省')),
      jsonb_build_object('value','5분','label',jsonb_build_object('ko','초기 연동 완료','en','Initial setup time','ja','初期設定完了','zh','初始集成完成')),
      jsonb_build_object('value','무료','label',jsonb_build_object('ko','분석 상담 제공','en','Free consultation','ja','無料分析相談','zh','免费分析咨询'))
    ),
    cta_text = '{"ko":"무료 진단 신청","en":"Start Free Trial","ja":"無料診断を申し込む","zh":"申请免费诊断"}',
    updated_at = now()
  FROM public.partners p
  WHERE c.partner_id = p.id AND p.subdomain = 'partner-c' AND c.section_type = 'hero';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'partner-c hero row not found'; END IF;
  RAISE NOTICE 'partner-c: % row(s) updated', v_rows;

  -- partner-d: 엔터프라이즈 포지셔닝 (최대 42% / 7분 / 무료)
  UPDATE public.contents c SET
    body = jsonb_build_array(
      jsonb_build_object('value','최대 42%','label',jsonb_build_object('ko','월 청구서 자동 절감','en','Monthly bill savings','ja','月次請求削減','zh','月账单자动节省')),
      jsonb_build_object('value','7분','label',jsonb_build_object('ko','초기 연동 완료','en','Initial setup time','ja','初期設定完了','zh','初始集成完成')),
      jsonb_build_object('value','무료','label',jsonb_build_object('ko','분석 상담 제공','en','Free consultation','ja','無料分析相談','zh','免费分析咨询'))
    ),
    cta_text = '{"ko":"무료 진단 신청","en":"Start Free Trial","ja":"無料診断を申し込む","zh":"申请免费诊断"}',
    updated_at = now()
  FROM public.partners p
  WHERE c.partner_id = p.id AND p.subdomain = 'partner-d' AND c.section_type = 'hero';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'partner-d hero row not found'; END IF;
  RAISE NOTICE 'partner-d: % row(s) updated', v_rows;

END $$;

-- 결과 확인
SELECT p.subdomain,
       left(c.body::text, 60)      AS body_preview,
       left(c.cta_text::text, 40)  AS cta_preview,
       c.updated_at
FROM public.contents c
JOIN public.partners p ON p.id = c.partner_id
WHERE c.section_type = 'hero'
ORDER BY p.subdomain;
