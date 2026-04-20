-- =============================================================================
-- @file: 20260420000002_add_cleanup_e2e_test_users_rpc.sql
-- @ticket: WL-141
-- @description: E2E 테스트 유저의 GoTrue Soft-delete 문제를 해소하는 Hard-delete RPC.
-- @sync_target: tests/fixtures/seed-admin-users.ts (TEST_ADMIN_CREDENTIALS)
-- @note:
--   - 이메일 변경 시 본 함수와 위 TypeScript fixture를 동시에 업데이트해야 함.
--   - SECURITY DEFINER + service_role EXECUTE only — 브라우저 경로 노출 금지.
--   - auth.users 직접 DELETE로 GoTrue listUsers 사각지대(소프트 삭제) 회피.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_e2e_test_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  test_user_ids uuid[];
  deleted_count integer := 0;
BEGIN
  -- 1. 테스트 유저 ID 수집 (소프트 삭제 유저 포함 — auth.users 직접 조회)
  SELECT ARRAY_AGG(id) INTO test_user_ids
  FROM auth.users
  WHERE email IN (
    'master-admin-e2e@test.local',
    'partner-admin-e2e@test.local'
  );

  IF test_user_ids IS NULL OR array_length(test_user_ids, 1) = 0 THEN
    RETURN 0;
  END IF;

  -- 2. FK 체인 역순 정리 (RESTRICT 제약 우회)
  --    global_contents.updated_by: nullable RESTRICT → SET NULL
  UPDATE public.global_contents
     SET updated_by = NULL
   WHERE updated_by = ANY(test_user_ids);

  --    system_logs.actor_id: NOT NULL RESTRICT → DELETE
  DELETE FROM public.system_logs
   WHERE actor_id = ANY(test_user_ids);

  --    partners.owner_id: NOT NULL RESTRICT → DELETE
  --    (contents/leads/site_visits/partner_sections/domain_requests는
  --     partners.id ON DELETE CASCADE로 자동 정리됨)
  DELETE FROM public.partners
   WHERE owner_id = ANY(test_user_ids);

  --    profiles.id: CASCADE이나 명시 정리
  DELETE FROM public.profiles
   WHERE id = ANY(test_user_ids);

  -- 3. auth.users hard-delete — GoTrue 소프트 삭제 우회
  DELETE FROM auth.users
   WHERE id = ANY(test_user_ids);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- 권한: service_role에만 EXECUTE 허용 — 브라우저/클라이언트 경로 원천 차단
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.cleanup_e2e_test_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_e2e_test_users() FROM authenticated;
REVOKE ALL ON FUNCTION public.cleanup_e2e_test_users() FROM anon;
GRANT  EXECUTE ON FUNCTION public.cleanup_e2e_test_users() TO service_role;

COMMENT ON FUNCTION public.cleanup_e2e_test_users() IS
  'WL-141: E2E 테스트 유저(master-admin-e2e@test.local, partner-admin-e2e@test.local)의 FK 체인을 정리하고 auth.users를 hard-delete한다. service_role 전용.';
