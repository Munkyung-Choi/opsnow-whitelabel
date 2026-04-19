-- WL-126: partner_admin이 자신의 파트너 설정(테마·로고·파비콘)을 수정할 수 있도록 허용
--
-- 기존 정책:
--   - partners_master_admin_all     → master_admin 전체 권한
--   - partners_partner_admin_select → partner_admin SELECT만
--   - partners_public_anon_read     → 익명 SELECT
--
-- 추가 정책:
--   - partners_partner_admin_update → partner_admin이 own partner UPDATE 허용
--
-- 보안 설계:
--   USING   : get_my_role() = 'partner_admin' AND owner_id = auth.uid()
--             → 자신이 소유한 파트너 행만 UPDATE 대상으로 허용 (크로스-테넌트 차단)
--   WITH CHECK: owner_id = auth.uid()
--             → 업데이트 후 owner_id가 자신 것으로 유지돼야 함 (소유권 이전 방지)

DROP POLICY IF EXISTS "partners_partner_admin_update" ON partners;

CREATE POLICY "partners_partner_admin_update" ON partners
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'partner_admin'
    AND owner_id = auth.uid()
  )
  WITH CHECK (
    owner_id = auth.uid()
  );
