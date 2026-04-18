import { getCurrentUser, type UserRole } from '@/lib/auth/get-current-user'

interface Props {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

// UX-only guard — renders null for unauthorized roles.
// Security enforcement happens at the server layer (WL-53 requireRole/withAdminAction).
// Hiding UI here does NOT block server-side access.
export default async function RoleGuard({ allowedRoles, children }: Props) {
  const user = await getCurrentUser()
  if (!allowedRoles.includes(user.role)) return null
  return <>{children}</>
}
