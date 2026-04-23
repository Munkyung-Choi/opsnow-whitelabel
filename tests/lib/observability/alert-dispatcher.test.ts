import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// WL-156 — dispatchRateLimitAlert Unit 테스트.
// Upstash Redis + sendEmailAlert 의존성을 mock하여 원자 suppression·Fail-Safe 침묵·
// 3계층 방어선·waitUntil 단일 체인·성공 로그 검증.

const { mockRedisSet, MockRedis, mockSendEmailAlert } = vi.hoisted(() => {
  const set = vi.fn()
  const sendEmail = vi.fn()
  return {
    mockRedisSet: set,
    MockRedis: {
      fromEnv: vi.fn().mockImplementation(() => ({ set })),
    },
    mockSendEmailAlert: sendEmail,
  }
})

vi.mock('@upstash/redis', () => ({
  Redis: MockRedis,
}))

vi.mock('@/lib/observability/send-email-alert', () => ({
  sendEmailAlert: mockSendEmailAlert,
}))

const ORIGINAL_ENV = {
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  VERCEL_ENV: process.env.VERCEL_ENV,
}

function restoreEnv() {
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

function setRedisEnv() {
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
}

const baseCtx = {
  key: 'partner-uuid-123',
  ip: '1.2.3.4',
  context: 'partner' as const,
}

describe('dispatchRateLimitAlert() — suppression + Fail-Safe 침묵', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRedisSet.mockReset()
    mockSendEmailAlert.mockReset()
    MockRedis.fromEnv.mockClear()
  })

  afterEach(() => {
    restoreEnv()
  })

  it('Redis env 부재 시 침묵하고 sendEmailAlert 호출 안 함 (Fail-Safe)', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { dispatchRateLimitAlert } = await import('@/lib/observability/alert-dispatcher')

    await expect(dispatchRateLimitAlert(baseCtx)).resolves.toBeUndefined()
    expect(MockRedis.fromEnv).not.toHaveBeenCalled()
    expect(mockSendEmailAlert).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('SET NX 반환 "OK"(신규) 시 sendEmailAlert 1회 호출', async () => {
    setRedisEnv()
    mockRedisSet.mockResolvedValue('OK')
    mockSendEmailAlert.mockResolvedValue(undefined)
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const { dispatchRateLimitAlert } = await import('@/lib/observability/alert-dispatcher')
    await dispatchRateLimitAlert(baseCtx)

    expect(mockSendEmailAlert).toHaveBeenCalledTimes(1)
  })

  it('SET NX 반환 null(중복) 시 sendEmailAlert 호출 안 함 (suppression 동작)', async () => {
    setRedisEnv()
    mockRedisSet.mockResolvedValue(null)

    const { dispatchRateLimitAlert } = await import('@/lib/observability/alert-dispatcher')
    await dispatchRateLimitAlert(baseCtx)

    expect(mockSendEmailAlert).not.toHaveBeenCalled()
  })

  it('suppression key는 alert:ratelimit:${context}:${key} 형식 (Auditor #3 — context 네임스페이스)', async () => {
    setRedisEnv()
    mockRedisSet.mockResolvedValue(null)

    const { dispatchRateLimitAlert } = await import('@/lib/observability/alert-dispatcher')
    await dispatchRateLimitAlert({ key: 'abc', ip: '1.1.1.1', context: 'admin-ip' })

    expect(mockRedisSet).toHaveBeenCalledWith(
      'alert:ratelimit:admin-ip:abc',
      '1',
      expect.objectContaining({ nx: true })
    )
  })

  it('suppression TTL은 정확히 300초', async () => {
    setRedisEnv()
    mockRedisSet.mockResolvedValue(null)

    const { dispatchRateLimitAlert } = await import('@/lib/observability/alert-dispatcher')
    await dispatchRateLimitAlert(baseCtx)

    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { nx: true, ex: 300 }
    )
  })

  it('sendEmailAlert 실패 시 .catch()로 격리 + throw 전파 안 됨', async () => {
    setRedisEnv()
    mockRedisSet.mockResolvedValue('OK')
    mockSendEmailAlert.mockRejectedValue(new Error('Resend boom'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const { dispatchRateLimitAlert } = await import('@/lib/observability/alert-dispatcher')
    await expect(dispatchRateLimitAlert(baseCtx)).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('sendEmailAlert failed'),
      expect.any(Error)
    )

    errorSpy.mockRestore()
  })

  it('Redis set 중 throw 발생 시 outer try-catch로 격리 + throw 전파 안 됨', async () => {
    setRedisEnv()
    mockRedisSet.mockRejectedValue(new Error('Redis network error'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { dispatchRateLimitAlert } = await import('@/lib/observability/alert-dispatcher')
    await expect(dispatchRateLimitAlert(baseCtx)).resolves.toBeUndefined()
    expect(mockSendEmailAlert).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('unexpected error'),
      expect.any(Error)
    )

    errorSpy.mockRestore()
  })

  it('sendEmailAlert payload에 key/ip/context/timestamp/environment 5종 포함', async () => {
    setRedisEnv()
    mockRedisSet.mockResolvedValue('OK')
    mockSendEmailAlert.mockResolvedValue(undefined)
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const { dispatchRateLimitAlert } = await import('@/lib/observability/alert-dispatcher')
    await dispatchRateLimitAlert(baseCtx)

    const call = mockSendEmailAlert.mock.calls[0][0]
    expect(call.subject).toContain('Rate Limit')
    expect(call.payload).toMatchObject({
      key: 'partner-uuid-123',
      ip: '1.2.3.4',
      context: 'partner',
    })
    expect(call.payload).toHaveProperty('timestamp')
    expect(call.payload).toHaveProperty('environment')
  })

  it('성공 log — isNewAlert OK 확인 직후 console.info 1회 (외부 AI 7차 #2 반영)', async () => {
    setRedisEnv()
    mockRedisSet.mockResolvedValue('OK')
    mockSendEmailAlert.mockResolvedValue(undefined)
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const { dispatchRateLimitAlert } = await import('@/lib/observability/alert-dispatcher')
    await dispatchRateLimitAlert(baseCtx)

    expect(infoSpy).toHaveBeenCalledWith(
      '[AlertDispatcher] alert dispatched',
      expect.objectContaining({ key: 'partner-uuid-123', context: 'partner' })
    )

    infoSpy.mockRestore()
  })
})
