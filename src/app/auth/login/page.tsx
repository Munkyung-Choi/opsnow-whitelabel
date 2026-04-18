import { redirect } from 'next/navigation'
import { createSessionClient } from '@/lib/supabase/create-server-client'
import { validateNextUrl } from '@/lib/auth/validate-next-url'
import { LoginForm } from './_components/LoginForm'

export const metadata = { title: 'Admin 로그인 — OpsNow' }

interface Props {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  // [2-b] 이미 인증된 사용자가 /auth/login 재접근 시 → next 또는 dashboard로 복귀
  const supabase = await createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const params = await searchParams
    redirect(validateNextUrl(params.next))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8 bg-card rounded-lg border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin 로그인</h1>
          <p className="text-sm text-muted-foreground mt-1">
            OpsNow 어드민 콘솔에 접속합니다
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
