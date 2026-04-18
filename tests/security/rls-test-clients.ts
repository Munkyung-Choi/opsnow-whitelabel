import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// .env.local 로드 — 로컬 Supabase 자격증명. 이미 설정된 값은 덮어쓰지 않음.
config({ path: resolve(process.cwd(), '.env.local'), override: false })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Seed 데이터 상수 — supabase/seed.sql과 반드시 일치해야 함
export const MASTER = {
  email: 'master@test.opsnow.com',
  password: 'TestPassword123!',
  id: '762b0245-de65-46e5-ab27-b1c7bf8aaa29',
} as const

export const PARTNER_A = {
  adminEmail: 'admin@cloudsave.test',
  adminPassword: 'TestPassword123!',
  adminId: '6adb5034-0a0e-4f60-bbd3-b1286a071473',
  partnerId: 'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
} as const

export const PARTNER_B = {
  adminEmail: 'admin@dataflow.test',
  adminPassword: 'TestPassword123!',
  adminId: 'fab084cd-5921-44f6-85b1-a13a01d3cfd4',
  partnerId: '9309979b-9211-457e-ad01-68e843c7687b',
} as const

export type RlsClient = SupabaseClient<Database>

/** 로컬 Supabase가 아니면 즉시 throw — 프로덕션 DB 대상 실행 방지 */
export function assertLocalSupabaseUrl(): void {
  if (!SUPABASE_URL) {
    throw new Error(
      '[WL-118] NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다. .env.local을 확인하세요.'
    )
  }
  if (!SUPABASE_URL.includes('localhost') && !SUPABASE_URL.includes('127.0.0.1')) {
    throw new Error(
      `[WL-118] RLS 테스트는 로컬 DB 전용입니다. NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}"`
    )
  }
}

/** anon 클라이언트로 로그인하여 세션이 적용된 클라이언트를 반환 */
export async function signIn(email: string, password: string): Promise<RlsClient> {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new Error(`[rls-test-clients] signIn 실패 (${email}): ${error?.message}`)
  }
  return client
}

export async function signOut(client: RlsClient): Promise<void> {
  await client.auth.signOut()
}

/** anon 클라이언트 반환 — 미인증 접근 테스트용 */
export function anonClient(): RlsClient {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}

/**
 * service_role 클라이언트 반환 — 테스트 데이터 setup/teardown 전용.
 * ⚠️ RLS 우회 — assertion 코드에서 절대 사용 금지.
 */
export function serviceClient(): RlsClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!serviceRoleKey) {
    throw new Error('[rls-test-clients] SUPABASE_SERVICE_ROLE_KEY 미설정. .env.local 확인 필요')
  }
  return createClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * 세션 정합성 검증: auth.uid() == expectedUserId ∧ role != NULL
 * profiles.id = auth.uid() 조회 성공으로 세션이 올바르게 적용됐음을 증명.
 */
export async function assertSessionIntegrity(
  client: RlsClient,
  expectedUserId: string
): Promise<void> {
  const { data, error } = await client
    .from('profiles')
    .select('id, role')
    .eq('id', expectedUserId)
    .single()

  if (error || !data) {
    throw new Error(
      `[Session 정합성 실패] auth.uid() ≠ ${expectedUserId} 또는 프로필 없음: ${error?.message}`
    )
  }
  if (!data.role) {
    throw new Error(
      `[Session 정합성 실패] get_my_role() = NULL — profiles.role 미설정 (userId=${expectedUserId})`
    )
  }
}
