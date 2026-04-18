import { defineConfig, devices } from '@playwright/test';

/**
 * WL-85: 파트너별 섹션 렌더링 회귀 테스트
 *
 * 로컬 실행 전제조건:
 *   - Acrylic DNS Proxy 설치 + *.localhost → 127.0.0.1 설정 (CLAUDE.md §10.1 참조)
 *   - `npm run dev` 실행 중이거나 `reuseExistingServer: true` 환경
 *
 * CI 실행 전제조건:
 *   - GitHub Actions에서 /etc/hosts에 partner-a.localhost 등록 (e2e.yml 참조)
 *   - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY secrets 등록
 */
export default defineConfig({
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retry up to 2 times.
  // Local: Next.js dev server hot-reloads after code changes cause
  //   SSR compilation races for freshly-seeded test-partner pages.
  //   Two retries absorb the warm-up period reliably.
  // CI: handles transient network/timing issues (1 retry is enough there).
  retries: process.env.CI ? 1 : 2,
  // CI: 1 worker (sequential) to avoid dev-server overload
  // Local: 4 workers — higher concurrency causes Next.js dev SSR timeouts
  //   for freshly-seeded test-partner pages under parallel load
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // auth-setup: master/partner admin storageState 생성 (admin 프로젝트 의존)
    {
      name: 'auth-setup',
      testMatch: '**/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // marketing: 인증 불필요 — 마케팅 사이트 SSR 렌더링 회귀 검증
    {
      name: 'marketing',
      testMatch: '**/marketing/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // admin: master_admin storageState 사용, auth-setup 완료 후 실행
    {
      name: 'admin',
      testMatch: '**/admin/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/master.json',
      },
      dependencies: ['auth-setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    // /__proxy_health は middleware が 200 を返す専用エンドポイント — root は 404 なので NG
    url: 'http://localhost:3000/__proxy_health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // 로컬: Next.js가 .env.local을 자동 로드 — env 블록 불필요
    // CI:   GitHub Actions secrets → workflow의 env: 블록으로 주입 (e2e.yml 참조)
    ...(process.env.CI
      ? {
          env: {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
        }
      : {}),
  },
});
