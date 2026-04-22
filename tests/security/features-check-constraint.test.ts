import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client } from 'pg'
import {
  assertLocalSupabaseUrl,
  serviceClient,
  type RlsClient,
  PARTNER_A,
} from './rls-test-clients'

/**
 * WL-150 — partners.features CHECK 제약 + is_valid_partner_features 함수 검증
 *
 * - supabase-js rpc() 경로: 함수 호출, 테이블 UPDATE 위반 확인 등 대부분 케이스
 * - pg 직접 연결 경로: SQL NULL vs JSON null literal 구분 등 supabase-js로 표현 불가능한 케이스
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const isLocalSupabase =
  !!SUPABASE_URL &&
  (SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1'))

const LOCAL_PG_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

describe.skipIf(!isLocalSupabase)('WL-150 — is_valid_partner_features 함수 (rpc 경로)', () => {
  let svc: RlsClient

  beforeAll(() => {
    assertLocalSupabaseUrl()
    svc = serviceClient()
  })

  async function validate(f: unknown): Promise<boolean | null> {
    // PostgREST는 JSON body의 null을 SQL NULL로 매핑하므로 null 케이스는 pg 직접 호출 섹션에서 검증
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

  describe('정상 케이스 — true 반환', () => {
    it('빈 객체 {} → true (DEFAULT 값 호환성)', async () => {
      expect(await validate({})).toBe(true)
    })
    it('{"custom_domain": true} → true', async () => {
      expect(await validate({ custom_domain: true })).toBe(true)
    })
    it('{"custom_domain": true, "analytics": false} → true (부분 key)', async () => {
      expect(await validate({ custom_domain: true, analytics: false })).toBe(true)
    })
    it('전체 3 key 조합 → true', async () => {
      expect(
        await validate({ custom_domain: true, analytics: false, multi_locale: true })
      ).toBe(true)
    })
  })

  describe('unknown key 반증 — false 반환', () => {
    it('{"foo": true} → false', async () => {
      expect(await validate({ foo: true })).toBe(false)
    })
    it('{"custom_domain": true, "foo": true} → false (일부 unknown)', async () => {
      expect(await validate({ custom_domain: true, foo: true })).toBe(false)
    })
    it('{"LEGACY_key": false} → false (대소문자 구분)', async () => {
      expect(await validate({ LEGACY_key: false })).toBe(false)
    })
  })

  describe('non-boolean value 반증 — false 반환', () => {
    it('{"custom_domain": "yes"} → false (string)', async () => {
      expect(await validate({ custom_domain: 'yes' })).toBe(false)
    })
    it('{"analytics": 1} → false (number)', async () => {
      expect(await validate({ analytics: 1 })).toBe(false)
    })
    it('{"multi_locale": null} → false (JSON null value)', async () => {
      expect(await validate({ multi_locale: null })).toBe(false)
    })
    it('{"custom_domain": {"nested": true}} → false (object)', async () => {
      expect(await validate({ custom_domain: { nested: true } })).toBe(false)
    })
    it('{"custom_domain": [true]} → false (array)', async () => {
      expect(await validate({ custom_domain: [true] })).toBe(false)
    })
  })

  describe('타입 경계 반증 — false 반환', () => {
    it('"text" (string scalar) → false', async () => {
      expect(await validate('text')).toBe(false)
    })
    it('123 (number scalar) → false', async () => {
      expect(await validate(123)).toBe(false)
    })
    it('[1,2] (array) → false', async () => {
      expect(await validate([1, 2])).toBe(false)
    })
  })
})

describe.skipIf(!isLocalSupabase)('WL-150 — SQL NULL vs JSON null literal 구분 (pg 직접 연결)', () => {
  let pg: Client

  beforeAll(async () => {
    pg = new Client({ connectionString: LOCAL_PG_URL })
    await pg.connect()
  })

  afterAll(async () => {
    await pg.end()
  })

  it('SQL NULL (NULL::jsonb) → NULL 반환 (false 아님) — 3-value logic', async () => {
    const result = await pg.query('SELECT public.is_valid_partner_features(NULL::jsonb) AS r')
    // PostgreSQL NULL 3-value logic: jsonb_typeof(NULL) = NULL → NULL = 'object' = NULL → 함수 반환 NULL
    // features 컬럼의 NOT NULL 제약이 실질 차단 (이중 방어)
    expect(result.rows[0].r).toBeNull()
  })

  it("JSON null literal ('null'::jsonb) → false 반환 (jsonb_typeof = 'null' ≠ 'object')", async () => {
    const result = await pg.query(`SELECT public.is_valid_partner_features('null'::jsonb) AS r`)
    expect(result.rows[0].r).toBe(false)
  })
})

describe.skipIf(!isLocalSupabase)('WL-150 — 테이블 CHECK 제약 발동 (service_role 경로)', () => {
  let svc: RlsClient
  let pg: Client

  beforeAll(async () => {
    assertLocalSupabaseUrl()
    svc = serviceClient()
    pg = new Client({ connectionString: LOCAL_PG_URL })
    await pg.connect()
  })

  afterAll(async () => {
    // Cleanup: partner-a features 리셋
    await svc.from('partners').update({ features: {} }).eq('id', PARTNER_A.partnerId)
    await pg.end()
  })

  it('정상 shape → UPDATE 성공', async () => {
    const { error } = await svc
      .from('partners')
      .update({ features: { custom_domain: true } })
      .eq('id', PARTNER_A.partnerId)
    expect(error).toBeNull()
  })

  it('빈 객체 → UPDATE 성공 (기본값 회귀)', async () => {
    const { error } = await svc
      .from('partners')
      .update({ features: {} })
      .eq('id', PARTNER_A.partnerId)
    expect(error).toBeNull()
  })

  it('unknown key → CHECK 위반', async () => {
    const { error } = await svc
      .from('partners')
      .update({ features: { foo: true } as unknown as never })
      .eq('id', PARTNER_A.partnerId)
    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514')
    expect(error?.message).toContain('partners_features_shape')
  })

  it('non-boolean value → CHECK 위반', async () => {
    const { error } = await svc
      .from('partners')
      .update({ features: { custom_domain: 'yes' } as unknown as never })
      .eq('id', PARTNER_A.partnerId)
    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514')
  })

  it('배열 [1,2] → CHECK 위반 (pg 직접 경로 — supabase-js 직렬화 우회)', async () => {
    // supabase-js는 features에 배열을 보내면 jsonb로 직렬화하나, 테이블 제약 강제는 동일
    await expect(
      pg.query(
        `UPDATE public.partners SET features = '[1,2]'::jsonb WHERE id = $1`,
        [PARTNER_A.partnerId]
      )
    ).rejects.toThrow(/partners_features_shape/)
  })

  it("JSON null literal ('null'::jsonb) → CHECK 위반", async () => {
    await expect(
      pg.query(
        `UPDATE public.partners SET features = 'null'::jsonb WHERE id = $1`,
        [PARTNER_A.partnerId]
      )
    ).rejects.toThrow(/partners_features_shape/)
  })
})
