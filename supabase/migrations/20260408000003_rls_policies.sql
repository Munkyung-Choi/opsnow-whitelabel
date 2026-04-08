-- =============================================================================
-- Migration: 20260408000003_rls_policies.sql
-- Description: 전체 테이블 RLS 활성화 및 정책 설정
--              파트너 간 데이터 격리 보장 (Multi-tenant Security)
-- ⚠️  실행 전제: 20260408000001, 20260408000002 실행 완료 필수
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 모든 테이블 RLS 활성화
-- -----------------------------------------------------------------------------
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs     ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- profiles 정책
-- =============================================================================

-- 본인 프로필만 접근 가능
CREATE POLICY "profiles_self_access" ON profiles
  FOR ALL TO authenticated
  USING (id = auth.uid());

-- Master Admin은 전체 프로필 조회 가능 (파트너 관리 목적)
CREATE POLICY "profiles_master_admin_read" ON profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'master_admin'
  ));


-- =============================================================================
-- partners 정책
-- =============================================================================

-- Master Admin: 전체 파트너사 CRUD
CREATE POLICY "partners_master_admin_all" ON partners
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master_admin'
  ));

-- Partner Admin: 본인 파트너사만 조회
CREATE POLICY "partners_partner_admin_select" ON partners
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

-- Public (마케팅 사이트 미들웨어): 활성 파트너사 도메인 정보 조회
CREATE POLICY "partners_public_read" ON partners
  FOR SELECT TO anon, authenticated
  USING (is_active = true);


-- =============================================================================
-- contents 정책
-- =============================================================================

-- Master Admin: 전체 파트너 콘텐츠 CRUD
CREATE POLICY "contents_master_admin_all" ON contents
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master_admin'
  ));

-- Partner Admin: 본인 파트너사 콘텐츠만 CRUD
CREATE POLICY "contents_partner_admin_write" ON contents
  FOR ALL TO authenticated
  USING (
    partner_id IN (SELECT id FROM partners WHERE owner_id = auth.uid())
  );

-- Public (마케팅 사이트): 콘텐츠 조회
CREATE POLICY "contents_public_read" ON contents
  FOR SELECT TO anon, authenticated
  USING (true);


-- =============================================================================
-- global_contents 정책
-- =============================================================================

-- Master Admin: 공통 콘텐츠 CRUD
CREATE POLICY "global_contents_master_admin_all" ON global_contents
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master_admin'
  ));

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
CREATE POLICY "leads_public_insert" ON leads
  FOR INSERT TO anon
  WITH CHECK (true);


-- =============================================================================
-- site_visits 정책
-- ⚠️  Upsert는 Service Role Key를 사용하는 서버사이드 Route에서만 호출
--     anon 직접 INSERT 허용 시 카운트 조작 가능 → Service Role 필수
-- =============================================================================

-- Master Admin: 전체 파트너 방문 통계 조회
CREATE POLICY "site_visits_master_admin_select" ON site_visits
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master_admin'
  ));

-- Partner Admin: 본인 파트너사 방문 통계만 조회
CREATE POLICY "site_visits_partner_admin_select" ON site_visits
  FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM partners WHERE owner_id = auth.uid())
  );

-- 서버사이드 Service Role: 방문 카운트 INSERT/UPDATE
CREATE POLICY "site_visits_service_insert" ON site_visits
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "site_visits_service_update" ON site_visits
  FOR UPDATE TO authenticated
  USING (true);


-- =============================================================================
-- system_logs 정책
-- ⚠️  Master Admin만 SELECT 가능
--     Partner Admin은 본인 관련 로그도 조회 불가
--     INSERT는 Service Role Key 서버사이드에서만 수행
-- =============================================================================

CREATE POLICY "system_logs_master_admin_select" ON system_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master_admin'
  ));
