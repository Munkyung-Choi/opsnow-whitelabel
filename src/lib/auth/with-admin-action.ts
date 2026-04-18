import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { createActionClient } from '@/lib/supabase/create-server-client'
import { getCurrentUser, type CurrentUser, type UserRole } from './get-current-user'

type AdminCallback<T, R extends UserRole> = (
  user: Extract<CurrentUser, { role: R }>,
  db: SupabaseClient<Database>
) => Promise<T>

interface WithAdminActionOptions<R extends UserRole> {
  requiredRole?: R | readonly R[]
}

/**
 * Admin Server Action 7단계 보안 체크체인 래퍼.
 *
 * 이 함수가 보장하는 단계:
 *   Step 1: 인증 확인 — 미인증 시 redirect('/auth/login')
 *   Step 2: 역할 확인 — 불일치 시 Error throw
 *   Step 3: 소유권 컨텍스트 제공 — user.partner_id 를 callback에 전달
 *
 * callback이 책임지는 단계 — **누락 시 시스템이 막지 못한다**:
 *   Step 4: 입력 검증 (Zod safeParse)
 *   Step 5: 변경 실행 (DB mutation)
 *     ⚠️ [R2-01] partner_admin mutation은 **반드시 `.eq('partner_id', user.partner_id)`**
 *        WHERE 절을 포함해야 한다. 누락 시 RLS가 2차 방어선이지만,
 *        ownership 기준(partners.owner_id vs profiles.partner_id) 불일치 시
 *        앱 레이어 검증이 유일한 방어선이 된다. SECURITY.md §이중 SSOT 참조.
 *   Step 6: 감사 로그 (supabaseAdmin via /api/admin/logs)
 *   Step 7: 캐시 무효화 (revalidatePath / revalidateTag)
 *
 * 타입 좁히기:
 *   withAdminAction({ requiredRole: 'partner_admin' }, async (user, db) => {
 *     // user.partner_id 는 TypeScript가 string으로 좁혀줌 (null 불가)
 *     // [F6] master_admin/partner_admin 혼동 방지
 *   })
 */
export async function withAdminAction<T, R extends UserRole = UserRole>(
  options: WithAdminActionOptions<R>,
  callback: AdminCallback<T, R>
): Promise<T> {
  // Step 1: 인증 확인
  const user = await getCurrentUser()

  // Step 2: 역할 확인
  if (options.requiredRole) {
    const roles = (Array.isArray(options.requiredRole)
      ? options.requiredRole
      : [options.requiredRole]) as readonly R[]
    if (!roles.includes(user.role as R)) {
      throw new Error('Unauthorized: insufficient role')
    }
  }

  // Step 3: 소유권 컨텍스트 → callback이 user.partner_id 로 WHERE 조건 구성
  const db = await createActionClient()
  return callback(user as Extract<CurrentUser, { role: R }>, db)
}
