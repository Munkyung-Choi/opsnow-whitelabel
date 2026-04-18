import { test as setup, expect } from '@playwright/test'
import { TEST_ADMIN_CREDENTIALS } from '../fixtures/seed-admin-users'
import { MASTER_AUTH_FILE, PARTNER_AUTH_FILE } from '../fixtures/auth-files'

export { MASTER_AUTH_FILE, PARTNER_AUTH_FILE }

setup('master_admin 세션 저장', async ({ page }) => {
  await page.goto('http://admin-whitelabel.localhost:3000/auth/login')
  await page.fill('[name=email]', TEST_ADMIN_CREDENTIALS.master.email)
  await page.fill('[name=password]', TEST_ADMIN_CREDENTIALS.master.password)
  await page.click('[type=submit]')

  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 })

  await page.context().storageState({ path: MASTER_AUTH_FILE })
})

setup('partner_admin 세션 저장', async ({ page }) => {
  await page.goto('http://admin-whitelabel.localhost:3000/auth/login')
  await page.fill('[name=email]', TEST_ADMIN_CREDENTIALS.partner.email)
  await page.fill('[name=password]', TEST_ADMIN_CREDENTIALS.partner.password)
  await page.click('[type=submit]')

  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 })

  await page.context().storageState({ path: PARTNER_AUTH_FILE })
})
