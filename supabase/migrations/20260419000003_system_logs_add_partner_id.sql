-- WL-123 Part A: system_logs.partner_id 컬럼 추가 + 기존 impersonation 로그 backfill
--
-- 트리거: PRD §5.3 감사 추적 NFR / CLAUDE.md §3.4 규칙 4 (Audit Scalability).
-- 파트너별 로그 조회가 `JOIN partners` 없이 `WHERE partner_id = ?` 단일 조건으로 가능해야 한다.
--
-- FK ON DELETE NO ACTION 선택 근거:
--   기존 `on_behalf_of`와 일관된 감사 로그 불변성(audit immutability) 보장.
--   향후 파트너 hard-delete(GDPR 등) 요구 시 두 FK(on_behalf_of + partner_id)를 함께 재검토.
--
-- Backfill 분류표 (R-SM-1 증거):
--   | on_behalf_of NULL | partner_id NULL | 의미                             | Part A 동작         |
--   |-------------------|-----------------|----------------------------------|---------------------|
--   | TRUE              | TRUE            | 일반 master 작업 (대부분)        | 변경 없음 — 영구 NULL |
--   | FALSE             | TRUE            | impersonation (backfill 대상)    | partner_id ← on_behalf_of |
--   | FALSE             | FALSE           | 신규 master 직편집 / 재실행      | 변경 없음 (멱등성)   |
--   | TRUE              | FALSE           | 이론적 불가능                    | 실행 안 됨           |
--
-- 멱등성: `IF NOT EXISTS` + WHERE 조건 가드로 중복 실행 안전.

ALTER TABLE public.system_logs
  ADD COLUMN IF NOT EXISTS partner_id UUID
  REFERENCES public.partners(id) ON DELETE NO ACTION;

COMMENT ON COLUMN public.system_logs.partner_id IS
  'WL-123: 감사 대상 파트너 (NFR §5.3). PARTNER_SCOPED_TABLES 화이트리스트 작업에 한해 자동 주입. 글로벌 작업은 NULL. `JOIN partners` 없이 파트너별 직접 필터링 가능.';

-- Backfill: 기존 impersonation 로그의 on_behalf_of 값을 partner_id로 복사
UPDATE public.system_logs
SET partner_id = on_behalf_of
WHERE on_behalf_of IS NOT NULL
  AND partner_id IS NULL;
