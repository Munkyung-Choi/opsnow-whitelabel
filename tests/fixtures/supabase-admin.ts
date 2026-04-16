import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/supabase';

/**
 * service_role 기반 Supabase 클라이언트 팩토리 — 테스트 픽스처 전용
 *
 * RLS를 우회하여 seed/cleanup 작업을 수행한다.
 * ⚠️ 클라이언트 번들에 절대 포함하지 말 것 — globalSetup/globalTeardown에서만 호출됨
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('[globalSetup] NEXT_PUBLIC_SUPABASE_URL 환경변수가 없습니다');
  if (!key) throw new Error('[globalSetup] SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다. .env.local 확인 필요');

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
