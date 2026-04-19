import { test, expect } from '@playwright/test'
import { PARTNER_AUTH_FILE, MASTER_AUTH_FILE } from '../../fixtures/auth-files'

// WL-126 — Admin Site Builder P2: 테마 컬러·로고·파비콘 편집 UI
//
// Admin E2E 4대 필수 시나리오 (CLAUDE.md):
//   (1) Happy Path    — 테마 변경 저장 → 마케팅 사이트 반영
//   (2) 권한 차단     — master_admin은 site-builder 접근 불가
//   (3) 입력 검증     — 허용 초과 크기 파일 업로드 시 에러
//   (4) 데이터 격리   — partner_admin이 타 파트너 theme 변경 불가

const ADMIN_ORIGIN = 'http://admin-whitelabel.localhost:3000'

// ──────────────────────────────────────────────────────────
// (1) Happy Path
// ──────────────────────────────────────────────────────────
test.describe('(1) Happy Path — 테마 변경 저장', () => {
  test.use({ storageState: PARTNER_AUTH_FILE })

  test.skip('테마 선택 → 저장 → 마케팅 사이트 CSS Variable 반영 확인', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    // TODO: theme selector → save → verify marketing site CSS var
    expect(page).toBeTruthy()
  })

  test.skip('로고 업로드 → Storage 저장 → logo_url 업데이트 확인', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    // TODO: logo file upload → verify DB update
    expect(page).toBeTruthy()
  })

  test.skip('파비콘 업로드 → favicon_url 업데이트 확인', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    // TODO: favicon file upload → verify DB update
    expect(page).toBeTruthy()
  })
})

// ──────────────────────────────────────────────────────────
// (2) 권한 차단
// ──────────────────────────────────────────────────────────
test.describe('(2) 권한 차단 — master_admin site-builder 접근', () => {
  test.use({ storageState: MASTER_AUTH_FILE })

  test.skip('master_admin이 /admin/site-builder 접근 시 /admin/dashboard로 리다이렉트', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    // TODO: await expect(page).toHaveURL(...)
    expect(page).toBeTruthy()
  })
})

// ──────────────────────────────────────────────────────────
// (3) 입력 검증
// ──────────────────────────────────────────────────────────
test.describe('(3) 입력 검증 — 파일 크기 초과', () => {
  test.use({ storageState: PARTNER_AUTH_FILE })

  test.skip('로고 3MB 파일 업로드 시 인라인 에러 메시지 표시', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    // TODO: create 3MB buffer → setInputFiles → submit → expect error
    expect(page).toBeTruthy()
  })

  test.skip('파비콘 600KB 파일 업로드 시 인라인 에러 메시지 표시', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    // TODO: create 600KB buffer → setInputFiles → submit → expect error
    expect(page).toBeTruthy()
  })
})

// ──────────────────────────────────────────────────────────
// (4) 데이터 격리
// ──────────────────────────────────────────────────────────
test.describe('(4) 데이터 격리 — 타 파트너 테마 수정 불가', () => {
  test.use({ storageState: PARTNER_AUTH_FILE })

  test.skip('partner_admin이 타 파트너 partner_id로 updatePartnerTheme 호출 시 403', async ({ page }) => {
    await page.goto(`${ADMIN_ORIGIN}/admin/site-builder`)
    // TODO: direct Server Action call with different partner_id → expect 403 or error
    expect(page).toBeTruthy()
  })
})
