-- =============================================================================
-- Migration: 20260408000004_indexes.sql
-- Description: 성능 최적화를 위한 인덱스 생성
-- ⚠️  실행 전제: 20260408000001 ~ 20260408000003 실행 완료 필수
-- =============================================================================


-- partners: 도메인 기반 미들웨어 라우팅 성능 최적화 (핵심 인덱스)
CREATE INDEX idx_partners_subdomain     ON partners (subdomain);
CREATE INDEX idx_partners_custom_domain ON partners (custom_domain);

-- contents: 파트너별 콘텐츠 조회
CREATE INDEX idx_contents_partner_id ON contents (partner_id);

-- leads: 파트너별 리드 조회 및 정렬
CREATE INDEX idx_leads_partner_id  ON leads (partner_id);
CREATE INDEX idx_leads_created_at  ON leads (created_at DESC);
CREATE INDEX idx_leads_status      ON leads (status);

-- global_contents: 섹션 타입으로 직접 조회
CREATE INDEX idx_global_contents_section_type ON global_contents (section_type);

-- site_visits: 파트너별 날짜 기반 집계
CREATE INDEX idx_site_visits_partner_date ON site_visits (partner_id, visit_date DESC);

-- system_logs: 감사 로그 조회 (행위자, 대상 파트너, 시간순)
CREATE INDEX idx_system_logs_actor_id     ON system_logs (actor_id);
CREATE INDEX idx_system_logs_on_behalf_of ON system_logs (on_behalf_of);
CREATE INDEX idx_system_logs_created_at   ON system_logs (created_at DESC);
