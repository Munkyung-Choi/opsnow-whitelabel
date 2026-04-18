'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { withAdminAction } from '@/lib/auth/with-admin-action'
import { createPartnerSchema, type CreatePartnerFieldErrors } from '@/lib/schemas/partner'

export interface PartnerFormState {
  error?: string
  fieldErrors?: CreatePartnerFieldErrors
}

/**
 * 신규 파트너 등록 Server Action — 7단계 체크체인 적용.
 *
 * owner_id: master_admin ID를 임시 사용.
 * TODO: /api/auth/provision 구현 시 실제 partner_admin ID로 교체 (WL-53 follow-up #1).
 */
export async function createPartner(
  _prevState: PartnerFormState,
  formData: FormData
): Promise<PartnerFormState> {
  return withAdminAction({ requiredRole: 'master_admin' }, async (user, db) => {
    // Step 4: 입력 검증 (Zod)
    const result = createPartnerSchema.safeParse({
      business_name: formData.get('business_name'),
      subdomain: formData.get('subdomain'),
      theme_key: formData.get('theme_key'),
    })

    if (!result.success) {
      const flat = result.error.flatten().fieldErrors
      return {
        fieldErrors: {
          business_name: flat.business_name?.[0],
          subdomain: flat.subdomain?.[0],
          theme_key: flat.theme_key?.[0],
        },
      }
    }

    // Step 5: DB 변경
    const { data: partner, error: dbError } = await db
      .from('partners')
      .insert({
        business_name: result.data.business_name,
        subdomain: result.data.subdomain,
        theme_key: result.data.theme_key,
        // TODO: /api/auth/provision 구현 후 partner_admin user ID로 교체 (WL-53 follow-up #1)
        owner_id: user.id,
        is_active: true,
        default_locale: 'ko',
        published_locales: ['ko'],
        notification_emails: [],
      })
      .select('id')
      .single()

    if (dbError) {
      if (dbError.code === '23505') {
        return { fieldErrors: { subdomain: '이미 사용 중인 서브도메인입니다.' } }
      }
      return { error: '파트너 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.' }
    }

    // Step 6: 감사 로그 (콘솔 — /api/admin/logs 연동 미구현, WL-53 follow-up #6)
    console.log('[audit:partner_create]', {
      actor_id: user.id,
      target_table: 'partners',
      target_id: partner.id,
      diff: { before: null, after: { subdomain: result.data.subdomain } },
      timestamp: new Date().toISOString(),
    })

    // Step 7: 캐시 무효화
    revalidatePath('/admin/partners')

    redirect('/admin/partners')
  })
}

/** 파트너 활성/비활성 토글 — master_admin 전용 */
export async function togglePartnerActive(
  partnerId: string,
  currentIsActive: boolean
): Promise<{ error?: string }> {
  return withAdminAction({ requiredRole: 'master_admin' }, async (user, db) => {
    const nextActive = !currentIsActive

    const { error: dbError } = await db
      .from('partners')
      .update({ is_active: nextActive, updated_at: new Date().toISOString() })
      .eq('id', partnerId)

    if (dbError) return { error: '상태 변경에 실패했습니다.' }

    console.log('[audit:partner_toggle]', {
      actor_id: user.id,
      target_table: 'partners',
      target_id: partnerId,
      diff: { before: { is_active: currentIsActive }, after: { is_active: nextActive } },
      timestamp: new Date().toISOString(),
    })

    revalidatePath('/admin/partners')
    return {}
  })
}
