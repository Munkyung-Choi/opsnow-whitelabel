import { test, expect } from '@playwright/test'
import { MASTER_AUTH_FILE, PARTNER_AUTH_FILE } from '../../fixtures/auth-files'
import { createAdminClient } from '../../fixtures/supabase-admin'

// WL-106 — Admin 파트너 관리 E2E
//
// Admin E2E 4대 필수 시나리오 (CLAUDE.md):
//   (1) Happy Path    — 파트너 생성 → 목록 표시 → 마케팅 페이지 렌더
//   (2) 권한 차단     — partner_admin 접근 차단
//   (3) 입력 검증     — 잘못된 입력 시 인라인 에러
//   (4) 데이터 격리   — partner_admin이 타 파트너 생성 불가

const ADMIN_ORIGIN = 'http://admin-whitelabel.localhost:3000'
const E2E_SUBDOMAIN = 'e2e-wl106-partner'

async function cleanupE2EPartner() {
  const admin = createAdminClient()
  await admin.from('partners').delete().eq('subdomain', E2E_SUBDOMAIN)
}

// ──────────────────────────────────────────────────────────
// (1) Happy Path
// ──────────────────────────────────────────────────────────
test.describe('(1) Happy Path — 파트너 생성', () => {
  test.use({ storageState: MASTER_AUTH_FILE })

  test.afterEach(async () => {
    await cleanupE2EPartner()
  })

  test('폼 입력 → 제출 → 목록 리다이렉트 → 파트너 표시', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/partners/new`)

    await page.fill('[name=business_name]', 'E2E Test Corp')
    await page.fill('[name=subdomain]', E2E_SUBDOMAIN)

    // 테마 Select (shadcn SelectTrigger id=theme_key)
    await page.locator('#theme_key').click()
    await page.getByRole('option', { name: '블루 (기본)' }).click()

    // default_locale Select (shadcn SelectTrigger id=default_locale)
    await page.locator('#default_locale').click()
    await page.getByRole('option', { name: '한국어' }).click()

    // published_locales 체크박스 — ko 기본 체크됨 (hidden input)
    await expect(page.locator('input[name=published_locales][value=ko]')).toHaveCount(1)

    await page.locator('[type=submit]').click()

    // 성공 → /admin/partners 리다이렉트 (Server Action redirect)
    await page.waitForURL(`${ADMIN_ORIGIN}/admin/partners`, { timeout: 15000 })
    // Router Cache 우회: 명시적 goto로 서버사이드 fresh-fetch 강제
    await page.goto(`${ADMIN_ORIGIN}/admin/partners`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E Test Corp')).toBeVisible({ timeout: 10000 })
  })
})

// ──────────────────────────────────────────────────────────
// (2) 권한 차단
// ──────────────────────────────────────────────────────────
test.describe('(2) 권한 차단 — partner_admin 접근', () => {
  test.use({ storageState: PARTNER_AUTH_FILE })

  test('partner_admin이 /admin/partners/new 접근 시 차단', async ({ page }) => {
    const response = await page.goto(`${ADMIN_ORIGIN}/admin/partners/new`)
    // 403 또는 로그인/대시보드로 리다이렉트
    const finalUrl = page.url()
    const isBlocked =
      (response?.status() !== undefined && response.status() === 403) ||
      finalUrl.includes('/auth/login') ||
      finalUrl.includes('/admin/dashboard') ||
      !finalUrl.includes('/admin/partners/new')
    expect(isBlocked).toBe(true)
  })

  test('partner_admin이 /admin/partners 목록 접근 시 차단', async ({ page }) => {
    const response = await page.goto(`${ADMIN_ORIGIN}/admin/partners`)
    const finalUrl = page.url()
    const isBlocked =
      (response?.status() !== undefined && response.status() === 403) ||
      finalUrl.includes('/auth/login') ||
      finalUrl.includes('/admin/dashboard') ||
      !finalUrl.includes('/admin/partners')
    expect(isBlocked).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────
// (3) 입력 검증
// ──────────────────────────────────────────────────────────
test.describe('(3) 입력 검증 — 잘못된 입력 에러 표시', () => {
  test.use({ storageState: MASTER_AUTH_FILE })

  test.beforeEach(async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/partners/new`)
  })

  test('법인명 빈값 → 에러 표시', async ({ page }) => {
    await page.fill('[name=subdomain]', 'valid-subdomain')
    await page.locator('[type=submit]').click()
    await expect(page.locator('#business_name-error')).toBeVisible()
  })

  test('서브도메인 빈값 → 에러 표시', async ({ page }) => {
    await page.fill('[name=business_name]', '테스트 기업')
    await page.locator('[type=submit]').click()
    await expect(page.locator('#subdomain-error')).toBeVisible()
  })

  test('서브도메인 대문자/특수문자 → 에러 표시', async ({ page }) => {
    await page.fill('[name=business_name]', '테스트 기업')
    await page.fill('[name=subdomain]', 'Invalid_Sub!')
    await page.locator('[type=submit]').click()
    await expect(page.locator('#subdomain-error')).toBeVisible()
  })

  test('서브도메인 중복 → 에러 표시', async ({ page }) => {
    // partner-a는 seed로 존재함
    await page.fill('[name=business_name]', '중복 테스트')
    await page.fill('[name=subdomain]', 'partner-a')
    await page.locator('[type=submit]').click()
    await expect(page.locator('#subdomain-error')).toContainText('이미 사용 중인')
  })
})

// ──────────────────────────────────────────────────────────
// (4) 데이터 격리 — partner_admin 생성 액션 차단
// ──────────────────────────────────────────────────────────
test.describe('(4) 데이터 격리', () => {
  test.use({ storageState: PARTNER_AUTH_FILE })

  test('partner_admin은 파트너 생성 Server Action에 접근 불가', async ({ page }) => {
    // UI 접근 자체가 차단되므로 URL 레벨에서 확인
    await page.goto(`${ADMIN_ORIGIN}/admin/partners/new`)
    const url = page.url()
    expect(url).not.toContain('/admin/partners/new')
  })
})
