-- =============================================================================
-- Migration: 20260408000003_rls_policies.sql
-- Description: 전체 테이블 RLS 활성화 및 정책 설정
--              파트너 간 데이터 격리 보장 (Multi-tenant Security)
-- ⚠️  실행 전제: 20260408000001, 20260408000002 실행 완료 필수
-- ✅  멱등성 보장: DROP POLICY IF EXISTS → CREATE POLICY 패턴 사용
--              재실행 시에도 오류 없이 적용 가능
-- =============================================================================


-- =============================================================================
-- [보안 #4 수정] profiles 재귀 조회 방지용 헬퍼 함수
-- -----------------------------------------------------------------------------
-- RLS 정책 내에서 profiles 테이블을 직접 SELECT하면 해당 테이블의 RLS가
-- 다시 트리거되어 무한 재귀(infinite recursion)가 발생할 수 있다.
-- SECURITY DEFINER 함수는 함수 소유자(superuser) 권한으로 실행되어 RLS를 우회하므로
-- 재귀 없이 안전하게 현재 사용자의 role을 조회할 수 있다.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;


-- 모든 테이블 RLS 활성화 (이미 활성화된 경우 오류 없이 무시됨)
-- -----------------------------------------------------------------------------
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs     ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- [멱등성 보장] 기존 정책 전체 삭제 — DROP & CREATE 패턴
-- -----------------------------------------------------------------------------
-- CREATE POLICY는 동명 정책이 존재하면 에러로 중단된다.
-- 재실행(수정 배포, 핫픽스 등) 시 안전하게 동작하도록 모두 선삭제 후 재생성.
-- Fix 1·3에서 이름이 변경된 구 정책명도 함께 명시하여 DB에 잔류하지 않도록 처리.
-- =============================================================================

-- profiles (구 이름 profiles_self_access 포함 — Gemini 감사 수정으로 이름 변경)
DROP POLICY IF EXISTS "profiles_self_access"        ON profiles;  -- 구 이름 (FOR ALL → 제거)
DROP POLICY IF EXISTS "profiles_self_select"        ON profiles;  -- 신 이름 (FOR SELECT 전용)
DROP POLICY IF EXISTS "profiles_master_admin_read"  ON profiles;

-- partners (구 이름 partners_public_read 포함)
DROP POLICY IF EXISTS "partners_master_admin_all"       ON partners;
DROP POLICY IF EXISTS "partners_partner_admin_select"   ON partners;
DROP POLICY IF EXISTS "partners_public_read"            ON partners;  -- 구 이름 (Fix 1 이전)
DROP POLICY IF EXISTS "partners_public_anon_read"       ON partners;  -- 신 이름 (Fix 1 적용)

-- contents (구 이름 contents_public_read 포함)
DROP POLICY IF EXISTS "contents_master_admin_all"       ON contents;
DROP POLICY IF EXISTS "contents_partner_admin_write"    ON contents;
DROP POLICY IF EXISTS "contents_public_read"            ON contents;  -- 구 이름 (Fix 3 이전)
DROP POLICY IF EXISTS "contents_public_anon_read"       ON contents;  -- 신 이름 (Fix 3 적용)

-- global_contents
DROP POLICY IF EXISTS "global_contents_master_admin_all" ON global_contents;
DROP POLICY IF EXISTS "global_contents_public_read"      ON global_contents;

-- leads
DROP POLICY IF EXISTS "leads_partner_admin_select"  ON leads;
DROP POLICY IF EXISTS "leads_partner_admin_update"  ON leads;
DROP POLICY IF EXISTS "leads_public_insert"         ON leads;

-- site_visits
DROP POLICY IF EXISTS "site_visits_master_admin_select"  ON site_visits;
DROP POLICY IF EXISTS "site_visits_partner_admin_select" ON site_visits;

-- system_logs
DROP POLICY IF EXISTS "system_logs_master_admin_select" ON system_logs;


-- =============================================================================
-- profiles 정책
-- =============================================================================

-- 본인 프로필 조회 전용 (FOR SELECT)
-- [Gemini 감사 수정] FOR ALL → FOR SELECT 변경
-- 기존 FOR ALL 정책은 partner_admin이 자신의 profiles.role 컬럼을
-- 'master_admin'으로 UPDATE할 수 있어 전체 권한 탈취(에스컬레이션)가 가능했음.
-- 프로필 생성/수정은 반드시 서버사이드 supabaseAdmin(service_role)을 통해서만 수행.
CREATE POLICY "profiles_self_select" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Master Admin은 전체 프로필 조회 가능 (파트너 관리 목적)
-- [#4 수정] get_my_role() 함수로 재귀 방지
CREATE POLICY "profiles_master_admin_read" ON profiles
  FOR SELECT TO authenticated
  USING (get_my_role() = 'master_admin');


-- =============================================================================
-- partners 정책
-- =============================================================================

-- Master Admin: 전체 파트너사 CRUD
-- [#4 수정] get_my_role() 함수로 재귀 방지
CREATE POLICY "partners_master_admin_all" ON partners
  FOR ALL TO authenticated
  USING (get_my_role() = 'master_admin');

-- Partner Admin: 본인 파트너사만 조회
CREATE POLICY "partners_partner_admin_select" ON partners
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

-- Public (마케팅 사이트 미들웨어): 활성 파트너사 도메인 정보 조회
-- [Fix #1] anon 전용으로 제한 — authenticated 파트너 어드민이 경쟁사 전체 정보를
--          조회하는 경로를 차단. 미들웨어/SSR은 anon key로 동작하므로 회귀 없음.
CREATE POLICY "partners_public_anon_read" ON partners
  FOR SELECT TO anon
  USING (is_active = true);


-- =============================================================================
-- contents 정책
-- =============================================================================

-- Master Admin: 전체 파트너 콘텐츠 CRUD
-- [#4 수정] get_my_role() 함수로 재귀 방지
CREATE POLICY "contents_master_admin_all" ON contents
  FOR ALL TO authenticated
  USING (get_my_role() = 'master_admin');

-- Partner Admin: 본인 파트너사 콘텐츠만 CRUD
CREATE POLICY "contents_partner_admin_write" ON contents
  FOR ALL TO authenticated
  USING (
    partner_id IN (SELECT id FROM partners WHERE owner_id = auth.uid())
  );

-- Public (마케팅 사이트): 발행된 콘텐츠만 조회 (anon 전용)
-- [#2 수정] is_published = true인 콘텐츠만 공개 노출 (초안 보호)
-- [Fix #3] anon 전용으로 제한 — 로그인한 파트너 어드민이 타 파트너의 발행 콘텐츠를
--          Admin 대시보드에서 직접 조회하는 경로를 차단.
--          authenticated 파트너 어드민의 콘텐츠 접근은 contents_partner_admin_write(FOR ALL)로 처리.
CREATE POLICY "contents_public_anon_read" ON contents
  FOR SELECT TO anon
  USING (is_published = true);


-- =============================================================================
-- global_contents 정책
-- =============================================================================

-- Master Admin: 공통 콘텐츠 CRUD
-- [#4 수정] get_my_role() 함수로 재귀 방지
CREATE POLICY "global_contents_master_admin_all" ON global_contents
  FOR ALL TO authenticated
  USING (get_my_role() = 'master_admin');

-- Public (마케팅 사이트): 공통 콘텐츠 조회
CREATE POLICY "global_contents_public_read" ON global_contents
  FOR SELECT TO anon, authenticated
  USING (true);


-- =============================================================================
-- leads 정책
-- ⚠️  Master Admin은 leads 테이블 직접 접근 정책 없음
--     Master Admin은 반드시 leads_masked_view를 통해서만 조회
-- =============================================================================

-- Partner Admin: 본인 파트너사 리드만 조회
CREATE POLICY "leads_partner_admin_select" ON leads
  FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM partners WHERE owner_id = auth.uid())
  );

-- Partner Admin: 본인 파트너사 리드 상태 변경 (status 업데이트)
CREATE POLICY "leads_partner_admin_update" ON leads
  FOR UPDATE TO authenticated
  USING (
    partner_id IN (SELECT id FROM partners WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    partner_id IN (SELECT id FROM partners WHERE owner_id = auth.uid())
  );

-- Public (마케팅 사이트 문의 폼): 리드 신규 등록
-- [Fix #2] 활성 파트너(is_active = true)에만 리드 삽입 허용.
--          비활성 파트너 ID로의 스팸 삽입을 DB 레벨에서 1차 차단.
--          ⚠️ 앱 레벨 Rate Limiting 필수: Route Handler(/api/leads)에 IP 기반
--             또는 Turnstile/reCAPTCHA 검증을 추가해야 대량 스팸을 완전 차단 가능.
CREATE POLICY "leads_public_insert" ON leads
  FOR INSERT TO anon
  WITH CHECK (
    partner_id IN (SELECT id FROM partners WHERE is_active = true)
  );


-- =============================================================================
-- site_visits 정책
-- ⚠️  Upsert는 Service Role Key를 사용하는 서버사이드 Route에서만 호출
--     anon 직접 INSERT 허용 시 카운트 조작 가능 → Service Role 필수
-- =============================================================================

-- Master Admin: 전체 파트너 방문 통계 조회
-- [#4 수정] get_my_role() 함수로 재귀 방지
CREATE POLICY "site_visits_master_admin_select" ON site_visits
  FOR SELECT TO authenticated
  USING (get_my_role() = 'master_admin');

-- Partner Admin: 본인 파트너사 방문 통계만 조회
CREATE POLICY "site_visits_partner_admin_select" ON site_visits
  FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM partners WHERE owner_id = auth.uid())
  );

-- [#3 수정] INSERT/UPDATE 정책 제거
-- site_visits Upsert는 반드시 Service Role Key를 사용하는 서버사이드에서만 수행한다.
-- Service Role은 RLS를 우회하므로 별도 정책이 불필요하며,
-- 정책을 열어두면 partner_admin이 통계를 임의 조작할 수 있어 위험하다.


-- =============================================================================
-- system_logs 정책
-- ⚠️  Master Admin만 SELECT 가능
--     Partner Admin은 본인 관련 로그도 조회 불가
--     INSERT는 Service Role Key 서버사이드에서만 수행
-- =============================================================================

-- [#4 수정] get_my_role() 함수로 재귀 방지
CREATE POLICY "system_logs_master_admin_select" ON system_logs
  FOR SELECT TO authenticated
  USING (get_my_role() = 'master_admin');
