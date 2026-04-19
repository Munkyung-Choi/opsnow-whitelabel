-- WL-120: Admin 쿼리 패턴 복합 인덱스 (NFR §5 스케일 대응)
-- CONCURRENTLY 미사용 결정 (WL-123과 동일 근거):
--   supabase migration up(로컬)이 pipeline 모드에서 CONCURRENTLY를 지원하지 않음.
--   프로덕션 무중단이 필요할 경우 SQL Editor에서 직접 CONCURRENTLY로 실행 가능.
-- 롤백: DROP INDEX <index_name>; 즉시 복구 가능.

-- leads: partner별 목록 + status 필터 + 최신순 정렬
CREATE INDEX IF NOT EXISTS idx_leads_partner_status_created
  ON public.leads (partner_id, status, created_at DESC);

-- contents: partner별 섹션 목록 + section_type 필터 + is_published 조건
CREATE INDEX IF NOT EXISTS idx_contents_partner_section_published
  ON public.contents (partner_id, section_type, is_published);

-- system_logs: partner별 감사 로그 최신순 조회 (WL-123 partial index 보완 — 정렬 포함)
-- 쓰기 부하: 모든 Admin 작업마다 INSERT → 향후 쓰기 부하 증가 시 인덱스 유지비용 모니터링 필요
CREATE INDEX IF NOT EXISTS idx_system_logs_partner_created
  ON public.system_logs (partner_id, created_at DESC)
  WHERE partner_id IS NOT NULL;

-- domain_requests: partner별 도메인 신청 목록 + status 필터 + 최신순 정렬
CREATE INDEX IF NOT EXISTS idx_domain_requests_partner_status_created
  ON public.domain_requests (partner_id, status, created_at DESC);
