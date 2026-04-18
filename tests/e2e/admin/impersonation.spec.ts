import { test, expect } from '@playwright/test'
import { PARTNER_AUTH_FILE } from '../../fixtures/auth-files'
import { createAdminClient } from '../../fixtures/supabase-admin'
import {
  TEST_ADMIN_PARTNER_SLUG,
  TEST_ADMIN_CREDENTIALS,
} from '../../fixtures/seed-admin-users'

// WL-51 — Impersonation E2E
//
// Admin 4대 필수 시나리오 매핑:
//   (1) Happy Path  — IMP-01/02/03 (시작·유지·종료)
//   (2) 권한 차단   — IMP-04/08 (partner_admin · 미인증)
//   (3) 입력 검증   — IMP-05 (비활성 파트너)
//   (4) 데이터 격리 — IMP-06 (중복 차단), IMP-07 (system_logs 기록)

const ADMIN_ORIGIN = 'http://admin-whitelabel.localhost:3000'

let E2E_PARTNER_ID: string
let MASTER_UID: string

test.beforeAll(async () => {
  const admin = createAdminClient()

  const { data: partner, error: partnerError } = await admin
    .from('partners')
    .select('id')
    .eq('subdomain', TEST_ADMIN_PARTNER_SLUG)
    .single()
  if (partnerError || !partner) {
    throw new Error(`[impersonation.spec] E2E 파트너 조회 실패: ${partnerError?.message}`)
  }
  E2E_PARTNER_ID = partner.id

  const { data: users } = await admin.auth.admin.listUsers()
  const master = users.users.find((u) => u.email === TEST_ADMIN_CREDENTIALS.master.email)
  if (!master) throw new Error('[impersonation.spec] master 사용자 조회 실패')
  MASTER_UID = master.id
})

// 각 테스트 시작 전에 남아있는 impersonation 쿠키·로그 잔존 방지 (IMP-06 등 독립성 보장)
async function cleanupImpersonation(page: import('@playwright/test').Page) {
  await page.request.delete(`${ADMIN_ORIGIN}/api/admin/impersonate`).catch(() => {})
}

// serial: 같은 MASTER_UID + E2E_PARTNER_ID를 공유하므로 5초 dupe-log 체크 + 쿠키 상태가
// 병렬 worker 간 간섭하지 않도록 직렬 실행 강제.
test.describe.serial('Admin Impersonation (WL-51)', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupImpersonation(page)
  })

  test.afterEach(async ({ page }) => {
    await cleanupImpersonation(page)
  })

  // ── (1) Happy Path ─────────────────────────────────────────────────────────
  test('(IMP-01) master_admin 대리접속 시작 → 배너 노출', async ({ page }) => {
    const res = await page.request.post(`${ADMIN_ORIGIN}/api/admin/impersonate`, {
      data: { partner_id: E2E_PARTNER_ID },
    })
    expect(res.ok()).toBe(true)

    await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`)
    await expect(page.getByRole('alert').filter({ hasText: '대리 접속 중' })).toBeVisible()
    await expect(page.getByText('E2E Admin Test Partner')).toBeVisible()
  })

  test('(IMP-02) 대리접속 중 다른 /admin 페이지에서도 배너 유지', async ({ page }) => {
    await page.request.post(`${ADMIN_ORIGIN}/api/admin/impersonate`, {
      data: { partner_id: E2E_PARTNER_ID },
    })

    await page.goto(`${ADMIN_ORIGIN}/admin/partners`)
    await expect(page.getByRole('alert').filter({ hasText: '대리 접속 중' })).toBeVisible()

    await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`)
    await expect(page.getByRole('alert').filter({ hasText: '대리 접속 중' })).toBeVisible()
  })

  test('(IMP-03) 대리접속 종료 → 배너 제거 + 쿠키 제거', async ({ page }) => {
    await page.request.post(`${ADMIN_ORIGIN}/api/admin/impersonate`, {
      data: { partner_id: E2E_PARTNER_ID },
    })
    await page.goto(`${ADMIN_ORIGIN}/admin/dashboard`)
    await expect(page.getByRole('alert').filter({ hasText: '대리 접속 중' })).toBeVisible()

    await page.getByRole('button', { name: /대리 접속 종료/ }).click()
    await expect(page.getByRole('alert').filter({ hasText: '대리 접속 중' })).toBeHidden()

    const cookies = await page.context().cookies()
    expect(cookies.find((c) => c.name === 'opsnow_impersonate')).toBeUndefined()
  })

  // ── (2) 권한 차단 ───────────────────────────────────────────────────────────
  test('(IMP-04) partner_admin이 POST /api/admin/impersonate → 403', async ({ browser }) => {
    const context = await browser.newContext({ storageState: PARTNER_AUTH_FILE })
    try {
      const res = await context.request.post(`${ADMIN_ORIGIN}/api/admin/impersonate`, {
        data: { partner_id: E2E_PARTNER_ID },
      })
      expect(res.status()).toBe(403)
    } finally {
      await context.close()
    }
  })

  test('(IMP-08) 미인증 상태에서 POST → 리다이렉트(getCurrentUser) 또는 401', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    try {
      const res = await context.request.post(
        `${ADMIN_ORIGIN}/api/admin/impersonate`,
        {
          data: { partner_id: E2E_PARTNER_ID },
          maxRedirects: 0,
        }
      )
      // getCurrentUser는 /auth/login으로 redirect throw — Next.js는 302/307을 반환
      // 혹은 redirect가 catch되어 500을 반환할 수 있음 — 성공 2xx가 아닌 것만 확인
      expect(res.ok()).toBe(false)
    } finally {
      await context.close()
    }
  })

  // ── (3) 입력 검증 ───────────────────────────────────────────────────────────
  test('(IMP-05) 비활성 파트너로 대리접속 시도 → 400', async ({ page }) => {
    const admin = createAdminClient()
    // 대상 파트너 임시 비활성화
    await admin.from('partners').update({ is_active: false }).eq('id', E2E_PARTNER_ID)

    try {
      const res = await page.request.post(`${ADMIN_ORIGIN}/api/admin/impersonate`, {
        data: { partner_id: E2E_PARTNER_ID },
      })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('partner_inactive')
    } finally {
      // 복구
      await admin.from('partners').update({ is_active: true }).eq('id', E2E_PARTNER_ID)
    }
  })

  // ── (4) 데이터 격리 ─────────────────────────────────────────────────────────
  test('(IMP-06) 대리접속 중 재시작 시도 → 409', async ({ page }) => {
    const first = await page.request.post(`${ADMIN_ORIGIN}/api/admin/impersonate`, {
      data: { partner_id: E2E_PARTNER_ID },
    })
    expect(first.ok()).toBe(true)

    const second = await page.request.post(`${ADMIN_ORIGIN}/api/admin/impersonate`, {
      data: { partner_id: E2E_PARTNER_ID },
    })
    expect(second.status()).toBe(409)
  })

  test('(IMP-07) system_logs에 impersonate_start/_end 쌍 + actor_id/on_behalf_of 정확', async ({
    page,
  }) => {
    const admin = createAdminClient()

    // 테스트 격리: 기존 impersonation 로그 삭제로 clock skew와 이전 테스트 잔존 로그 영향 제거.
    // 5초 dupe-log 방어는 end가 존재하면 통과하므로 재시작 가능.
    await admin
      .from('system_logs')
      .delete()
      .in('action', ['impersonate_start', 'impersonate_end'])
      .eq('actor_id', MASTER_UID)
      .eq('on_behalf_of', E2E_PARTNER_ID)

    const resStart = await page.request.post(`${ADMIN_ORIGIN}/api/admin/impersonate`, {
      data: { partner_id: E2E_PARTNER_ID },
    })
    expect(resStart.ok()).toBe(true)

    const resStop = await page.request.delete(`${ADMIN_ORIGIN}/api/admin/impersonate`)
    expect(resStop.ok()).toBe(true)

    const { data: logs, error } = await admin
      .from('system_logs')
      .select('action, actor_id, on_behalf_of, target_id, target_table')
      .in('action', ['impersonate_start', 'impersonate_end'])
      .eq('actor_id', MASTER_UID)
      .eq('on_behalf_of', E2E_PARTNER_ID)
      .order('created_at', { ascending: true })

    expect(error).toBeNull()
    expect(logs).toHaveLength(2)
    expect(logs![0].action).toBe('impersonate_start')
    expect(logs![0].actor_id).toBe(MASTER_UID)
    expect(logs![0].on_behalf_of).toBe(E2E_PARTNER_ID)
    expect(logs![0].target_table).toBe('partners')
    expect(logs![0].target_id).toBe(E2E_PARTNER_ID)
    expect(logs![1].action).toBe('impersonate_end')
    expect(logs![1].actor_id).toBe(MASTER_UID)
    expect(logs![1].on_behalf_of).toBe(E2E_PARTNER_ID)
  })
})
