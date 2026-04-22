import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FEATURE_KEYS } from '@/lib/features/features-schema'
import {
  assertLocalSupabaseUrl,
  serviceClient,
  type RlsClient,
  PARTNER_A,
} from '../../security/rls-test-clients'

/**
 * WL-150 — FEATURE_KEYS ↔ DB 화이트리스트 drift 탐지 (행동 기반)
 *
 * 정의 텍스트 파싱 대신 DB가 실제로 accept/reject하는 key 집합을 FEATURE_KEYS와 대조.
 * DEBT-012의 임시 방어망으로 기능한다.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const isLocalSupabase =
  !!SUPABASE_URL &&
  (SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1'))

async function validateCheck(
  svc: RlsClient,
  f: unknown
): Promise<boolean | null> {
  const { data, error } = await (svc.rpc as unknown as (
    fn: string,
    params: { f: unknown }
  ) => Promise<{ data: boolean | null; error: unknown }>)(
    'is_valid_partner_features',
    { f }
  )
  if (error) throw new Error(JSON.stringify(error))
  return data
}

async function callUpdateRpc(
  svc: RlsClient,
  p_partner_id: string,
  p_feature_key: string,
  p_enabled: boolean
): Promise<{ error: { code?: string; message?: string } | null }> {
  const { error } = await (svc.rpc as unknown as (
    fn: string,
    params: { p_partner_id: string; p_feature_key: string; p_enabled: boolean }
  ) => Promise<{ error: { code?: string; message?: string } | null }>)(
    'update_partner_feature',
    { p_partner_id, p_feature_key, p_enabled }
  )
  return { error }
}

const DRIFT_HINT = [
  '[WL-150 DEBT-012] FEATURE_KEYS 확장 시 4곳 동기 수정 필요:',
  '  1. src/lib/features/features-schema.ts',
  '  2. supabase/migrations/*_partners_features_check.sql (is_valid_partner_features)',
  '  3. supabase/migrations/*_update_partner_feature_fn_allowlist.sql',
  '  4. 본 테스트 (FEATURE_KEYS re-import 자동)',
].join('\n')

describe.skipIf(!isLocalSupabase)('WL-150 — FEATURE_KEYS 전원이 CHECK/RPC에 수용됨', () => {
  let svc: RlsClient

  beforeAll(() => {
    assertLocalSupabaseUrl()
    svc = serviceClient()
  })

  afterAll(async () => {
    await svc.from('partners').update({ features: {} }).eq('id', PARTNER_A.partnerId)
  })

  it('FEATURE_KEYS 모든 key가 is_valid_partner_features에서 true', async () => {
    for (const key of FEATURE_KEYS) {
      const result = await validateCheck(svc, { [key]: true })
      expect(result, `${key} 거부 — CHECK drift 의심\n${DRIFT_HINT}`).toBe(true)
    }
  })

  it('FEATURE_KEYS 모든 key가 update_partner_feature RPC에서 수용됨', async () => {
    for (const key of FEATURE_KEYS) {
      const { error } = await callUpdateRpc(svc, PARTNER_A.partnerId, key, false)
      expect(error, `RPC가 ${key} 거부 — RPC drift 의심\n${DRIFT_HINT}`).toBeNull()
    }
  })
})

describe.skipIf(!isLocalSupabase)('WL-150 — sentinel key 거부 (네거티브 drift 탐지)', () => {
  let svc: RlsClient

  const SENTINELS = [
    '__drift_sentinel_alpha__',
    '__drift_sentinel_beta__',
    '__drift_sentinel_gamma__',
  ]

  beforeAll(() => {
    assertLocalSupabaseUrl()
    svc = serviceClient()
  })

  it('sentinel 3종이 CHECK 함수에서 false', async () => {
    for (const sentinel of SENTINELS) {
      const result = await validateCheck(svc, { [sentinel]: true })
      expect(
        result,
        `${sentinel} 수용됨 — CHECK 제약이 너무 관대함\n${DRIFT_HINT}`
      ).toBe(false)
    }
  })

  it('sentinel 3종이 RPC에서 check_violation 반환', async () => {
    for (const sentinel of SENTINELS) {
      const { error } = await callUpdateRpc(svc, PARTNER_A.partnerId, sentinel, true)
      expect(error?.code, `${sentinel} 수용됨 — RPC 관대\n${DRIFT_HINT}`).toBe('23514')
    }
  })
})
