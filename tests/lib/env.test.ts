import { describe, it, expect, afterEach, beforeEach } from 'vitest'

// WL-158 — getObservabilityEnv() Zod 중앙화 유닛 테스트.

const ORIGINAL_ENV = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_ALERT_FROM: process.env.RESEND_ALERT_FROM,
  RESEND_ALERT_TO: process.env.RESEND_ALERT_TO,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
}

function restoreEnv() {
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

describe('getObservabilityEnv() — Zod 스키마 중앙 검증', () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_ALERT_FROM
    delete process.env.RESEND_ALERT_TO
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterEach(() => {
    restoreEnv()
  })

  it('모든 env 미설정 시 전 항목 undefined 반환 (Fail-Safe — throw 없음)', async () => {
    const { getObservabilityEnv } = await import('@/lib/env')
    const env = getObservabilityEnv()
    expect(env.RESEND_API_KEY).toBeUndefined()
    expect(env.RESEND_ALERT_FROM).toBeUndefined()
    expect(env.RESEND_ALERT_TO).toBeUndefined()
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined()
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined()
  })

  it('모든 env 유효값 설정 시 해당 값 반환', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.RESEND_ALERT_FROM = 'from@example.com'
    process.env.RESEND_ALERT_TO = 'to@example.com'
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token_abc'

    const { getObservabilityEnv } = await import('@/lib/env')
    const env = getObservabilityEnv()
    expect(env.RESEND_API_KEY).toBe('re_test_key')
    expect(env.RESEND_ALERT_FROM).toBe('from@example.com')
    expect(env.RESEND_ALERT_TO).toBe('to@example.com')
    expect(env.UPSTASH_REDIS_REST_URL).toBe('https://example.upstash.io')
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBe('token_abc')
  })

  it('빈 문자열 env는 undefined로 처리 (|| undefined 코어션)', async () => {
    process.env.RESEND_API_KEY = ''
    process.env.UPSTASH_REDIS_REST_URL = ''

    const { getObservabilityEnv } = await import('@/lib/env')
    const env = getObservabilityEnv()
    expect(env.RESEND_API_KEY).toBeUndefined()
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined()
  })

  it('일부만 설정 시 설정된 항목만 반환, 나머지 undefined', async () => {
    process.env.RESEND_API_KEY = 're_partial'

    const { getObservabilityEnv } = await import('@/lib/env')
    const env = getObservabilityEnv()
    expect(env.RESEND_API_KEY).toBe('re_partial')
    expect(env.RESEND_ALERT_FROM).toBeUndefined()
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined()
  })
})
