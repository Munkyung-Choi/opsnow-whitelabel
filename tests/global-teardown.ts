import { loadEnvConfig } from '@next/env';
import { cleanupTestPartners } from './fixtures/seed-partners';
import { cleanupAdminTestUsers } from './fixtures/seed-admin-users';

/**
 * Playwright globalTeardown — 모든 테스트 완료 후 1회 실행
 *
 * partner-test-* 픽스처 파트너를 DB에서 제거한다.
 * ON DELETE CASCADE로 관련 contents, partner_sections도 자동 삭제됨.
 */
export default async function globalTeardown() {
  loadEnvConfig(process.cwd());

  console.log('[globalTeardown] 테스트 픽스처 cleanup 시작...');
  await cleanupAdminTestUsers();
  await cleanupTestPartners();
  console.log('[globalTeardown] 완료');
}
