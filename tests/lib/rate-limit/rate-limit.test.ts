import { describe, it, expect, beforeEach, vi } from 'vitest'

// WL-145 — Rate Limit Unit Tests
// getPartnerRateLimiter(): lazy singleton + env 누락 시 null 반환
// getRateLimitHeaders(): HTTP 헤더 포맷

// @upstash/redis fromEnv()는 env가 없을 때 throw — Fail-open 시나리오 검증을 위해
// 모듈 상태를 리셋할 수 있도록 vi.resetModules() 활용.

describe('getRateLimitHeaders() — HTTP 응답 헤더 포맷', () => {
  it('X-RateLimit-Limit/Remaining/Reset + Retry-After 4종 헤더 반환', async () => {
    const { getRateLimitHeaders } = await import('@/lib/rate-limit')
    const headers = getRateLimitHeaders(50, 12, 1704067200000)
    expect(headers).toEqual({
      'X-RateLimit-Limit': '50',
      'X-RateLimit-Remaining': '12',
      'X-RateLimit-Reset': '1704067200000',
      'Retry-After': '10',
    })
  })

  it('숫자 인자를 toString() 변환하여 모두 string 타입', async () => {
    const { getRateLimitHeaders } = await import('@/lib/rate-limit')
    const headers = getRateLimitHeaders(0, 0, 0)
    Object.values(headers).forEach((v) => {
      expect(typeof v).toBe('string')
    })
  })
})

describe('getPartnerRateLimiter() — lazy singleton + Fail-open', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('env 누락 시 null 반환 (Fail-open: 모듈 초기화 throw 흡수)', async () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { getPartnerRateLimiter } = await import('@/lib/rate-limit')
      const limiter = getPartnerRateLimiter()
      expect(limiter).toBeNull()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimit] init failed')
      )
    } finally {
      errorSpy.mockRestore()
      if (originalUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = originalUrl
      if (originalToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken
    }
  })

  it('init 실패 후 재호출 시에도 null 반환 (_initAttempted 가드 — 재시도 금지)', async () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_URL

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { getPartnerRateLimiter } = await import('@/lib/rate-limit')
      const first = getPartnerRateLimiter()
      const second = getPartnerRateLimiter()
      expect(first).toBeNull()
      expect(second).toBeNull()
      expect(errorSpy).toHaveBeenCalledTimes(1) // init은 1회만 시도
    } finally {
      errorSpy.mockRestore()
      if (originalUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = originalUrl
    }
  })

  it('env 존재 시 Ratelimit 인스턴스 반환 + 동일 인스턴스 캐싱', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

    const { getPartnerRateLimiter } = await import('@/lib/rate-limit')
    const first = getPartnerRateLimiter()
    const second = getPartnerRateLimiter()
    expect(first).not.toBeNull()
    expect(first).toBe(second) // 동일 인스턴스 재사용
  })
})
