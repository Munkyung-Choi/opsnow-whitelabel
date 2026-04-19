import { test, expect } from '@playwright/test'
import { PARTNER_AUTH_FILE, MASTER_AUTH_FILE } from '../../fixtures/auth-files'
import { createAdminClient } from '../../fixtures/supabase-admin'
import { TEST_ADMIN_PARTNER_SLUG } from '../../fixtures/seed-admin-users'
import { TEST_PARTNER_SLUGS } from '../../fixtures/seed-partners'

// WL-127 — Admin Site Builder P3: 섹션 콘텐츠 다국어 편집 + is_published 토글 + iframe 미리보기
//
// Admin E2E 4대 필수 시나리오 (CLAUDE.md):
//   (1) Happy Path    — hero 콘텐츠 ko/en 편집 저장 → DB 반영
//   (2) 권한 차단     — master_admin → /admin/dashboard 리다이렉트
//   (3) 입력 검증     — 빈 ko 제목 저장 시 인라인 에러
//   (4) 데이터 격리   — 저장이 자기 파트너 섹션에만 적용
//
// 그룹 (1)(3)(4)는 동일 파트너 hero 행을 공유하므로 파일 전체를 serial로 실행한다.
test.describe.configure({ mode: 'serial' })

const ADMIN_ORIGIN = 'http://admin-whitelabel.localhost:3000'

async function getTestPartnerHeroContent() {
  const admin = createAdminClient()
  const { data: partner } = await admin
    .from('partners')
    .select('id')
    .eq('subdomain', TEST_ADMIN_PARTNER_SLUG)
    .single()
  if (!partner) return null

  const { data } = await admin
    .from('contents')
    .select('title, subtitle, is_published')
    .eq('partner_id', partner.id)
    .eq('section_type', 'hero')
    .single()
  return data
}

async function resetTestPartnerHero() {
  const admin = createAdminClient()
  const { data: partner } = await admin
    .from('partners')
    .select('id')
    .eq('subdomain', TEST_ADMIN_PARTNER_SLUG)
    .single()
  if (!partner) return

  await admin
    .from('contents')
    .update({
      title: { ko: '테스트 히어로 제목', en: 'Test Hero Title' },
      subtitle: { ko: '테스트 부제목', en: 'Test Subtitle' },
      is_published: true,
      updated_at: new Date().toISOString(),
    })
    .eq('partner_id', partner.id)
    .eq('section_type', 'hero')
}

async function ensureHeroContentExists() {
  const admin = createAdminClient()
  const { data: partner } = await admin
    .from('partners')
    .select('id')
    .eq('subdomain', TEST_ADMIN_PARTNER_SLUG)
    .single()
  if (!partner) return

  // upsert — 트리거로 이미 존재할 수도 있음
  await admin
    .from('contents')
    .upsert({
      partner_id: partner.id,
      section_type: 'hero',
      title: { ko: '테스트 히어로 제목', en: 'Test Hero Title' },
      subtitle: { ko: '테스트 부제목', en: 'Test Subtitle' },
      is_published: true,
    }, { onConflict: 'partner_id,section_type' })
}

// ──────────────────────────────────────────────────────────
// (1) Happy Path
// ──────────────────────────────────────────────────────────
test.describe('(1) Happy Path — 섹션 콘텐츠 편집 저장', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ storageState: PARTNER_AUTH_FILE })

  test.beforeAll(async () => {
    await ensureHeroContentExists()
  })

  test.afterEach(async () => {
    await resetTestPartnerHero()
  })

  test('hero 한국어 제목 편집 저장 → contents.title DB 반영', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder/content`)
    await page.waitForLoadState('networkidle')

    const titleInput = page.locator('[data-testid="hero-title-ko"]')
    await titleInput.clear()
    await titleInput.fill('새 히어로 제목')

    await page.locator('[data-testid="save-hero"]').click()
    await expect(page.getByText('저장되었습니다.')).toBeVisible({ timeout: 10000 })

    const after = await getTestPartnerHeroContent()
    const title = typeof after?.title === 'object'
      ? (after.title as Record<string, string>)?.ko
      : null
    expect(title).toBe('새 히어로 제목')
  })

  test('영어 탭 전환 후 영어 제목 입력 → ko 값 유지 (dirty state 없음)', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder/content`)
    await page.waitForLoadState('networkidle')

    // ko 제목 먼저 입력
    const koInput = page.locator('[data-testid="hero-title-ko"]')
    await koInput.clear()
    await koInput.fill('한국어 제목 유지')

    // en 탭으로 전환 → 영어 제목 입력
    await page.getByRole('tab', { name: 'English' }).click()
    await page.locator('[data-testid="hero-title-en"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('[data-testid="hero-title-en"]').fill('English title')

    // 저장
    await page.locator('[data-testid="save-hero"]').click()
    await expect(page.getByText('저장되었습니다.')).toBeVisible({ timeout: 10000 })

    const after = await getTestPartnerHeroContent()
    const title = after?.title as Record<string, string> | null
    expect(title?.ko).toBe('한국어 제목 유지')
    expect(title?.en).toBe('English title')
  })

  test('is_published 토글 OFF → DB is_published = false', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder/content`)
    await page.waitForLoadState('networkidle')

    await page.locator('[data-testid="publish-toggle-hero"]').click()
    // Server Action 완료 후 페이지가 미발행 상태로 재렌더링될 때까지 대기
    await expect(page.getByText('미발행')).toBeVisible({ timeout: 10000 })

    const after = await getTestPartnerHeroContent()
    expect(after?.is_published).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────
// (2) 권한 차단
// ──────────────────────────────────────────────────────────
test.describe('(2) 권한 차단 — master_admin 접근', () => {
  test.use({ storageState: MASTER_AUTH_FILE })

  test('master_admin이 /admin/site-builder/content 접근 시 /admin/dashboard 리다이렉트', async ({
    page,
  }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder/content`)
    await page.waitForURL(`${ADMIN_ORIGIN}/admin/dashboard`, { timeout: 10000 })
    await expect(page).toHaveURL(`${ADMIN_ORIGIN}/admin/dashboard`)
  })
})

// ──────────────────────────────────────────────────────────
// (3) 입력 검증
// ──────────────────────────────────────────────────────────
test.describe('(3) 입력 검증 — 빈 값 저장', () => {
  test.use({ storageState: PARTNER_AUTH_FILE })

  test.beforeAll(async () => {
    await ensureHeroContentExists()
  })

  test('hero 한국어 제목 빈 값 저장 시 인라인 에러 표시', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder/content`)
    await page.waitForLoadState('networkidle')

    const titleInput = page.locator('[data-testid="hero-title-ko"]')
    await titleInput.clear()

    await page.locator('[data-testid="save-hero"]').click()
    await expect(page.getByText('한국어 제목을 입력하세요.')).toBeVisible({ timeout: 10000 })
  })
})

// ──────────────────────────────────────────────────────────
// (4) 데이터 격리
// ──────────────────────────────────────────────────────────
test.describe('(4) 데이터 격리 — 저장이 자기 파트너에만 적용', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ storageState: PARTNER_AUTH_FILE })

  test.beforeAll(async () => {
    await ensureHeroContentExists()
  })

  test.afterEach(async () => {
    await resetTestPartnerHero()
  })

  test('partner_admin hero 저장이 타 파트너 hero에 영향 없음', async ({ page }) => {
    const admin = createAdminClient()

    // 기준점: 타 파트너 현재 hero title 기록
    const { data: refPartner } = await admin
      .from('partners')
      .select('id')
      .eq('subdomain', TEST_PARTNER_SLUGS.hidden)
      .single()
    const { data: refBefore } = await admin
      .from('contents')
      .select('title')
      .eq('partner_id', refPartner!.id)
      .eq('section_type', 'hero')
      .maybeSingle()

    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder/content`)
    await page.waitForLoadState('networkidle')

    const titleInput = page.locator('[data-testid="hero-title-ko"]')
    await titleInput.clear()
    await titleInput.fill('격리 테스트 제목')
    await page.locator('[data-testid="save-hero"]').click()
    await expect(page.getByText('저장되었습니다.')).toBeVisible({ timeout: 10000 })

    // 타 파트너 hero title 불변 확인
    const { data: refAfter } = await admin
      .from('contents')
      .select('title')
      .eq('partner_id', refPartner!.id)
      .eq('section_type', 'hero')
      .maybeSingle()

    expect(JSON.stringify(refAfter?.title)).toBe(JSON.stringify(refBefore?.title))
  })
})
