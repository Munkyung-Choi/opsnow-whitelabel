import { getCurrentUser } from '@/lib/auth/get-current-user'

export const metadata = { title: '대시보드 — OpsNow Admin' }

export default async function DashboardPage() {
  const user = await getCurrentUser()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
      <p className="text-sm text-muted-foreground mt-2">
        {user.role === 'master_admin' ? 'Master Admin' : 'Partner Admin'}으로 접속됨
      </p>
    </main>
  )
}
