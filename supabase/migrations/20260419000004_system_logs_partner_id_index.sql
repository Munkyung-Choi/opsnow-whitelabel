-- WL-123 Part B: system_logs.partner_id 인덱스 생성
--
-- 근거: PRD §5.3 — 파트너별 감사 로그 조회가 테이블 풀스캔 없이 수행되어야 한다.
--
-- 전략 결정 (AP Architect Decision 2026-04-19):
--   - 프로덕션 `system_logs` 행 수 ≈ 2,400 (MVP 초기 단계). 10만 행 미만.
--   - 평문 `CREATE INDEX IF NOT EXISTS` 채택. Shadow Migration 실행 가능성을 최우선 근거로 삼음.
--   - CONCURRENTLY는 Docker Postgres 트랜잭션 내부 실행 불가 → 별도 파일 + 수동 실행 전략은
--     현 데이터 규모에서 불필요. Lock 시간은 체감 불가 수준.
--
-- 10만 행 초과 시 재검토: CONCURRENTLY 분리 공정으로 전환.
--
-- Partial Index (WHERE partner_id IS NOT NULL):
--   - 대다수 기존 행이 `partner_id = NULL` (일반 master 작업)이므로 NULL 행은 인덱스에서 제외.
--   - 인덱스 크기 최소화 + 쿼리 `WHERE partner_id = ?` 에서만 활용되므로 정확도 보존.

CREATE INDEX IF NOT EXISTS idx_system_logs_partner_id
  ON public.system_logs (partner_id)
  WHERE partner_id IS NOT NULL;
