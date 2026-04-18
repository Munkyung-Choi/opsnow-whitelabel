import { test, expect } from '@playwright/test'
import { PARTNER_AUTH_FILE } from '../../fixtures/auth-files'

// WL-53 — 테넌트 격리 E2E
//
// 격리 실패 모드 매핑:
//   - F1 Role Elevation        → partner_admin이 master-only 경로 접근 시 차단
//   - F2 Cross-Partner Access  → 다른 host에서의 admin 경로 차단 (WL-114 회귀 보증)
//   - F11-01 requireRole loop  → /admin/dashboard는 role-agnostic, 무한 리다이렉트 없음

const ADMIN_ORIGIN = 'http://admin-whitelabel.localhost:3000'
const PARTNER_A_ORIGIN = 'http://partner-a.localhost:3000'

test.describe('Admin Tenant Isolation (WL-53)', () => {
  // ── F1: Role Elevation ────────────────────────────────────────────────────
  test('(TI-01) partner_admin이 /admin/partners 접근 → /admin/dashboard redirect', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: PARTNER_AUTH_FILE })
    const page = await context.newPage()
    try {
      await page.goto(`${ADMIN_ORIGIN}/admin/partners`, { waitUntil: 'networkidle' })
      await expect(page).toHaveURL(/\/admin\/dashboard/)
    } finally {
      await context.close()
    }
  })

  // ── F11-01 회귀 방지: /admin/dashboard 는 role-agnostic ────────────────────
  test('(TI-02) master_admin → /admin/dashboard 정상 렌더', async ({ page }) => {
    // 기본 storageState가 master.json
    await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`)
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page.getByText('Master Admin으로 접속됨')).toBeVisible()
  })

  test('(TI-03) partner_admin → /admin/dashboard 정상 렌더 (role-agnostic 광장)', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: PARTNER_AUTH_FILE })
    const page = await context.newPage()
    try {
      await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`)
      await expect(page).toHaveURL(/\/admin\/dashboard/)
      await expect(page.getByText('Partner Admin으로 접속됨')).toBeVisible()
    } finally {
      await context.close()
    }
  })

  // ── F2: Cross-Host Admin 차단 (WL-114 AC-INF01b 회귀 보증) ─────────────────
  test('(TI-04) partner_admin storageState로 partner-a.localhost/admin 접근 → /not-found', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: PARTNER_AUTH_FILE })
    const page = await context.newPage()
    try {
      // partner_admin 쿠키는 admin-whitelabel host 전용 → 마케팅 host로는 전송되지 않음.
      // proxy.ts가 host 기반으로 /admin 경로 자체를 차단해야 함.
      await page.goto(`${PARTNER_A_ORIGIN}/admin`, { waitUntil: 'networkidle' })
      await expect(page).toHaveURL(/\/not-found/)
    } finally {
      await context.close()
    }
  })

  // ── 장래 시나리오 (연기) ───────────────────────────────────────────────────
  test('(TI-05) partner_admin A의 dashboard 위젯은 자기 파트너 데이터만 표시', async () => {
    test.fixme(true, 'dashboard 위젯 미구현 — WL-56 이후로 연기')
  })

  // ── F5 invariant 회귀: Vitest 단위 테스트로 이관 (auth.test.ts 참조) ──────
  // (TI-06) profiles.partner_id NULL 로그인 시 redirect — Vitest에서 mock 기반으로 검증 완료.
})
