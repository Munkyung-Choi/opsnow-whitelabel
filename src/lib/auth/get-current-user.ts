import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createSessionClient } from '@/lib/supabase/create-server-client'

export type UserRole = 'master_admin' | 'partner_admin'

// [F6] Discriminated union — partner_id가 role에 따라 null/string으로 좁혀진다.
// withAdminAction callback에서 user.role === 'partner_admin' 확인 시
// TypeScript가 partner_id를 string으로 자동 narrowing.
export type CurrentUser =
  | { id: string; role: 'master_admin'; partner_id: null }
  | { id: string; role: 'partner_admin'; partner_id: string }

interface RawProfile {
  id: string
  role: UserRole
  partner_id: string | null
}

// [F5] 역할별 invariant 화이트리스트.
// Record<UserRole, ...> 로 exhaustive 체크 — 새 역할 추가 시 컴파일 에러로 검증 누락 감지.
const ROLE_INVARIANTS: Record<UserRole, (p: RawProfile) => string | null> = {
  master_admin: (p) =>
    p.partner_id !== null
      ? `master_admin must have null partner_id (got ${p.partner_id})`
      : null,
  partner_admin: (p) =>
    !p.partner_id || p.partner_id.trim().length === 0
      ? 'partner_admin must have non-empty partner_id'
      : null,
}

function isValidRole(role: string): role is UserRole {
  return role === 'master_admin' || role === 'partner_admin'
}

/**
 * Server Component / Server Action에서 현재 인증된 사용자를 반환한다.
 *
 * 실패 경로 (Silent Fail with Auditing):
 *   - 세션 없음 → redirect('/auth/login')
 *   - profiles row 없음 → 감사 로그 + redirect('/auth/login?error=invalid_profile')
 *   - 역할 값 비정상 → 감사 로그 + redirect('/auth/login?error=invalid_profile')
 *   - 역할별 invariant 위반 → 감사 로그 + redirect('/auth/login?error=invalid_profile')
 *
 * React cache() 래핑으로 동일 request 내 중복 호출은 memoize된다.
 * Server Component ↔ Server Action 간 캐시는 공유되지 않음(서로 다른 request 범위).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createSessionClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, partner_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    await logProfileAnomaly(user.id, 'profile_not_found')
    redirect('/auth/login?error=invalid_profile')
  }

  if (!isValidRole(profile.role)) {
    await logProfileAnomaly(user.id, `unknown_role:${profile.role}`)
    redirect('/auth/login?error=invalid_profile')
  }

  const raw: RawProfile = {
    id: user.id,
    role: profile.role,
    partner_id: profile.partner_id,
  }

  const violation = ROLE_INVARIANTS[raw.role](raw)
  if (violation !== null) {
    await logProfileAnomaly(user.id, `invariant:${violation}`)
    redirect('/auth/login?error=invalid_profile')
  }

  return raw as CurrentUser
})

/**
 * 프로필 이상 징후 감사 로그.
 * TODO: /api/admin/logs 연동하여 system_logs 영속화 — 현재는 서버 콘솔로 대체.
 */
async function logProfileAnomaly(userId: string, reason: string): Promise<void> {
  console.error('[auth:profile_anomaly]', {
    userId,
    reason,
    timestamp: new Date().toISOString(),
  })
}
