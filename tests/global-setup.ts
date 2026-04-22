import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '@next/env';
import { cleanupTestPartners, seedTestPartners, TEST_PARTNER_SLUGS } from './fixtures/seed-partners';
import { cleanupAdminTestUsers, seedAdminTestUsers } from './fixtures/seed-admin-users';
import { E2E_ADMIN_IDS_FILE } from './fixtures/auth-files';

/**
 * Playwright globalSetup — 모든 테스트 실행 전 1회 실행
 *
 * 1. .env.local 로드 (로컬 개발환경 — Next.js dev server처럼)
 * 2. 기존 partner-test-* 행 정리 (멱등성 보장)
 * 3. 테스트 픽스처 파트너 3종 seed
 * 4. 테스트 파트너 페이지 사전 워밍 — 병렬 테스트 실행 전 Next.js SSR 캐시 생성
 *    (첫 렌더링 경쟁으로 인한 flaky 방지)
 *
 * CI 환경: SUPABASE_SERVICE_ROLE_KEY는 GitHub Actions secrets에서 주입됨
 * 로컬 환경: SUPABASE_SERVICE_ROLE_KEY는 .env.local에서 로드됨
 */
export default async function globalSetup() {
  // .env.local을 process.env에 주입 (CI에서는 이미 설정되어 있어 무해)
  loadEnvConfig(process.cwd());

  console.log('[globalSetup] 테스트 픽스처 파트너 seed 시작...');

  // 멱등성: 사전 cleanup 후 seed
  await cleanupAdminTestUsers();
  await cleanupTestPartners();
  await seedTestPartners();
  const adminIds = await seedAdminTestUsers();

  // seed에서 직접 얻은 ID를 파일로 저장 — auth.admin.listUsers가 CI 환경에서
  // 빈 결과를 반환하는 사례가 있어 listUsers 대신 이 파일을 신뢰 원천으로 사용.
  fs.mkdirSync(path.dirname(E2E_ADMIN_IDS_FILE), { recursive: true });
  fs.writeFileSync(E2E_ADMIN_IDS_FILE, JSON.stringify(adminIds));

  // 병렬 테스트 실행 전 테스트 파트너 페이지를 사전 워밍한다.
  // Next.js dev 서버는 처음 접근하는 서브도메인 페이지를 SSR 컴파일하는데,
  // 이 작업이 병렬 테스트 워커들과 경쟁하면 타임아웃이 발생할 수 있다.
  const warmupSlugs = Object.values(TEST_PARTNER_SLUGS);
  await Promise.all(
    warmupSlugs.map(async (slug) => {
      const url = `http://${slug}.localhost:3000/`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        console.log(`[globalSetup] pre-warm ${slug} → ${res.status}`);
      } catch (e) {
        // 워밍 실패는 치명적이지 않음 — 테스트 자체의 timeout이 더 넉넉하게 설정됨
        console.warn(`[globalSetup] pre-warm failed for ${slug}: ${e}`);
      }
    }),
  );

  console.log('[globalSetup] 완료');
}
