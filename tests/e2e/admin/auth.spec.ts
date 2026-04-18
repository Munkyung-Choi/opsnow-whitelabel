import { test, expect } from '@playwright/test'
import { MASTER_AUTH_FILE, PARTNER_AUTH_FILE } from '../../fixtures/auth-files'
import { TEST_ADMIN_CREDENTIALS } from '../../fixtures/seed-admin-users'

// WL-53 — Admin 인증 E2E
//
// Admin E2E 4대 필수 시나리오 (CLAUDE.md):
//   (1) Happy Path     — 로그인 성공 플로우
//   (2) 권한 차단       — 미인증/재인증 리다이렉트
//   (3) 입력 검증       — 잘못된 자격증명 에러 표시
//   (4) 데이터 격리     — tenant-isolation.spec.ts 로 분리

const ADMIN_ORIGIN = 'http://admin-whitelabel.localhost:3000'

// POST /auth/login 응답 완료 후 명시적 goto로 세션-fresh 상태 확보.
// Next.js 16 Server Action redirect는 dev 환경에서 client-side 네비게이션 타이밍에
// 불안정한 경우가 있어, 테스트에서는 goto로 cookie-authenticated 렌더를 강제.
async function loginAsMaster(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(`${ADMIN_ORIGIN}/auth/login`)
  await page.fill('[name=email]', TEST_ADMIN_CREDENTIALS.master.email)
  await page.fill('[name=password]', TEST_ADMIN_CREDENTIALS.master.password)
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/auth/login') && r.request().method() === 'POST',
      { timeout: 15_000 }
    ),
    page.click('[type=submit]'),
  ])
}

async function loginAsPartner(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(`${ADMIN_ORIGIN}/auth/login`)
  await page.fill('[name=email]', TEST_ADMIN_CREDENTIALS.partner.email)
  await page.fill('[name=password]', TEST_ADMIN_CREDENTIALS.partner.password)
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/auth/login') && r.request().method() === 'POST',
      { timeout: 15_000 }
    ),
    page.click('[type=submit]'),
  ])
}

test.describe('Admin Auth (WL-53)', () => {
  // ── (1) Happy Path ─────────────────────────────────────────────────────────
  test('(1) Happy Path — master_admin 로그인 성공 후 /admin/dashboard', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    try {
      await loginAsMaster(page)
      await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`)
      await expect(page).toHaveURL(/\/admin\/dashboard/)
      await expect(page.locator('body')).toContainText('Master Admin')
    } finally {
      await context.close()
    }
  })

  test('(1) Happy Path — partner_admin 로그인 성공 후 /admin/dashboard', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    try {
      await loginAsPartner(page)
      await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`)
      await expect(page).toHaveURL(/\/admin\/dashboard/)
      await expect(page.locator('body')).toContainText('Partner Admin')
    } finally {
      await context.close()
    }
  })

  // ── (2) 권한 차단 ───────────────────────────────────────────────────────────
  test('(2-a) 미인증 상태 /admin/dashboard 접근 → /auth/login 리다이렉트', async ({ browser }) => {
    // WL-114 host-isolation.spec.ts와 동일 커버 — 회귀 보증용 중복 유지.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    try {
      await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`, { waitUntil: 'networkidle' })
      await expect(page).toHaveURL(/\/auth\/login/)
    } finally {
      await context.close()
    }
  })

  test('(2-b) 로그인 상태로 /auth/login 재접근 → /admin/dashboard 리다이렉트', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/auth/login`)
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 })
  })

  // ── (3) 입력 검증 ───────────────────────────────────────────────────────────
  test('(3) 잘못된 자격증명 → 에러 메시지 표시', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    try {
      await page.goto(`${ADMIN_ORIGIN}/auth/login`)
      await page.fill('[name=email]', 'nonexistent@test.local')
      await page.fill('[name=password]', 'wrong-password-xxx')
      await page.click('[type=submit]')
      await expect(
        page.getByRole('alert').filter({ hasText: '이메일 또는 비밀번호가 올바르지 않습니다' })
      ).toBeVisible({ timeout: 10_000 })
      await expect(page).toHaveURL(/\/auth\/login/)
    } finally {
      await context.close()
    }
  })

  // ── next= 파라미터 검증 (R8-01) ────────────────────────────────────────────
  test('(NEXT-01) /auth/login?next=/admin/partners → 로그인 후 /admin/partners', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    try {
      await page.goto(`${ADMIN_ORIGIN}/auth/login?next=/admin/partners`)
      await page.fill('[name=email]', TEST_ADMIN_CREDENTIALS.master.email)
      await page.fill('[name=password]', TEST_ADMIN_CREDENTIALS.master.password)
      await page.click('[type=submit]')
      await expect(page).toHaveURL(/\/admin\/partners/, { timeout: 15_000 })
    } finally {
      await context.close()
    }
  })

  test('(NEXT-02) /auth/login?next=https://evil.com → /admin/dashboard fallback', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    try {
      await page.goto(`${ADMIN_ORIGIN}/auth/login?next=${encodeURIComponent('https://evil.com')}`)
      await page.fill('[name=email]', TEST_ADMIN_CREDENTIALS.master.email)
      await page.fill('[name=password]', TEST_ADMIN_CREDENTIALS.master.password)
      await page.click('[type=submit]')
      await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 })
      expect(page.url()).not.toContain('evil.com')
    } finally {
      await context.close()
    }
  })

  test('(NEXT-03) /auth/login?next=//evil.com → /admin/dashboard fallback', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    try {
      await page.goto(`${ADMIN_ORIGIN}/auth/login?next=${encodeURIComponent('//evil.com')}`)
      await page.fill('[name=email]', TEST_ADMIN_CREDENTIALS.master.email)
      await page.fill('[name=password]', TEST_ADMIN_CREDENTIALS.master.password)
      await page.click('[type=submit]')
      await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 })
      expect(page.url()).not.toContain('evil.com')
    } finally {
      await context.close()
    }
  })

  // ── (4) 데이터 격리 → tenant-isolation.spec.ts 참조 ─────────────────────
})

export { MASTER_AUTH_FILE, PARTNER_AUTH_FILE }
