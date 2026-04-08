-- =============================================================================
-- Migration: 20260408000002_create_views.sql
-- Description: leads_masked_view 생성
--              Master Admin 전용 — 개인정보(PII) DB 레벨 마스킹 처리
-- ⚠️  실행 전제: 20260408000001_create_tables.sql 실행 완료 필수
-- =============================================================================


-- -----------------------------------------------------------------------------
-- leads_masked_view
-- Master Admin은 leads 테이블에 직접 접근 불가
-- 반드시 이 뷰를 통해서만 리드 데이터 조회
-- -----------------------------------------------------------------------------
-- [보안 #1 수정] 뷰 자체에 master_admin 전용 접근 필터 내장
-- View는 RLS 정책을 직접 적용할 수 없으므로 WHERE 절로 접근 제어를 구현한다.
-- auth.uid()가 master_admin이 아닌 경우 결과 행이 0건으로 반환됨 (에러 없이 빈 결과)
CREATE OR REPLACE VIEW leads_masked_view AS
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

  -- 리드 처리 상태: 영업 진행 현황 파악 가능 (개인정보 아님)
  status,

  created_at
FROM leads
WHERE EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master_admin'
);

-- [Gemini 감사 수정] security_invoker = true 명시적 선언 (PostgreSQL 15+)
-- 뷰가 호출자(caller)의 권한으로 실행됨을 명시화. 기본값이 SECURITY INVOKER이나
-- 명시적으로 고정하여 향후 실수로 SECURITY DEFINER로 전환되는 것을 방지.
-- WHERE EXISTS로 master_admin 필터를 직접 구현한 설계를 보완.
ALTER VIEW leads_masked_view SET (security_invoker = true);
