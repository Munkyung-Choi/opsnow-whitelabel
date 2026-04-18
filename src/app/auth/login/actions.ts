'use server'

import { redirect } from 'next/navigation'
import { createActionClient } from '@/lib/supabase/create-server-client'
import { validateNextUrl } from '@/lib/auth/validate-next-url'

interface SignInState {
  error: string
}

export async function signIn(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = formData.get('next') as string | null

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 입력해 주세요.' }
  }

  const supabase = await createActionClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  // [R8-01] next 파라미터는 validateNextUrl로 화이트리스트 검증 후 사용.
  redirect(validateNextUrl(next))
}
