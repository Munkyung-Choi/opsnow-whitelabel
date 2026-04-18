import { test, expect } from '@playwright/test'

// WL-114: proxy.ts host-first 단일화 검증
// AC-INF01a: Admin host에서만 Admin 진입 허용
// AC-INF01b: 마케팅 host에서 /admin 경로 차단
//
// CI 전제조건: /etc/hosts에 `admin-whitelabel.localhost` 등록 필요
//   127.0.0.1 admin-whitelabel.localhost
// (partner-a.localhost는 이미 등록되어 있다고 가정)

test.describe('Admin Host Isolation (WL-114)', () => {
  test('(AC-INF01b) 마케팅 host에서 /admin 접근 시 /not-found로 리다이렉트', async ({ page }) => {
    await page.goto('http://partner-a.localhost:3000/admin', {
      waitUntil: 'networkidle',
    })
    await expect(page).toHaveURL(/\/not-found/)
  })

  test('(AC-INF01a) Admin host에서 미인증 /admin/dashboard 접근 시 /auth/login 리다이렉트', async ({ browser }) => {
    // 프로젝트 storageState 상속을 차단하기 위해 빈 storageState 명시
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    try {
      await page.goto('http://admin-whitelabel.localhost:3000/admin/dashboard', {
        waitUntil: 'networkidle',
      })
      await expect(page).toHaveURL(/\/auth\/login/)
    } finally {
      await context.close()
    }
  })
})
