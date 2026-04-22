-- WL-153: leads_masked_view security_invoker 복원 — DEBT-007 Issue 1 해소
-- Track: Critical (보안 뷰 access control 변경)
-- Cloud 적용: 2026-04-22 문경 님 SQL Editor 실행 완료
--
-- 문제: Gemini 감사 수정(security_invoker=true)이 역효과 발생.
--   SECURITY INVOKER → caller(master_admin)의 leads SELECT 정책 없음 → 0건 반환.
--
-- 해결: SECURITY DEFINER(invoker=false) + schema-qualified 참조
--   1. security_invoker=false → 뷰 소유자(postgres superuser) 권한으로 실행 → leads 접근
--   2. public.leads, public.profiles 명시 → search_path hijacking 방어
--   3. WHERE EXISTS (master_admin 확인) → access control은 뷰 레벨에서 유지
--
-- 사전 확인: viewowner = postgres (superuser) — 2026-04-22 실증
-- reloptions = {security_invoker=false} — 2026-04-22 Cloud 검증 완료

CREATE OR REPLACE VIEW public.leads_masked_view AS
SELECT
  id,
  partner_id,

  -- 고객명: 앞 2자 노출, 나머지 마스킹 (예: 홍길동 → 홍길*)
  CASE
    WHEN LENGTH(customer_name) > 2
    THEN CONCAT(LEFT(customer_name, 2), REPEAT('*', LENGTH(customer_name) - 2))
    ELSE customer_name
  END AS customer_name,

  -- 회사명: 마스킹 없이 노출 (영업 통계 목적)
  company_name,

  -- 이메일: 로컬 파트 마스킹, 도메인 노출 (예: ***@acme.com)
  CONCAT(
    REPEAT('*', GREATEST(POSITION('@' IN email) - 1, 0)),
    SUBSTRING(email FROM POSITION('@' IN email))
  ) AS email,

  -- 연락처: 중간 자리 마스킹 (예: 010-****-5678)
  CASE
    WHEN phone IS NOT NULL
    THEN REGEXP_REPLACE(phone, '(\d{2,3})-(\d{3,4})-(\d{4})', '\1-****-\3')
    ELSE NULL
  END AS phone,

  -- 클라우드 사용량: 마스킹 없이 노출 (통계/우선순위 판단 목적)
  cloud_usage_amount,

  -- 상세 문의 내용: 완전 숨김 (영업 비밀 보호)
  NULL::text AS message,

  status,
  created_at

FROM public.leads                    -- schema-qualified: search_path hijacking 방어
WHERE EXISTS (
  SELECT 1 FROM public.profiles      -- schema-qualified: search_path hijacking 방어
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'master_admin'
);

-- SECURITY DEFINER 방식 전환 (invoker=false)
-- 뷰 소유자(postgres superuser)의 권한으로 실행 → leads 테이블 직접 접근 가능
-- WHERE EXISTS 절이 master_admin만 결과를 받도록 보장
ALTER VIEW public.leads_masked_view SET (security_invoker = false);
