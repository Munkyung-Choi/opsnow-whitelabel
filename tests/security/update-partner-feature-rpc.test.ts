import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  assertLocalSupabaseUrl,
  serviceClient,
  signIn,
  type RlsClient,
  MASTER,
  PARTNER_A,
  PARTNER_B,
} from './rls-test-clients'

/**
 * WL-150 — update_partner_feature RPC allowlist + pruning 검증
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const isLocalSupabase =
  !!SUPABASE_URL &&
  (SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1'))

async function callRpc(
  client: RlsClient,
  p_partner_id: string,
  p_feature_key: string,
  p_enabled: boolean
): Promise<{ error: { code?: string; message?: string } | null }> {
  const { error } = await (client.rpc as unknown as (
    fn: string,
    params: { p_partner_id: string; p_feature_key: string; p_enabled: boolean }
  ) => Promise<{ error: { code?: string; message?: string } | null }>)(
    'update_partner_feature',
    { p_partner_id, p_feature_key, p_enabled }
  )
  return { error }
}

async function readFeatures(svc: RlsClient, partnerId: string): Promise<Record<string, unknown>> {
  const { data } = await svc.from('partners').select('features').eq('id', partnerId).single()
  return (data?.features as Record<string, unknown>) ?? {}
}

describe.skipIf(!isLocalSupabase)('WL-150 — RPC allowlist (Layer 1)', () => {
  let svc: RlsClient

  beforeAll(() => {
    assertLocalSupabaseUrl()
    svc = serviceClient()
  })

  afterAll(async () => {
    await svc.from('partners').update({ features: {} }).eq('id', PARTNER_A.partnerId)
  })

  it('unknown key → RAISE EXCEPTION (check_violation, 명시 메시지)', async () => {
    const { error } = await callRpc(svc, PARTNER_A.partnerId, 'hacker_key', true)
    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514')
    expect(error?.message).toContain('Invalid feature key: hacker_key')
    expect(error?.message).toContain('Allowed: custom_domain, analytics, multi_locale')
  })

  it('custom_domain 수용', async () => {
    const { error } = await callRpc(svc, PARTNER_A.partnerId, 'custom_domain', true)
    expect(error).toBeNull()
  })

  it('analytics 수용', async () => {
    const { error } = await callRpc(svc, PARTNER_A.partnerId, 'analytics', false)
    expect(error).toBeNull()
  })

  it('multi_locale 수용', async () => {
    const { error } = await callRpc(svc, PARTNER_A.partnerId, 'multi_locale', true)
    expect(error).toBeNull()
  })

  it('대소문자 구분 엄격 — Custom_Domain → reject', async () => {
    const { error } = await callRpc(svc, PARTNER_A.partnerId, 'Custom_Domain', true)
    expect(error?.code).toBe('23514')
    expect(error?.message).toContain('Invalid feature key')
  })

  it('공백 포함 → reject', async () => {
    const { error } = await callRpc(svc, PARTNER_A.partnerId, ' analytics', true)
    expect(error?.code).toBe('23514')
  })

  it('빈 문자열 → reject', async () => {
    const { error } = await callRpc(svc, PARTNER_A.partnerId, '', true)
    expect(error?.code).toBe('23514')
  })
})

describe.skipIf(!isLocalSupabase)(
  'WL-150 — jsonb_build_object 재구성 (인스턴스 기반 점진적 정제)',
  () => {
    let svc: RlsClient

    beforeAll(() => {
      assertLocalSupabaseUrl()
      svc = serviceClient()
    })

    beforeEach(async () => {
      // 각 테스트 시작 시 features='{}'로 리셋
      await svc.from('partners').update({ features: {} }).eq('id', PARTNER_A.partnerId)
    })

    afterAll(async () => {
      await svc.from('partners').update({ features: {} }).eq('id', PARTNER_A.partnerId)
    })

    it('호출 후 features 객체가 allowlist 3 key 모두 포함 (누락 default=false)', async () => {
      await callRpc(svc, PARTNER_A.partnerId, 'custom_domain', true)
      const f = await readFeatures(svc, PARTNER_A.partnerId)

      // jsonb_build_object가 3 key 모두를 항상 생성
      expect(Object.keys(f).sort()).toEqual(['analytics', 'custom_domain', 'multi_locale'])
      expect(f.custom_domain).toBe(true)
      expect(f.analytics).toBe(false)
      expect(f.multi_locale).toBe(false)
    })

    it('이전 값 보존 — 다른 key 토글 후 기존 값 유지', async () => {
      await callRpc(svc, PARTNER_A.partnerId, 'custom_domain', true)
      await callRpc(svc, PARTNER_A.partnerId, 'analytics', true)
      const f = await readFeatures(svc, PARTNER_A.partnerId)

      expect(f.custom_domain).toBe(true)
      expect(f.analytics).toBe(true)
      expect(f.multi_locale).toBe(false)
    })

    it('토글 OFF → 해당 key만 false, 나머지 보존', async () => {
      await callRpc(svc, PARTNER_A.partnerId, 'custom_domain', true)
      await callRpc(svc, PARTNER_A.partnerId, 'analytics', true)
      await callRpc(svc, PARTNER_A.partnerId, 'custom_domain', false)
      const f = await readFeatures(svc, PARTNER_A.partnerId)

      expect(f.custom_domain).toBe(false)
      expect(f.analytics).toBe(true)
      expect(f.multi_locale).toBe(false)
    })

    it('updated_at 갱신 — 토글 시마다 NOW() 반영', async () => {
      const before = await svc
        .from('partners')
        .select('updated_at')
        .eq('id', PARTNER_A.partnerId)
        .single()
      const beforeTs = new Date(before.data!.updated_at as string).getTime()

      // 타임스탬프 해상도 확보 (PostgreSQL clock_timestamp 마이크로초)
      await new Promise((r) => setTimeout(r, 10))
      await callRpc(svc, PARTNER_A.partnerId, 'custom_domain', true)

      const after = await svc
        .from('partners')
        .select('updated_at')
        .eq('id', PARTNER_A.partnerId)
        .single()
      const afterTs = new Date(after.data!.updated_at as string).getTime()

      expect(afterTs).toBeGreaterThan(beforeTs)
    })
  }
)

describe.skipIf(!isLocalSupabase)('WL-150 — RLS 통합 (SECURITY INVOKER)', () => {
  let svc: RlsClient
  let masterClient: RlsClient
  let partnerAClient: RlsClient

  beforeAll(async () => {
    assertLocalSupabaseUrl()
    svc = serviceClient()
    masterClient = await signIn(MASTER.email, MASTER.password)
    partnerAClient = await signIn(PARTNER_A.adminEmail, PARTNER_A.adminPassword)
  })

  afterAll(async () => {
    await svc.from('partners').update({ features: {} }).eq('id', PARTNER_A.partnerId)
    await svc.from('partners').update({ features: {} }).eq('id', PARTNER_B.partnerId)
  })

  it('master_admin — partner-a 대상 성공', async () => {
    const { error } = await callRpc(masterClient, PARTNER_A.partnerId, 'custom_domain', true)
    expect(error).toBeNull()
    const f = await readFeatures(svc, PARTNER_A.partnerId)
    expect(f.custom_domain).toBe(true)
  })

  it('master_admin — partner-b 대상 성공 (교차 파트너)', async () => {
    const { error } = await callRpc(masterClient, PARTNER_B.partnerId, 'analytics', true)
    expect(error).toBeNull()
    const f = await readFeatures(svc, PARTNER_B.partnerId)
    expect(f.analytics).toBe(true)
  })

  it('partner_admin — 자기 파트너 대상 성공', async () => {
    const { error } = await callRpc(partnerAClient, PARTNER_A.partnerId, 'multi_locale', true)
    expect(error).toBeNull()
  })

  it('partner_admin — 타 파트너 대상 RLS 차단 (UPDATE 0 rows, RPC 자체는 에러 없음)', async () => {
    const before = await readFeatures(svc, PARTNER_B.partnerId)
    const { error } = await callRpc(partnerAClient, PARTNER_B.partnerId, 'custom_domain', true)
    // SECURITY INVOKER + UPDATE는 RLS로 0 rows 반환 → RPC 자체는 성공
    expect(error).toBeNull()
    // 실제 DB 변경 없음을 확인
    const after = await readFeatures(svc, PARTNER_B.partnerId)
    expect(after).toEqual(before)
  })
})
