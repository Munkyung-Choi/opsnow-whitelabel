'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createActionClient } from '@/lib/supabase/create-server-client'
import { COOKIE_NAME as IMPERSONATION_COOKIE } from '@/lib/auth/impersonation'

export async function signOut(): Promise<void> {
  const supabase = await createActionClient()
  // scope: 'local' — 현재 디바이스 세션만 종료. 기본값 'global'은 refresh_token을
  // 서버에서 무효화하여 "모든 디바이스 로그아웃"을 유발하므로 일반 로그아웃 UX에 부적합.
  await supabase.auth.signOut({ scope: 'local' })

  // R1: 세션 사이드카 쿠키(impersonation)도 함께 정리 — SECURITY.md §10.1
  const cookieStore = await cookies()
  cookieStore.delete(IMPERSONATION_COOKIE)

  revalidatePath('/', 'layout')
  redirect('/auth/login')
}
