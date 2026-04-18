import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { createSessionClient } from '@/lib/supabase/create-server-client'
import { Button } from '@/components/ui/button'
import PartnerTable from '@/components/admin/PartnerTable'

export const metadata = { title: '파트너 관리 — OpsNow Admin' }

export default async function PartnersPage() {
  await requireRole('master_admin')

  const supabase = await createSessionClient()
  const { data: partners } = await supabase
    .from('partners')
    .select('id, business_name, subdomain, custom_domain, custom_domain_status, is_active, theme_key, created_at')
    .order('created_at', { ascending: false })

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">파트너 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            전체 {partners?.length ?? 0}개 파트너
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/partners/new">+ 파트너 등록</Link>
        </Button>
      </div>

      <PartnerTable partners={partners ?? []} />
    </main>
  )
}
