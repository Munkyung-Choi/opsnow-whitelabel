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
        contact_email: formData.get('contact_email') ?? '',
        contact_phone: formData.get('contact_phone') ?? '',
        contact_address: formData.get('contact_address') ?? '',
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
        .eq('section_type', parsed.data.section_type)
        .single()

      const updatePayload: ContentsUpdate = {
        title: { ko: parsed.data.title_ko, en: parsed.data.title_en },
        updated_at: new Date().toISOString(),
      }

      switch (parsed.data.section_type) {
        case 'hero':
          updatePayload.subtitle = { ko: parsed.data.subtitle_ko, en: parsed.data.subtitle_en }
          break
        case 'contact':
          updatePayload.contact_info = {
            email: parsed.data.contact_email ?? '',
            phone: parsed.data.contact_phone ?? '',
            address: parsed.data.contact_address ?? '',
          }
          break
      }

      const { error: dbError } = await db
        .from('contents')
        .update(updatePayload)
        .eq('partner_id', user.partner_id)
        .eq('section_type', parsed.data.section_type)

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
          diff: { section_type: parsed.data.section_type, before, after: updatePayload },
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
