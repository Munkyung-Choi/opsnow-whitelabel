import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createSessionClient } from '@/lib/supabase/create-server-client'
import type { ThemeKey } from '@/lib/theme-presets'
import SiteBuilderForm from './SiteBuilderForm'

export default async function SiteBuilderPage() {
  const user = await getCurrentUser()

  // site-builder는 partner_admin 전용 (AdminNav RoleGuard와 동일 수준 서버사이드 강제)
  if (user.role !== 'partner_admin') {
    redirect('/admin/dashboard')
  }

  const supabase = await createSessionClient()
  const { data: partner } = await supabase
    .from('partners')
    .select('theme_key, logo_url, favicon_url')
    .eq('id', user.partner_id)
    .single()

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold text-foreground mb-1">사이트 빌더</h1>
      <p className="text-sm text-muted-foreground mb-8">테마, 로고, 파비콘을 설정합니다.</p>
      <SiteBuilderForm
        currentThemeKey={(partner?.theme_key as ThemeKey | null) ?? null}
        currentLogoUrl={partner?.logo_url ?? null}
        currentFaviconUrl={partner?.favicon_url ?? null}
      />
    </div>
  )
}
