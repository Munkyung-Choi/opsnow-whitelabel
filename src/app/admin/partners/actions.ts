'use server'
// @module-purpose: Admin 파트너 CRUD Server Actions (withAdminAction v2 7단계 보안 체인).
// 공개 마케팅 조회는 src/services/partnerService.ts 참조. 두 모듈은 역할이 다르며 통합 금지.

import { redirect } from 'next/navigation'
import { withAdminAction } from '@/lib/auth/with-admin-action'
import { createPartnerSchema, type CreatePartnerFieldErrors } from '@/lib/schemas/partner'

export interface PartnerFormState {
  error?: string
  fieldErrors?: CreatePartnerFieldErrors
  /** 성공 플래그 — helper 반환 후 caller가 redirect 판단. */
  ok?: true
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
  const result = await withAdminAction(
    {
      requiredRole: 'master_admin',
      auditAction: 'partner.create',
      revalidate: '/admin/partners',
    },
    async (user, db) => {
      // Step 4: 입력 검증 (Zod)
      const parsed = createPartnerSchema.safeParse({
        business_name: formData.get('business_name'),
        subdomain: formData.get('subdomain'),
        theme_key: formData.get('theme_key'),
      })

      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors
        return {
          result: {
            fieldErrors: {
              business_name: flat.business_name?.[0],
              subdomain: flat.subdomain?.[0],
              theme_key: flat.theme_key?.[0],
            },
          } as PartnerFormState,
          // auditDetails 없음 → audit skip (변경 없음)
        }
      }

      // Step 5: DB 변경
      const { data: partner, error: dbError } = await db
        .from('partners')
        .insert({
          business_name: parsed.data.business_name,
          subdomain: parsed.data.subdomain,
          theme_key: parsed.data.theme_key,
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
          return {
            result: {
              fieldErrors: { subdomain: '이미 사용 중인 서브도메인입니다.' },
            } as PartnerFormState,
          }
        }
        return {
          result: {
            error: '파트너 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.',
          } as PartnerFormState,
        }
      }

      // 성공 — audit + revalidate 자동 수행됨
      return {
        result: { ok: true } as PartnerFormState,
        auditDetails: {
          target_table: 'partners',
          target_id: partner.id,
          diff: { before: null, after: { subdomain: parsed.data.subdomain } },
        },
      }
    }
  )

  if (result.ok) {
    redirect('/admin/partners')
  }
  return result
}

/** 파트너 활성/비활성 토글 — master_admin 전용 */
export async function togglePartnerActive(
  partnerId: string,
  currentIsActive: boolean
): Promise<{ error?: string }> {
  const nextActive = !currentIsActive

  return withAdminAction(
    {
      requiredRole: 'master_admin',
      auditAction: 'partner.toggle_active',
      revalidate: '/admin/partners',
    },
    async (_user, db) => {
      const { error: dbError } = await db
        .from('partners')
        .update({ is_active: nextActive, updated_at: new Date().toISOString() })
        .eq('id', partnerId)

      if (dbError) {
        return {
          result: { error: '상태 변경에 실패했습니다.' },
        }
      }

      return {
        result: {} as { error?: string },
        auditDetails: {
          target_table: 'partners',
          target_id: partnerId,
          diff: {
            before: { is_active: currentIsActive },
            after: { is_active: nextActive },
          },
        },
      }
    }
  )
}
