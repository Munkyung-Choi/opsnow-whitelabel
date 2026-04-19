import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── 공통 Mocks ────────────────────────────────────────────────────────────────
// redirect()는 next/navigation에서 void → never throw 로 동작.
// 테스트에서는 throw로 시뮬레이션하여 호출 URL을 검증한다.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`__REDIRECT__:${url}`)
  }),
}))

// revalidatePath mock — next/cache의 serverside cache 갱신 훅.
const revalidatePathMock = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidatePathMock(path),
}))

// writeAuditLog mock — 호출 인자 검증 + 실패 시나리오 주입.
const writeAuditLogMock = vi.fn()
vi.mock('@/lib/audit/write-audit-log', () => ({
  writeAuditLog: (entry: unknown) => writeAuditLogMock(entry),
}))

// React cache()는 Server Component runtime 의존 — 테스트에서는 identity로 대체.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    cache: <F extends (...args: unknown[]) => unknown>(fn: F): F => fn,
  }
})

const getUserMock = vi.fn()
const profileSingleMock = vi.fn()

vi.mock('@/lib/supabase/create-server-client', () => ({
  createSessionClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({ single: profileSingleMock }),
      }),
    }),
  })),
  createActionClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({ single: profileSingleMock }),
      }),
    }),
  })),
}))

import { getCurrentUser } from './get-current-user'
import { requireRole } from './require-role'
import { withAdminAction } from './with-admin-action'

const MASTER_UID = '00000000-0000-0000-0000-000000000001'
const PARTNER_UID = '00000000-0000-0000-0000-000000000002'
const PARTNER_B_UID = '00000000-0000-0000-0000-000000000003'

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  writeAuditLogMock.mockResolvedValue(undefined)
  revalidatePathMock.mockReturnValue(undefined)
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

// ── getCurrentUser ────────────────────────────────────────────────────────────
describe('getCurrentUser', () => {
  it('세션 없음 → redirect("/auth/login")', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    await expect(getCurrentUser()).rejects.toThrow('__REDIRECT__:/auth/login')
  })

  it('세션 있음, profiles row 없음 → redirect + 감사 로그', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({ data: null })
    await expect(getCurrentUser()).rejects.toThrow(
      '__REDIRECT__:/auth/login?error=invalid_profile'
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[auth:profile_anomaly]',
      expect.objectContaining({ userId: MASTER_UID, reason: 'profile_not_found' })
    )
  })

  it('[F5] master_admin + partner_id !== null → invariant 위반 redirect + audit', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: 'leaked-partner-id' },
    })
    await expect(getCurrentUser()).rejects.toThrow(
      '__REDIRECT__:/auth/login?error=invalid_profile'
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[auth:profile_anomaly]',
      expect.objectContaining({
        userId: MASTER_UID,
        reason: expect.stringContaining('invariant:master_admin must have null partner_id'),
      })
    )
  })

  it('[F5] partner_admin + partner_id === null → invariant 위반 redirect + audit', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: null },
    })
    await expect(getCurrentUser()).rejects.toThrow(
      '__REDIRECT__:/auth/login?error=invalid_profile'
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[auth:profile_anomaly]',
      expect.objectContaining({
        userId: PARTNER_UID,
        reason: expect.stringContaining('invariant:partner_admin must have non-empty partner_id'),
      })
    )
  })

  it('[F5] partner_admin + partner_id === "" (빈 문자열) → invariant 위반', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: '   ' },
    })
    await expect(getCurrentUser()).rejects.toThrow(
      '__REDIRECT__:/auth/login?error=invalid_profile'
    )
  })

  it('[F4] 알 수 없는 role 값 → unknown_role 감사 로그 + redirect', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'super_admin', partner_id: null },
    })
    await expect(getCurrentUser()).rejects.toThrow(
      '__REDIRECT__:/auth/login?error=invalid_profile'
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[auth:profile_anomaly]',
      expect.objectContaining({ reason: 'unknown_role:super_admin' })
    )
  })

  it('[F6 DU] master_admin 정상 → { role: "master_admin", partner_id: null }', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: null },
    })
    const user = await getCurrentUser()
    expect(user).toEqual({
      id: MASTER_UID,
      role: 'master_admin',
      partner_id: null,
    })
  })

  it('[F6 DU] partner_admin 정상 → { role: "partner_admin", partner_id: UUID }', async () => {
    const partnerId = 'aaaa1111-2222-3333-4444-555566667777'
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: partnerId },
    })
    const user = await getCurrentUser()
    expect(user).toEqual({
      id: PARTNER_UID,
      role: 'partner_admin',
      partner_id: partnerId,
    })
  })
})

// ── requireRole ───────────────────────────────────────────────────────────────
describe('requireRole', () => {
  it('역할 일치 (master_admin) → user 객체 반환', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: null },
    })
    const user = await requireRole('master_admin')
    expect(user.role).toBe('master_admin')
    expect(user.partner_id).toBeNull()
  })

  it('역할 배열 중 하나 일치 → user 객체 반환', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: null },
    })
    const user = await requireRole(['master_admin', 'partner_admin'])
    expect(user.role).toBe('master_admin')
  })

  it('역할 불일치 (partner_admin이 master_admin 요구) → redirect("/admin/dashboard")', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: 'some-partner-id' },
    })
    await expect(requireRole('master_admin')).rejects.toThrow(
      '__REDIRECT__:/admin/dashboard'
    )
  })
})

// ── withAdminAction v2 (WL-119) ───────────────────────────────────────────────
describe('withAdminAction v2', () => {
  it('미인증 → getCurrentUser가 redirect 유발', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    await expect(
      withAdminAction({ auditAction: 'test.noop' }, async () => ({ result: 'x' }))
    ).rejects.toThrow('__REDIRECT__:/auth/login')
  })

  it('requiredRole 불일치 → Error throw', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: 'some-partner-id' },
    })
    await expect(
      withAdminAction(
        { requiredRole: 'master_admin', auditAction: 'test.noop' },
        async () => ({ result: 'x' })
      )
    ).rejects.toThrow('Unauthorized: insufficient role')
  })

  it('requiredRole 미지정 → 인증만 통과, 모든 역할 허용', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: 'some-partner-id' },
    })
    const result = await withAdminAction(
      { auditAction: 'test.noop' },
      async (user) => ({ result: user.role })
    )
    expect(result).toBe('partner_admin')
  })

  it('정상 → callback.result 반환 (auditDetails는 stripped)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: null },
    })
    const result = await withAdminAction(
      { requiredRole: 'master_admin', auditAction: 'test.noop' },
      async (user) => ({ result: { id: user.id, role: user.role } })
    )
    expect(result).toEqual({ id: MASTER_UID, role: 'master_admin' })
  })

  it('[F6 DU] partner_admin callback에서 user.partner_id가 string (non-null)', async () => {
    const partnerId = 'aaaa1111-2222-3333-4444-555566667777'
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: partnerId },
    })
    const result = await withAdminAction(
      { requiredRole: 'partner_admin', auditAction: 'test.noop' },
      async (user) => {
        const scopedId: string = user.partner_id
        return { result: scopedId }
      }
    )
    expect(result).toBe(partnerId)
  })

  // ── v2 신규: 자동 audit + revalidate ─────────────────────────────────────
  it('auditDetails 존재 → writeAuditLog 자동 호출 (action 포함)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: null },
    })
    await withAdminAction(
      { requiredRole: 'master_admin', auditAction: 'partner.create' },
      async () => ({
        result: { ok: true },
        auditDetails: {
          target_table: 'partners',
          target_id: 'partner-123',
          diff: { after: { subdomain: 'demo' } },
        },
      })
    )
    expect(writeAuditLogMock).toHaveBeenCalledTimes(1)
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: MASTER_UID,
        action: 'partner.create',
        target_table: 'partners',
        target_id: 'partner-123',
      })
    )
  })

  it('auditDetails 없음 (early return) → writeAuditLog 미호출 + revalidate 미호출', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: null },
    })
    await withAdminAction(
      {
        requiredRole: 'master_admin',
        auditAction: 'partner.create',
        revalidate: '/admin/partners',
      },
      async () => ({ result: { fieldErrors: { subdomain: 'duplicate' } } })
    )
    expect(writeAuditLogMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('revalidate 단일 경로 → revalidatePath 1회 호출', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: null },
    })
    await withAdminAction(
      {
        requiredRole: 'master_admin',
        auditAction: 'partner.create',
        revalidate: '/admin/partners',
      },
      async () => ({
        result: { ok: true },
        auditDetails: { target_table: 'partners' },
      })
    )
    expect(revalidatePathMock).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/partners')
  })

  it('revalidate 배열 → 각 경로별 호출', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: null },
    })
    await withAdminAction(
      {
        requiredRole: 'master_admin',
        auditAction: 'partner.create',
        revalidate: ['/admin/partners', '/admin/dashboard'],
      },
      async () => ({
        result: { ok: true },
        auditDetails: { target_table: 'partners' },
      })
    )
    expect(revalidatePathMock).toHaveBeenCalledTimes(2)
    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, '/admin/partners')
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, '/admin/dashboard')
  })

  // R-3 (Partial Failure): audit 실패 시 helper throw + revalidate 미실행
  it('writeAuditLog 실패 → helper throw, revalidate 미호출 (Audit Integrity)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: null },
    })
    writeAuditLogMock.mockRejectedValueOnce(new Error('[audit] system_logs write failed: db down'))
    await expect(
      withAdminAction(
        {
          requiredRole: 'master_admin',
          auditAction: 'partner.create',
          revalidate: '/admin/partners',
        },
        async () => ({
          result: { ok: true },
          auditDetails: { target_table: 'partners' },
        })
      )
    ).rejects.toThrow('[audit] system_logs write failed')
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  // Redirect Integrity: audit 호출이 await으로 완료된 뒤 return (fire-and-forget 아님)
  it('audit 호출 완료 전 return하지 않는다 (await 순서)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: null },
    })
    let auditCompleted = false
    writeAuditLogMock.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10))
      auditCompleted = true
    })
    const result = await withAdminAction(
      { requiredRole: 'master_admin', auditAction: 'partner.create' },
      async () => ({
        result: 'done',
        auditDetails: { target_table: 'partners' },
      })
    )
    expect(auditCompleted).toBe(true)
    expect(result).toBe('done')
  })
})

// ── 격리 시나리오 (추가 회귀 방지) ──────────────────────────────────────────
describe('Cross-Partner Isolation Regression', () => {
  it('partner_admin A 세션에서 다른 파트너 ID를 하드코딩해도 user.partner_id는 본인 것', async () => {
    const partnerA_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: partnerA_id },
    })
    const user = await getCurrentUser()
    expect(user.partner_id).toBe(partnerA_id) // 세션 주체 본인의 partner_id
  })

  it('다른 UID 세션에서 다른 partner_id 반환 (세션 스위칭 정합성)', async () => {
    const partnerB_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_B_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: partnerB_id },
    })
    const user = await getCurrentUser()
    expect(user.id).toBe(PARTNER_B_UID)
    expect(user.partner_id).toBe(partnerB_id)
  })
})
