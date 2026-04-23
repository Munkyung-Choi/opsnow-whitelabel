import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// WL-156 — sendEmailAlert Unit 테스트.
// Resend SDK를 mock하여 Silent Skip·에러 전파·payload 직렬화·singleton 가드 검증.

const { mockSend, MockResend } = vi.hoisted(() => {
  const send = vi.fn()
  const R = vi.fn()
  R.mockImplementation(function (this: { emails: { send: typeof send } }) {
    this.emails = { send }
  })
  return { mockSend: send, MockResend: R }
})

vi.mock('resend', () => ({
  Resend: MockResend,
}))

const ORIGINAL_ENV = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_ALERT_FROM: process.env.RESEND_ALERT_FROM,
  RESEND_ALERT_TO: process.env.RESEND_ALERT_TO,
}

function restoreEnv() {
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

describe('sendEmailAlert() — Resend API 래퍼 + Silent Skip', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSend.mockReset()
    MockResend.mockClear()
  })

  afterEach(() => {
    restoreEnv()
  })

  it('RESEND_API_KEY 부재 시 throw 없이 return (Silent Skip + console.error)', async () => {
    delete process.env.RESEND_API_KEY
    process.env.RESEND_ALERT_FROM = 'from@test'
    process.env.RESEND_ALERT_TO = 'to@test'

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendEmailAlert } = await import('@/lib/observability/send-email-alert')

    await expect(sendEmailAlert({ subject: 's', payload: {} })).resolves.toBeUndefined()
    expect(mockSend).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('RESEND_ALERT_FROM 부재 시 throw 없이 return (Silent Skip)', async () => {
    process.env.RESEND_API_KEY = 'test_key'
    delete process.env.RESEND_ALERT_FROM
    process.env.RESEND_ALERT_TO = 'to@test'

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendEmailAlert } = await import('@/lib/observability/send-email-alert')

    await expect(sendEmailAlert({ subject: 's', payload: {} })).resolves.toBeUndefined()
    expect(mockSend).not.toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('RESEND_ALERT_TO 부재 시 throw 없이 return (Silent Skip)', async () => {
    process.env.RESEND_API_KEY = 'test_key'
    process.env.RESEND_ALERT_FROM = 'from@test'
    delete process.env.RESEND_ALERT_TO

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendEmailAlert } = await import('@/lib/observability/send-email-alert')

    await expect(sendEmailAlert({ subject: 's', payload: {} })).resolves.toBeUndefined()
    expect(mockSend).not.toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('env 3종 존재 + Resend 성공 시 emails.send 1회 호출 (from/to/subject/text 인자 검증)', async () => {
    process.env.RESEND_API_KEY = 'test_key'
    process.env.RESEND_ALERT_FROM = 'from@test'
    process.env.RESEND_ALERT_TO = 'to@test'
    mockSend.mockResolvedValue({ data: { id: 'msg_1' }, error: null })

    const { sendEmailAlert } = await import('@/lib/observability/send-email-alert')
    await sendEmailAlert({ subject: 'Rate Limit', payload: { key: 'k', context: 'partner' } })

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith({
      from: 'from@test',
      to: 'to@test',
      subject: 'Rate Limit',
      text: JSON.stringify({ key: 'k', context: 'partner' }, null, 2),
    })
  })

  it('Resend API 에러 반환 시 Error throw — 호출부가 catch 책임', async () => {
    process.env.RESEND_API_KEY = 'test_key'
    process.env.RESEND_ALERT_FROM = 'from@test'
    process.env.RESEND_ALERT_TO = 'to@test'
    mockSend.mockResolvedValue({ data: null, error: { message: 'rate limited' } })

    const { sendEmailAlert } = await import('@/lib/observability/send-email-alert')
    await expect(
      sendEmailAlert({ subject: 's', payload: {} })
    ).rejects.toThrow(/Resend API error: rate limited/)
  })

  it('_resendInitAttempted 가드로 Resend constructor 1회만 호출', async () => {
    process.env.RESEND_API_KEY = 'test_key'
    process.env.RESEND_ALERT_FROM = 'from@test'
    process.env.RESEND_ALERT_TO = 'to@test'
    mockSend.mockResolvedValue({ data: { id: 'msg_1' }, error: null })

    const { sendEmailAlert } = await import('@/lib/observability/send-email-alert')
    await sendEmailAlert({ subject: 's', payload: {} })
    await sendEmailAlert({ subject: 's', payload: {} })
    await sendEmailAlert({ subject: 's', payload: {} })

    expect(MockResend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledTimes(3)
  })
})
