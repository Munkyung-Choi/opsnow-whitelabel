'use server'

import { revalidatePath } from 'next/cache'
import { withAdminAction } from '@/lib/auth/with-admin-action'
import type { Database } from '@/types/supabase'
import {
  updateSectionContentSchema,
  togglePublishSchema,
  type ContentEditFormState,
  type PublishToggleState,
} from '@/lib/schemas/site-builder-content'

type ContentsUpdate = Database['public']['Tables']['contents']['Update']

export async function updatePartnerContent(
  _prev: ContentEditFormState,
  formData: FormData
): Promise<ContentEditFormState> {
  return withAdminAction(
    {
      requiredRole: 'partner_admin',
      auditAction: 'section.content.update',
      revalidate: '/admin/site-builder/content',
    },
    async (user, db) => {
      const parsed = updateSectionContentSchema.safeParse({
        section_type: formData.get('section_type'),
        title_ko: formData.get('title_ko') ?? '',
        title_en: formData.get('title_en') ?? '',
        subtitle_ko: formData.get('subtitle_ko') ?? '',
        subtitle_en: formData.get('subtitle_en') ?? '',
        body_ko: formData.get('body_ko') ?? '',
        body_en: formData.get('body_en') ?? '',
      })

      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors
        return {
          result: {
            fieldErrors: {
              section_type: flat.section_type?.[0],
              title_ko: flat.title_ko?.[0],
            },
          } as ContentEditFormState,
        }
      }

      const { section_type, title_ko, title_en, subtitle_ko, subtitle_en, body_ko, body_en } =
        parsed.data

      // partner_id는 세션에서 직접 주입 — form 입력 신뢰 금지
      const { data: partner } = await db
        .from('partners')
        .select('subdomain')
        .eq('id', user.partner_id)
        .single()

      const { data: before } = await db
        .from('contents')
        .select('title, subtitle, body')
        .eq('partner_id', user.partner_id)
        .eq('section_type', section_type)
        .single()

      const updatePayload: ContentsUpdate = {
        title: { ko: title_ko, en: title_en },
        updated_at: new Date().toISOString(),
      }

      if (section_type === 'hero') {
        updatePayload.subtitle = { ko: subtitle_ko ?? '', en: subtitle_en ?? '' }
      }
      if (section_type === 'about') {
        updatePayload.body = { ko: body_ko ?? '', en: body_en ?? '' }
      }
      if (section_type === 'contact') {
        updatePayload.contact_info = {
          email: String(formData.get('contact_email') ?? ''),
          phone: String(formData.get('contact_phone') ?? ''),
          address: String(formData.get('contact_address') ?? ''),
        }
      }

      const { error: dbError } = await db
        .from('contents')
        .update(updatePayload)
        .eq('partner_id', user.partner_id)
        .eq('section_type', section_type)

      if (dbError) {
        return {
          result: { error: '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' } as ContentEditFormState,
        }
      }

      if (partner?.subdomain) {
        revalidatePath(`/${partner.subdomain}`, 'layout')
      }

      return {
        result: { ok: true } as ContentEditFormState,
        auditDetails: {
          target_table: 'contents',
          target_id: user.partner_id,
          diff: { section_type, before, after: updatePayload },
        },
      }
    }
  )
}

export async function toggleSectionPublish(
  _prev: PublishToggleState,
  formData: FormData
): Promise<PublishToggleState> {
  return withAdminAction(
    {
      requiredRole: 'partner_admin',
      auditAction: 'section.publish.toggle',
      revalidate: '/admin/site-builder/content',
    },
    async (user, db) => {
      const parsed = togglePublishSchema.safeParse({
        section_type: formData.get('section_type'),
        is_published: formData.get('is_published'),
      })

      if (!parsed.success) {
        return { result: { error: '잘못된 요청입니다.' } as PublishToggleState }
      }

      const { section_type, is_published } = parsed.data

      const { data: partner } = await db
        .from('partners')
        .select('subdomain')
        .eq('id', user.partner_id)
        .single()

      const { error: dbError } = await db
        .from('contents')
        .update({ is_published, updated_at: new Date().toISOString() })
        .eq('partner_id', user.partner_id)
        .eq('section_type', section_type)

      if (dbError) {
        return { result: { error: '상태 변경에 실패했습니다.' } as PublishToggleState }
      }

      if (partner?.subdomain) {
        revalidatePath(`/${partner.subdomain}`, 'layout')
      }

      return {
        result: { ok: true } as PublishToggleState,
        auditDetails: {
          target_table: 'contents',
          target_id: user.partner_id,
          diff: { section_type, is_published },
        },
      }
    }
  )
}
