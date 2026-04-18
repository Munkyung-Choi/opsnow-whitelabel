import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── 공통 Mocks ────────────────────────────────────────────────────────────────
// redirect()는 next/navigation에서 void → never throw 로 동작.
// 테스트에서는 throw로 시뮬레이션하여 호출 URL을 검증한다.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`__REDIRECT__:${url}`)
  }),
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

// ── withAdminAction ───────────────────────────────────────────────────────────
describe('withAdminAction', () => {
  it('미인증 → getCurrentUser가 redirect 유발', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    await expect(
      withAdminAction({}, async () => 'result')
    ).rejects.toThrow('__REDIRECT__:/auth/login')
  })

  it('requiredRole 불일치 → Error throw', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: 'some-partner-id' },
    })
    await expect(
      withAdminAction({ requiredRole: 'master_admin' }, async () => 'result')
    ).rejects.toThrow('Unauthorized: insufficient role')
  })

  it('requiredRole 미지정 → 인증만 통과, 모든 역할 허용', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: 'some-partner-id' },
    })
    const result = await withAdminAction({}, async (user) => user.role)
    expect(result).toBe('partner_admin')
  })

  it('정상 → callback(user, db) 실행 결과 반환', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: MASTER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'master_admin', partner_id: null },
    })
    const result = await withAdminAction(
      { requiredRole: 'master_admin' },
      async (user) => ({ id: user.id, role: user.role })
    )
    expect(result).toEqual({ id: MASTER_UID, role: 'master_admin' })
  })

  it('[F6 DU] partner_admin callback에서 user.partner_id가 string (non-null)', async () => {
    const partnerId = 'aaaa1111-2222-3333-4444-555566667777'
    getUserMock.mockResolvedValue({ data: { user: { id: PARTNER_UID } } })
    profileSingleMock.mockResolvedValue({
      data: { role: 'partner_admin', partner_id: partnerId },
    })
    // 아래 callback 내부에서 user.partner_id 를 string으로 직접 사용 가능해야 한다 (컴파일 성공).
    // 런타임 검증도 수행.
    const result = await withAdminAction(
      { requiredRole: 'partner_admin' },
      async (user) => {
        const scopedId: string = user.partner_id
        return scopedId
      }
    )
    expect(result).toBe(partnerId)
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
