import { redirect } from 'next/navigation'
import { getCurrentUser, type CurrentUser, type UserRole } from './get-current-user'

/**
 * 현재 사용자의 역할을 검증한다.
 * 역할 불일치 시 /admin/dashboard로 redirect.
 * 미인증 시 getCurrentUser() 내부에서 /auth/login으로 redirect.
 *
 * 타입 좁히기: requireRole('partner_admin') 호출 시 반환 타입이
 * { role: 'partner_admin', partner_id: string } 로 좁혀져 callback에서
 * partner_id를 non-null string으로 안전하게 사용 가능.
 *
 * [F11-01 회귀 방지] `/admin/dashboard` 자체에는 requireRole을 호출하지 않는다.
 *   → requireRole fallback(/admin/dashboard)이 무한 리다이렉트되지 않도록
 *     dashboard는 role-agnostic(모든 인증된 관리자 접근 가능)으로 유지.
 */
export async function requireRole<R extends UserRole>(
  allowedRoles: R | readonly R[]
): Promise<Extract<CurrentUser, { role: R }>> {
  const user = await getCurrentUser()
  const roles = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]) as readonly R[]

  if (!roles.includes(user.role as R)) {
    redirect('/admin/dashboard')
  }

  return user as Extract<CurrentUser, { role: R }>
}
