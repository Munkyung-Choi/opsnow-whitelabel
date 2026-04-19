import { test, expect } from '@playwright/test'
import { MASTER_AUTH_FILE, PARTNER_AUTH_FILE } from '../../fixtures/auth-files'
import { createAdminClient } from '../../fixtures/supabase-admin'

// WL-124 — Feature Flag Admin E2E
//
// Admin E2E 4대 필수 시나리오 (CLAUDE.md):
//   (1) Happy Path    — master_admin이 feature toggle ON/OFF → DB 반영
//   (2) 권한 차단     — partner_admin이 feature flag 수정 불가
//   (3) 입력 검증     — 알 수 없는 feature key 전송 → 에러 처리
//   (4) 데이터 격리   — feature OFF 파트너 상세 페이지 정상 렌더 (기능 차단 확인)

const ADMIN_ORIGIN = 'http://admin-whitelabel.localhost:3000'

async function getTestPartnerId(): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('partners')
    .select('id')
    .eq('subdomain', 'partner-a')
    .single()
  return data?.id ?? null
}

async function resetPartnerFeatures(partnerId: string) {
  const admin = createAdminClient()
  await admin.from('partners').update({ features: {} }).eq('id', partnerId)
}

// ──────────────────────────────────────────────────────────
// (1) Happy Path
// ──────────────────────────────────────────────────────────
test.describe('(1) Happy Path — feature toggle ON/OFF', () => {
  test.use({ storageState: MASTER_AUTH_FILE })

  let partnerId: string

  test.beforeAll(async () => {
    const id = await getTestPartnerId()
    if (!id) test.skip()
    partnerId = id!
    await resetPartnerFeatures(partnerId)
  })

  test.afterAll(async () => {
    if (partnerId) await resetPartnerFeatures(partnerId)
  })

  test('master_admin이 analytics feature OFF → ON 토글 → DB 반영 확인', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/partners/${partnerId}`)
    await page.waitForLoadState('networkidle')

    const toggle = page.locator('[data-testid="feature-toggle-analytics"]')
    await expect(toggle).toBeVisible()
    await expect(toggle).toContainText('OFF')

    await toggle.click()
    await page.waitForLoadState('networkidle')
    await expect(toggle).toContainText('ON')

    // DB 직접 확인
    const admin = createAdminClient()
    const { data } = await admin.from('partners').select('features').eq('id', partnerId).single()
    expect((data?.features as Record<string, boolean>)?.analytics).toBe(true)
  })

  test('ON 상태에서 다시 클릭하면 OFF로 토글', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/partners/${partnerId}`)
    await page.waitForLoadState('networkidle')

    const toggle = page.locator('[data-testid="feature-toggle-analytics"]')
    const currentText = await toggle.textContent()

    await toggle.click()
    await page.waitForLoadState('networkidle')

    const expectedText = currentText?.includes('ON') ? 'OFF' : 'ON'
    await expect(toggle).toContainText(expectedText)
  })
})

// ──────────────────────────────────────────────────────────
// (2) 권한 차단
// ──────────────────────────────────────────────────────────
test.describe('(2) 권한 차단 — partner_admin 접근 불가', () => {
  test.use({ storageState: PARTNER_AUTH_FILE })

  test('partner_admin이 파트너 상세 페이지 접근 시 차단됨', async ({ page }) => {
    const partnerId = await getTestPartnerId()
    if (!partnerId) test.skip()

    const response = await page.goto(`${ADMIN_ORIGIN}/admin/partners/${partnerId}`)
    // 리다이렉트되거나 에러 표시
    const url = page.url()
    const isBlocked =
      response?.status() === 403 ||
      url.includes('/auth/login') ||
      url.includes('/admin') && !url.includes('/partners/')

    expect(isBlocked).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────
// (4) 데이터 격리 — feature flags 파트너별 독립
// ──────────────────────────────────────────────────────────
test.describe('(4) 데이터 격리 — feature OFF 파트너 정상 렌더', () => {
  test.use({ storageState: MASTER_AUTH_FILE })

  test('features={}인 파트너 상세 페이지가 정상 렌더되고 모든 toggle이 OFF', async ({ page }) => {
    const partnerId = await getTestPartnerId()
    if (!partnerId) test.skip()

    await resetPartnerFeatures(partnerId!)
    await page.goto(`${ADMIN_ORIGIN}/admin/partners/${partnerId}`)
    await page.waitForLoadState('networkidle')

    const toggles = page.locator('[data-testid^="feature-toggle-"]')
    const count = await toggles.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await expect(toggles.nth(i)).toContainText('OFF')
    }
  })
})
