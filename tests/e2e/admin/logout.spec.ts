import { test, expect, type Page } from '@playwright/test'
import { TEST_ADMIN_CREDENTIALS } from '../../fixtures/seed-admin-users'

// WL-41 — Admin Logout E2E
//
// 시나리오:
//   (1) Happy Path  — 로그인 상태에서 로그아웃 버튼 클릭 → /auth/login redirect
//   (2) 재접근 차단 — 로그아웃 후 /admin/dashboard 접근 시 login으로 차단
//   (3) R1          — Impersonation 쿠키도 함께 삭제됨 (세션 사이드카 정리)
//
// 설계 노트 — 공유 세션 격리:
//   Supabase signOut은 scope=local이라도 POST /logout으로 서버에 해당 refresh_token을
//   invalidate한다. MASTER_AUTH_FILE의 refresh_token을 공유하는 병렬 워커의 다른 admin
//   테스트들과 충돌을 피하기 위해, 로그아웃 테스트는 fresh login으로 **전용 세션**을
//   발급받아 사용한다. storageState를 의도적으로 빈 상태로 override.

const ADMIN_ORIGIN = 'http://admin-whitelabel.localhost:3000'

async function loginAsMasterFresh(page: Page): Promise<void> {
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

test.describe('Admin Logout (WL-41)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('(1) Happy Path — 로그아웃 버튼 클릭 시 /auth/login redirect', async ({ page }) => {
    await loginAsMasterFresh(page)
    await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`)
    await expect(page).toHaveURL(/\/admin\/dashboard/)

    await Promise.all([
      page.waitForURL(/\/auth\/login/, { timeout: 10_000 }),
      page.locator('[data-testid="logout-button"]').click(),
    ])

    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('(2) 재접근 차단 — 로그아웃 후 /admin/dashboard 접근 시 login 리다이렉트', async ({ page }) => {
    await loginAsMasterFresh(page)
    await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`)

    await Promise.all([
      page.waitForURL(/\/auth\/login/, { timeout: 10_000 }),
      page.locator('[data-testid="logout-button"]').click(),
    ])

    // 쿠키 제거 후 dashboard 재접근 — middleware가 다시 login으로 차단해야 함
    await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('(3) R1 — Impersonation 쿠키도 함께 삭제됨', async ({ page, context }) => {
    await loginAsMasterFresh(page)

    // 임의의 impersonation 쿠키 주입 (서명 검증 대상 아님 — 존재/삭제만 확인)
    await context.addCookies([
      {
        name: 'opsnow_impersonate',
        value: 'fake.cookie.value.for.test',
        domain: 'admin-whitelabel.localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])

    await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`)
    const cookiesBefore = await context.cookies(ADMIN_ORIGIN)
    expect(cookiesBefore.some((c) => c.name === 'opsnow_impersonate')).toBe(true)

    await Promise.all([
      page.waitForURL(/\/auth\/login/, { timeout: 10_000 }),
      page.locator('[data-testid="logout-button"]').click(),
    ])

    const cookiesAfter = await context.cookies(ADMIN_ORIGIN)
    expect(cookiesAfter.some((c) => c.name === 'opsnow_impersonate')).toBe(false)
  })
})
