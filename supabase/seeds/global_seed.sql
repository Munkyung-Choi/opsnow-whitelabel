-- ================================================================
-- supabase/seeds/global_seed.sql
-- global_contents 전체 상태 동기화
--
-- 목적: pain_points / finops_automation / core_engines / role_based_value / faq
--       섹션의 title/subtitle을 로컬 ↔ 클라우드 미러링.
--
-- global_contents는 파트너 공통(partner_id 없음) — 모든 파트너에 동일 적용.
-- ⚠️  임시 조치: Admin UI 완성(WL-106) 전까지 이 파일로 관리.
--
-- 멱등성: ON CONFLICT DO UPDATE — 몇 번 실행해도 안전.
-- ================================================================


-- ================================================================
-- finops_automation
-- ================================================================

INSERT INTO public.global_contents (section_type, title, subtitle)
VALUES (
  'finops_automation',
  '{"ko": "엑셀과 감에 의존하던 관리,\n이제 AI로 자율주행하십시오.", "en": "Stop relying on Excel and gut feeling.\nLet AI run your cloud on autopilot.", "ja": "ExcelとKKDに頼ったコスト管理、\nもうAIに任せましょう。", "zh": "告别依赖Excel和直觉的管理，\n现在让AI自动驾驶。"}'::jsonb,
  '{"ko": "운영팀이 직접 겪는 세 가지 만성 비효율을 자동화 기반의 To-be 상태로 전환합니다. 각 항목은 실 도입 기업의 Before/After 데이터에 근거합니다.", "en": "Transform the three chronic inefficiencies your ops team faces every day into automated To-be states. Each item is backed by Before/After data from real enterprise deployments.", "ja": "運用チームが日々直面する3つの慢性的な非効率を、自動化ベースのTo-be状態へ転換します。各項目は実導入企業のBefore/Afterデータに基づいています。", "zh": "将运营团队面临的三种慢性低效问题转变为基于自动化的To-be状态。每项均基于实际企业导入的Before/After数据。"}'::jsonb
)
ON CONFLICT (section_type) DO UPDATE
  SET title      = EXCLUDED.title,
      subtitle   = EXCLUDED.subtitle,
      updated_at = now();


-- ================================================================
-- 검증
-- ================================================================

SELECT section_type,
       title::jsonb->>'ko'    AS title_ko,
       subtitle::jsonb->>'ko' AS subtitle_ko
FROM public.global_contents
WHERE section_type = 'finops_automation';
