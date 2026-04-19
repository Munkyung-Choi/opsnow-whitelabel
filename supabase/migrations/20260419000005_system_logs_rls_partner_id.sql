-- WL-123 Part C: partner_admin SELECT 정책 확장 — partner_id 기반 필터링 추가
--
-- 배경: WL-121은 `on_behalf_of IN (...)` 기반으로만 자기 파트너 관련 로그 조회 허용.
--       WL-123은 master_admin의 파트너 직편집(impersonation이 아닌 경로) 로그도 파트너에게
--       투명하게 노출하기 위해 `partner_id` 조건을 병행 추가.
--
-- Default Deny 원칙:
--   withAdminAction의 자동 주입 로직이 `PARTNER_SCOPED_TABLES` 화이트리스트에 한해서만
--   `partner_id`를 기록하므로, master의 내부 관리 활동(target_table ∉ 화이트리스트)은
--   `partner_id = NULL` 상태로 남아 partner_admin에게 노출되지 않는다.
--
-- 트랜잭션 감싸기 (R-DI-1, WL-122 패턴):
--   DROP과 CREATE 사이의 정책 부재 윈도우에서 (default-deny로 안전하나) 진행 중
--   SELECT 쿼리가 0건을 반환하는 운영 혼란을 방지하기 위해 단일 트랜잭션으로 원자 실행.

BEGIN;

DROP POLICY IF EXISTS "system_logs_partner_admin_select_own" ON public.system_logs;

CREATE POLICY "system_logs_partner_admin_select_own"
  ON public.system_logs
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'partner_admin'
    AND (
      partner_id IN (SELECT id FROM public.partners WHERE owner_id = auth.uid())
      OR on_behalf_of IN (SELECT id FROM public.partners WHERE owner_id = auth.uid())
    )
  );

COMMENT ON POLICY "system_logs_partner_admin_select_own" ON public.system_logs IS
  'WL-123: partner_id 직접 필터링 + on_behalf_of 호환 유지. 두 조건 중 하나라도 매칭되면 SELECT 허용. 화이트리스트 기반 Default Deny로 master 내부 활동은 제외됨.';

COMMIT;
