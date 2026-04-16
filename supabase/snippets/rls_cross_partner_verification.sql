-- ================================================================
-- WL-105: Cross-Partner RLS 교차 검증 SQL
-- 실행 주체: Supabase SQL Editor (문경 님 직접 실행)
-- 작성일: 2026-04-16
--
-- 사전 조건:
--   1. partner-a, partner-b 모두 partners 테이블에 존재
--   2. admin@partner-b.com 계정 생성 완료 (seed_partner_b_onboarding.sql 실행)
--   3. 아래 UUID 변수를 실제 값으로 교체:
--      - <partner_a_id>        : SELECT id FROM partners WHERE subdomain='partner-a'
--      - <partner_b_id>        : SELECT id FROM partners WHERE subdomain='partner-b'
--      - <partner_b_owner_uid> : admin@partner-b.com의 auth.users.id
--
-- ── UUID 조회 헬퍼 (먼저 이것을 실행하여 UUID 확인) ─────────────────────────
SELECT
  subdomain,
  id         AS partner_id,
  owner_id   AS owner_uid,
  theme_key,
  default_locale
FROM public.partners
WHERE subdomain IN ('partner-a', 'partner-b')
ORDER BY subdomain;
-- ================================================================


-- ================================================================
-- [ANON 레벨 검증] SQL Editor에서 직접 실행 가능
-- SQL Editor는 service_role로 실행되므로 RLS를 우회함.
-- anon 레벨 정책은 별도 트랜잭션에서 role 전환 필요.
-- ================================================================

-- ── T-05: anon의 존재하지 않는 partner_id로 leads INSERT ──────────────────────
-- 기대: FK 제약 위반 에러
INSERT INTO public.leads (partner_id, customer_name, email)
VALUES ('00000000-0000-0000-0000-000000000000', '크로스테넌트테스트', 'test-isolation@test.com');
-- EXPECTED: ERROR - foreign key constraint violation

-- ── T-09: anon 미발행 contents 조회 시뮬레이션 ──────────────────────────────
-- service_role은 RLS 우회 → BEGIN/ROLLBACK으로 anon 역할 시뮬레이션
BEGIN;
  SET LOCAL ROLE anon;
  SELECT COUNT(*) AS unpublished_visible_to_anon
  FROM public.contents
  WHERE is_published = false;
  -- EXPECTED: 0 (contents_public_anon_read: is_published=true만 허용)
ROLLBACK;

-- ── T-10: anon get_my_role() 호출 ─────────────────────────────────────────────
BEGIN;
  SET LOCAL ROLE anon;
  SELECT public.get_my_role() AS anon_role;
  -- EXPECTED: NULL (auth.uid() = NULL → profiles 조회 결과 없음)
ROLLBACK;


-- ================================================================
-- [AUTHENTICATED 레벨 검증] partner-b admin으로 partner-a 데이터 접근 시도
-- ================================================================

-- ── T-02: partner-b admin → partner-a 미발행 contents 접근 불가 ────────────────
BEGIN;
  -- partner-b admin 세션 시뮬레이션
  SELECT set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '<partner_b_owner_uid>',   -- ← admin@partner-b.com UID로 교체
      'role', 'authenticated',
      'aud',  'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) AS cross_tenant_unpublished
  FROM public.contents
  WHERE partner_id = '<partner_a_id>'   -- ← partner-a UUID로 교체
    AND is_published = false;
  -- EXPECTED: 0
  -- FAIL 조건: 1 이상 → partner-b admin이 partner-a 초안 열람 가능 = RLS 취약점
ROLLBACK;

-- ── T-06: partner-b admin → partners 테이블 전체 조회 시도 ─────────────────────
BEGIN;
  SELECT set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '<partner_b_owner_uid>',   -- ← admin@partner-b.com UID로 교체
      'role', 'authenticated',
      'aud',  'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT subdomain FROM public.partners WHERE is_active = true;
  -- EXPECTED: 'partner-b' 1건만 반환
  -- FAIL 조건: 'partner-a' 등 타 파트너가 함께 반환 = Fix #1 미작동
ROLLBACK;

-- ── T-07: partner-b admin → site_visits 직접 INSERT 시도 ──────────────────────
BEGIN;
  SELECT set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '<partner_b_owner_uid>',
      'role', 'authenticated',
      'aud',  'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  INSERT INTO public.site_visits (partner_id, visit_date, count)
  VALUES ('<partner_b_id>', CURRENT_DATE, 9999);   -- ← partner-b UUID로 교체
  -- EXPECTED: ERROR - row-level security policy violation
ROLLBACK;

-- ── T-08: partner-b admin → system_logs 접근 불가 ─────────────────────────────
BEGIN;
  SELECT set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '<partner_b_owner_uid>',
      'role', 'authenticated',
      'aud',  'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) AS system_logs_visible FROM public.system_logs;
  -- EXPECTED: 0
ROLLBACK;


-- ================================================================
-- [데이터 격리 가시화] 파트너별 contents 수치 비교
-- ================================================================

-- partner-a vs partner-b stats 수치 비교 (앱 레이어 격리 검증)
SELECT
  p.subdomain,
  p.business_name,
  p.theme_key,
  json_array_element(c.body::json, 0)->>'value' AS stat1,
  json_array_element(c.body::json, 1)->>'value' AS stat2,
  json_array_element(c.body::json, 2)->>'value' AS stat3
FROM public.contents c
JOIN public.partners p ON c.partner_id = p.id
WHERE c.section_type = 'stats'
  AND p.subdomain IN ('partner-a', 'partner-b')
ORDER BY p.subdomain;
-- 기대:
--   partner-a (CloudSave / gray): 30% | 5   | 99.9%
--   partner-b (DataFlow  / blue): 45% | 3   | 99.95%


-- ================================================================
-- [정책 목록 확인] 현행 RLS 정책 전체 조회
-- ================================================================
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- 체크 항목:
--   partners 테이블: "partners_public_anon_read" 존재
--   contents 테이블: "contents_public_anon_read" 존재
--   partner_sections: "anon_select_visible_partner_sections" 존재
