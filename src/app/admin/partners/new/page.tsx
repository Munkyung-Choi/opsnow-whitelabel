import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { Button } from '@/components/ui/button'
import PartnerNewForm from '@/components/admin/PartnerNewForm'

export const metadata = { title: '파트너 등록 — OpsNow Admin' }

export default async function PartnerNewPage() {
  await requireRole('master_admin')

  return (
    <main className="p-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link href="/admin/partners">← 파트너 관리로 돌아가기</Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">파트너 등록</h1>
        <p className="text-sm text-muted-foreground mt-1">
          신규 파트너사를 등록합니다.
        </p>
      </div>

      <PartnerNewForm />
    </main>
  )
}
