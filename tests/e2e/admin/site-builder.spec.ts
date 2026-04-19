import { test, expect } from '@playwright/test'
import { PARTNER_AUTH_FILE, MASTER_AUTH_FILE } from '../../fixtures/auth-files'
import { createAdminClient } from '../../fixtures/supabase-admin'
import { TEST_ADMIN_PARTNER_SLUG } from '../../fixtures/seed-admin-users'
import { TEST_PARTNER_SLUGS } from '../../fixtures/seed-partners'

// WL-126 — Admin Site Builder P2: 테마 컬러·로고·파비콘 편집 UI
//
// Admin E2E 4대 필수 시나리오 (CLAUDE.md):
//   (1) Happy Path    — 테마 변경·파일 업로드 저장 → DB 반영
//   (2) 권한 차단     — master_admin → /admin/dashboard 리다이렉트
//   (3) 입력 검증     — 크기 초과 파일 업로드 시 인라인 에러
//   (4) 데이터 격리   — 저장이 자기 파트너에만 적용됨

const ADMIN_ORIGIN = 'http://admin-whitelabel.localhost:3000'

// Standard 1×1 RGBA PNG (68 bytes) — valid image, minimal size
const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

async function getTestPartnerState() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('partners')
    .select('theme_key, logo_url, favicon_url')
    .eq('subdomain', TEST_ADMIN_PARTNER_SLUG)
    .single()
  return data
}

async function resetTestPartner() {
  const admin = createAdminClient()
  await admin
    .from('partners')
    .update({
      theme_key: 'blue',
      logo_url: null,
      favicon_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('subdomain', TEST_ADMIN_PARTNER_SLUG)
}

// ──────────────────────────────────────────────────────────
// (1) Happy Path
// ──────────────────────────────────────────────────────────
test.describe('(1) Happy Path — 테마·로고·파비콘 변경 저장', () => {
  test.describe.configure({ mode: 'serial' }) // 동일 파트너 DB 행 공유 → 직렬 실행 필수
  test.use({ storageState: PARTNER_AUTH_FILE })

  test.afterEach(async () => {
    await resetTestPartner()
  })

  test('테마 선택 → 저장 → partners.theme_key 업데이트 확인', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    await page.waitForLoadState('networkidle')

    await page.locator('#theme_key').click()
    await page.getByRole('option', { name: /Orange/i }).click()
    await page.getByRole('button', { name: '저장' }).click()

    await expect(page.getByText('저장되었습니다.')).toBeVisible({ timeout: 10000 })

    const after = await getTestPartnerState()
    expect(after?.theme_key).toBe('orange')
  })

  test('로고 업로드 → Storage 저장 → logo_url 업데이트 확인', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    await page.waitForLoadState('networkidle')

    await page.locator('[data-testid="logo-input"]').setInputFiles({
      name: 'test-logo.png',
      mimeType: 'image/png',
      buffer: MINIMAL_PNG,
    })
    await page.getByRole('button', { name: '저장' }).click()

    await expect(page.getByText('저장되었습니다.')).toBeVisible({ timeout: 20000 })

    const after = await getTestPartnerState()
    expect(after?.logo_url).toBeTruthy()
    expect(after?.logo_url).toContain('partner-logos')
  })

  test('파비콘 업로드 → favicon_url 업데이트 확인', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    await page.waitForLoadState('networkidle')

    await page.locator('[data-testid="favicon-input"]').setInputFiles({
      name: 'test-favicon.png',
      mimeType: 'image/png',
      buffer: MINIMAL_PNG,
    })
    await page.getByRole('button', { name: '저장' }).click()

    await expect(page.getByText('저장되었습니다.')).toBeVisible({ timeout: 20000 })

    const after = await getTestPartnerState()
    expect(after?.favicon_url).toBeTruthy()
    expect(after?.favicon_url).toContain('partner-favicons')
  })
})

// ──────────────────────────────────────────────────────────
// (2) 권한 차단
// ──────────────────────────────────────────────────────────
test.describe('(2) 권한 차단 — master_admin site-builder 접근', () => {
  test.use({ storageState: MASTER_AUTH_FILE })

  test('master_admin이 /admin/site-builder 접근 시 /admin/dashboard로 리다이렉트', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    await page.waitForURL(`${ADMIN_ORIGIN}/admin/dashboard`, { timeout: 10000 })
    await expect(page).toHaveURL(`${ADMIN_ORIGIN}/admin/dashboard`)
  })
})

// ──────────────────────────────────────────────────────────
// (3) 입력 검증
// ──────────────────────────────────────────────────────────
test.describe('(3) 입력 검증 — 파일 크기 초과', () => {
  test.use({ storageState: PARTNER_AUTH_FILE })

  test('로고 3MB 파일 업로드 시 인라인 에러 메시지 표시', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    await page.waitForLoadState('networkidle')

    await page.locator('[data-testid="logo-input"]').setInputFiles({
      name: 'large-logo.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(3 * 1024 * 1024),
    })

    // 클라이언트 사이드 검증 — 파일 선택 즉시 에러 표시 (저장 버튼은 비활성화됨)
    // LOGO_CONSTRAINTS.maxBytes = 2MB → 에러: "파일 크기가 2.00MB를 초과합니다."
    await expect(page.getByText('파일 크기가 2.00MB를 초과합니다.')).toBeVisible({ timeout: 10000 })
  })

  test('파비콘 600KB 파일 업로드 시 인라인 에러 메시지 표시', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    await page.waitForLoadState('networkidle')

    await page.locator('[data-testid="favicon-input"]').setInputFiles({
      name: 'large-favicon.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(600 * 1024),
    })

    // 클라이언트 사이드 검증 — 파일 선택 즉시 에러 표시 (저장 버튼은 비활성화됨)
    // FAVICON_CONSTRAINTS.maxBytes = 512KB → 에러: "파일 크기가 0.50MB를 초과합니다."
    await expect(page.getByText('파일 크기가 0.50MB를 초과합니다.')).toBeVisible({ timeout: 10000 })
  })
})

// ──────────────────────────────────────────────────────────
// (4) 데이터 격리
// ──────────────────────────────────────────────────────────
test.describe('(4) 데이터 격리 — 저장이 자기 파트너에만 적용', () => {
  test.describe.configure({ mode: 'serial' }) // afterEach reset이 Happy Path와 경합 방지
  test.use({ storageState: PARTNER_AUTH_FILE })

  test.afterEach(async () => {
    await resetTestPartner()
  })

  test('partner_admin 테마 저장이 타 파트너 theme_key에 영향 없음', async ({ page }) => {
    const admin = createAdminClient()

    // 격리 기준점: 별도 픽스처 파트너의 현재 theme_key 기록
    const { data: refBefore } = await admin
      .from('partners')
      .select('theme_key')
      .eq('subdomain', TEST_PARTNER_SLUGS.hidden)
      .single()

    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    await page.waitForLoadState('networkidle')

    await page.locator('#theme_key').click()
    await page.getByRole('option', { name: /Green/i }).click()
    await page.getByRole('button', { name: '저장' }).click()

    await expect(page.getByText('저장되었습니다.')).toBeVisible({ timeout: 10000 })

    // 타 파트너 theme_key 불변 확인
    const { data: refAfter } = await admin
      .from('partners')
      .select('theme_key')
      .eq('subdomain', TEST_PARTNER_SLUGS.hidden)
      .single()

    expect(refAfter?.theme_key).toBe(refBefore?.theme_key)
  })
})
