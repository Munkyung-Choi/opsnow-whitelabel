-- WL-121: system_logs partner_admin self SELECT policy
-- partner_admin은 master_admin이 자기 파트너를 impersonation한 기록만 열람 가능.
-- on_behalf_of IS NULL (일반 master_admin 작업) 로그는 노출 안 됨 — 의도된 설계.

DROP POLICY IF EXISTS "system_logs_partner_admin_select_own" ON public.system_logs;

CREATE POLICY "system_logs_partner_admin_select_own"
  ON public.system_logs
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'partner_admin'
    AND on_behalf_of IN (
      SELECT id FROM public.partners WHERE owner_id = auth.uid()
    )
  );
