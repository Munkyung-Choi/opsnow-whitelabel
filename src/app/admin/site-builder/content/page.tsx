import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createSessionClient } from '@/lib/supabase/create-server-client'
import { parseI18nField, EDITABLE_SECTION_TYPES } from '@/lib/schemas/site-builder-content'
import ContentEditorForm from './ContentEditorForm'

export default async function SiteBuilderContentPage() {
  const user = await getCurrentUser()

  if (user.role !== 'partner_admin') {
    redirect('/admin/dashboard')
  }

  const supabase = await createSessionClient()

  const [{ data: partner }, { data: rawContents }] = await Promise.all([
    supabase
      .from('partners')
      .select('subdomain, default_locale')
      .eq('id', user.partner_id)
      .single(),
    supabase
      .from('contents')
      .select('section_type, title, subtitle, body, contact_info, is_published')
      .eq('partner_id', user.partner_id)
      .in('section_type', [...EDITABLE_SECTION_TYPES]),
  ])

  const sections = (rawContents ?? []).map((row) => {
    const title = parseI18nField(row.title)
    const subtitle = parseI18nField(row.subtitle)
    const body = parseI18nField(row.body)
    const info = (row.contact_info ?? {}) as Record<string, unknown>

    return {
      section_type: row.section_type as (typeof EDITABLE_SECTION_TYPES)[number],
      title_ko: title.ko,
      title_en: title.en,
      subtitle_ko: subtitle.ko,
      subtitle_en: subtitle.en,
      body_ko: body.ko,
      body_en: body.en,
      contact_email: String(info.email ?? ''),
      contact_phone: String(info.phone ?? ''),
      contact_address: String(info.address ?? ''),
      is_published: row.is_published ?? false,
    }
  })

  return (
    <div className="p-6 flex flex-col gap-4 h-[calc(100vh-4rem)] min-h-0">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">콘텐츠 편집</h1>
        <p className="text-sm text-muted-foreground">
          섹션별 텍스트를 다국어로 편집하고 발행 상태를 관리합니다.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <ContentEditorForm
          sections={sections}
          subdomain={partner?.subdomain ?? ''}
          defaultLocale={partner?.default_locale ?? 'ko'}
        />
      </div>
    </div>
  )
}
