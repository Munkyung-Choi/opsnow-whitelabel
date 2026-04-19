import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { createActionClient } from '@/lib/supabase/create-server-client'
import { getCurrentUser, type CurrentUser, type UserRole } from './get-current-user'
import { writeAuditLog } from '@/lib/audit/write-audit-log'
import { resolvePartnerId, PARTNER_SCOPED_TABLES } from './resolve-partner-id'

// Re-export for public API continuity (기존 호출자가 with-admin-action에서 import)
export { resolvePartnerId, PARTNER_SCOPED_TABLES }
export type { PartnerScopedTable } from './resolve-partner-id'

export interface AdminActionAuditDetails {
  target_table?: string
  target_id?: string
  diff?: Record<string, unknown>
  on_behalf_of?: string
  /** WL-123: 명시적 주입. 미지정 시 resolvePartnerId가 자동 결정. */
  partner_id?: string
}

export interface AdminActionResult<T> {
  result: T
  /**
   * 제공되면 audit 기록 + revalidatePath 자동 실행. undefined면 둘 다 skip.
   *
   * ⚠️ 데이터 변경을 수행한 성공 경로에서는 반드시 auditDetails를 반환할 것.
   *    생략 시 감사 로그 누락 — Audit Integrity 위반.
   *
   * 검증 실패·DB 에러 등 early return 경로에서는 생략 (변경이 없으므로 기록 불필요).
   */
  auditDetails?: AdminActionAuditDetails
}

type AdminCallback<T, R extends UserRole> = (
  user: Extract<CurrentUser, { role: R }>,
  db: SupabaseClient<Database>
) => Promise<AdminActionResult<T>>

interface WithAdminActionOptions<R extends UserRole> {
  requiredRole?: R | readonly R[]
  /** audit 로그 action 이름 (예: 'partner.create'). 필수 — 망각 방지. */
  auditAction: string
  /** 성공 시(auditDetails 존재) revalidatePath로 호출할 경로. */
  revalidate?: string | string[]
}

/**
 * Admin Server Action 7단계 보안 체크체인 래퍼 (v2 — WL-119).
 *
 * 이 함수가 보장하는 단계:
 *   Step 1: 인증 확인 — 미인증 시 redirect('/auth/login')
 *   Step 2: 역할 확인 — 불일치 시 Error throw
 *   Step 3: 소유권 컨텍스트 제공 — user.partner_id 를 callback에 전달
 *   Step 6: 감사 로그 — auditDetails 존재 시 writeAuditLog 자동 호출 (실패 시 throw)
 *   Step 7: 캐시 무효화 — audit 성공 후 revalidatePath 자동 호출
 *
 * callback이 책임지는 단계:
 *   Step 4: 입력 검증 (Zod safeParse)
 *   Step 5: 변경 실행 (DB mutation)
 *     ⚠️ [R2-01] partner_admin mutation은 **반드시 `.eq('partner_id', user.partner_id)`**
 *        WHERE 절을 포함해야 한다. SECURITY.md §이중 SSOT 참조.
 *
 * ⚠️ callback 내부에서 redirect() 호출 금지.
 *    NEXT_REDIRECT 에러가 audit 단계 전에 전파되어 기록 누락이 발생한다.
 *    redirect가 필요하면 withAdminAction 반환 후 caller에서 호출할 것.
 *
 * @example
 *   export async function createPartner(_prev, formData) {
 *     const result = await withAdminAction(
 *       { requiredRole: 'master_admin', auditAction: 'partner.create', revalidate: '/admin/partners' },
 *       async (user, db) => {
 *         const parsed = schema.safeParse(...)
 *         if (!parsed.success) return { result: { fieldErrors: ... } }  // audit skip
 *         const { data, error } = await db.from('partners').insert(...)
 *         if (error) return { result: { error: '...' } }                 // audit skip
 *         return {
 *           result: { ok: true },
 *           auditDetails: { target_table: 'partners', target_id: data.id, diff: {...} }
 *         }
 *       }
 *     )
 *     if ('ok' in result) redirect('/admin/partners')
 *     return result
 *   }
 */
export async function withAdminAction<T, R extends UserRole = UserRole>(
  options: WithAdminActionOptions<R>,
  callback: AdminCallback<T, R>
): Promise<T> {
  // Step 1: 인증
  const user = await getCurrentUser()

  // Step 2: 역할
  if (options.requiredRole) {
    const roles = (Array.isArray(options.requiredRole)
      ? options.requiredRole
      : [options.requiredRole]) as readonly R[]
    if (!roles.includes(user.role as R)) {
      throw new Error('Unauthorized: insufficient role')
    }
  }

  // Step 3: 소유권 컨텍스트
  const db = await createActionClient()

  // Step 4-5: callback 실행
  const { result, auditDetails } = await callback(
    user as Extract<CurrentUser, { role: R }>,
    db
  )

  // Step 6: 감사 로그 (auditDetails 제공 시만)
  if (auditDetails) {
    await writeAuditLog({
      actor_id: user.id,
      action: options.auditAction,
      target_table: auditDetails.target_table ?? null,
      target_id: auditDetails.target_id ?? null,
      diff: auditDetails.diff ?? null,
      on_behalf_of: auditDetails.on_behalf_of ?? null,
      partner_id: resolvePartnerId(user, auditDetails),
    })

    // Step 7: 캐시 무효화 (audit 성공 후에만)
    if (options.revalidate) {
      const paths = Array.isArray(options.revalidate)
        ? options.revalidate
        : [options.revalidate]
      for (const path of paths) {
        revalidatePath(path)
      }
    }
  }

  return result
}
