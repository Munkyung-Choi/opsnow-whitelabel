import Link from 'next/link'
import RoleGuard from '@/components/shared/RoleGuard'

export default function AdminNav() {
  return (
    <nav className="w-56 shrink-0 border-r border-border bg-card min-h-screen p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        OpsNow Admin
      </p>
      <ul className="space-y-1">
        <li>
          <Link
            href="/admin/dashboard"
            className="block px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            대시보드
          </Link>
        </li>

        {/* master_admin 전용: 파트너 관리, 감사 로그 */}
        <RoleGuard allowedRoles={['master_admin']}>
          <li>
            <Link
              href="/admin/partners"
              className="block px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              파트너 관리
            </Link>
          </li>
          <li>
            <Link
              href="/admin/logs"
              className="block px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              감사 로그
            </Link>
          </li>
        </RoleGuard>

        {/* partner_admin 전용: 사이트 빌더, 리드 관리 */}
        <RoleGuard allowedRoles={['partner_admin']}>
          <li>
            <Link
              href="/admin/site-builder"
              className="block px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              사이트 빌더
            </Link>
          </li>
          <li>
            <Link
              href="/admin/leads"
              className="block px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              리드 관리
            </Link>
          </li>
        </RoleGuard>
      </ul>
    </nav>
  )
}
