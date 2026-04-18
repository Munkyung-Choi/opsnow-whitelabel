import { getCurrentUser } from '@/lib/auth/get-current-user'
import AdminNav from '@/components/admin/AdminNav'
import ImpersonationBanner from '@/components/admin/ImpersonationBanner'

// [F1 R1-01] Defense-in-depth 인증 게이트:
// proxy.ts(WL-114)의 admin host 인증 체크에 더해, layout에서 getCurrentUser()를
// 호출하여 profiles row + invariant 화이트리스트까지 검증.
// 하위 페이지가 requireRole()을 누락해도 인증 자체는 반드시 통과해야 함.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await getCurrentUser()
  return (
    <div className="min-h-screen bg-background">
      {/* WL-51: Impersonation 중일 때만 렌더 — 모든 admin 페이지 공통 배너 */}
      <ImpersonationBanner />
      <div className="flex">
        <AdminNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
