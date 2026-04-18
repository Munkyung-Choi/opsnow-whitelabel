-- WL-122: contents_partner_admin_write 정책 — WITH CHECK 명시 + role check 추가
-- 기존 USING 자동 복사 동작과 실효 동일. defense-in-depth로 다음을 보강:
--   (1) WITH CHECK 명시 선언 — FOR ALL을 FOR SELECT,UPDATE로 변경 시 WITH CHECK 실효 공백 방지
--   (2) get_my_role() = 'partner_admin' 명시 — master_admin이 임시 owner_id로 매칭되는 edge case 차단
-- master_admin 접근은 contents_master_admin_all 정책(OR 결합)으로 유지됨.

BEGIN;

DROP POLICY IF EXISTS "contents_partner_admin_write" ON public.contents;

CREATE POLICY "contents_partner_admin_write" ON public.contents
  FOR ALL
  TO authenticated
  USING (
    get_my_role() = 'partner_admin'
    AND partner_id IN (
      SELECT id FROM public.partners WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    get_my_role() = 'partner_admin'
    AND partner_id IN (
      SELECT id FROM public.partners WHERE owner_id = auth.uid()
    )
  );

COMMIT;
