// WL-51 — Impersonation 쿠키 서명·검증 Unit Tests
//
// AP 아키텍트 승인 Case 1~4 + Red Team 보강 Case 5~10.

import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import {
  signImpersonationValue,
  verifyImpersonationValue,
  COOKIE_MAX_AGE_MS,
  CLOCK_SKEW_MS,
} from './impersonation'

const SECRET = 'test-secret-at-least-32-bytes-of-random-data-for-hmac-xyz'
const SECRETS_MAP = { v1: SECRET }

const MASTER_UID = '11111111-1111-4111-8111-111111111111'
const OTHER_UID = '22222222-2222-4222-8222-222222222222'
const PARTNER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const NOW = 1_700_000_000_000

function makeValid(overrides: Partial<{ partner_id: string; issued_at: number; issued_for_user_id: string; kid: string }> = {}) {
  return signImpersonationValue(
    {
      partner_id: overrides.partner_id ?? PARTNER_A,
      issued_at: overrides.issued_at ?? NOW,
      issued_for_user_id: overrides.issued_for_user_id ?? MASTER_UID,
      kid: overrides.kid ?? 'v1',
    },
    SECRET
  )
}

describe('impersonation — signImpersonationValue + verifyImpersonationValue', () => {
  // Case 1 — Happy Path
  it('(Case 1) 유효 서명 쿠키 파싱 성공 + payload 복원', () => {
    const raw = makeValid()

    const res = verifyImpersonationValue(raw, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.payload.partner_id).toBe(PARTNER_A)
      expect(res.payload.issued_for_user_id).toBe(MASTER_UID)
      expect(res.payload.kid).toBe('v1')
      expect(res.payload.issued_at).toBe(NOW)
    }
  })

  // Case 2 — MEDIUM-5 (issued_for_user_id mismatch)
  it('(Case 2) 발급 사용자와 현재 사용자가 다르면 user_mismatch 거부', () => {
    const raw = makeValid({ issued_for_user_id: MASTER_UID })

    const res = verifyImpersonationValue(raw, {
      currentUserId: OTHER_UID, // ← 다른 사용자
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('user_mismatch')
  })

  // Case 3 — G2 (expired)
  it('(Case 3) 1시간 경과한 쿠키는 expired 거부', () => {
    const raw = makeValid({ issued_at: NOW - COOKIE_MAX_AGE_MS - 1 })

    const res = verifyImpersonationValue(raw, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('expired')
  })

  it('(Case 3-a) 만료 경계값 (정확히 1시간) 직전은 허용', () => {
    const raw = makeValid({ issued_at: NOW - COOKIE_MAX_AGE_MS + 1 })

    const res = verifyImpersonationValue(raw, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(true)
  })

  // Case 4 — G1 (tampered HMAC)
  it('(Case 4) 위조된 HMAC 시그니처는 bad_signature 거부', () => {
    const raw = makeValid()
    const tampered = raw.slice(0, -8) + 'XXXXXXXX'

    const res = verifyImpersonationValue(tampered, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('bad_signature')
  })

  it('(Case 4-a) partner_id 변조 시 bad_signature 거부 (서명 재계산 차단)', () => {
    const raw = makeValid()
    const parts = raw.split('.')
    parts[0] = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    const tampered = parts.join('.')

    const res = verifyImpersonationValue(tampered, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('bad_signature')
  })

  // Case 5 — Clock skew (±5초 허용)
  it('(Case 5) issued_at이 미래이지만 5초 이내면 허용', () => {
    const raw = makeValid({ issued_at: NOW + CLOCK_SKEW_MS - 100 })

    const res = verifyImpersonationValue(raw, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(true)
  })

  // Case 6 — Clock skew 5초 초과
  it('(Case 6) issued_at이 미래 5초 초과 시 future_beyond_skew 거부', () => {
    const raw = makeValid({ issued_at: NOW + CLOCK_SKEW_MS + 1 })

    const res = verifyImpersonationValue(raw, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('future_beyond_skew')
  })

  // Case 7 — MEDIUM-4 (unknown kid)
  it('(Case 7) 알 수 없는 kid는 unknown_kid 거부', () => {
    const raw = makeValid({ kid: 'v99' })

    const res = verifyImpersonationValue(raw, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP, // v1만 있음
    })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('unknown_kid')
  })

  // Case 8 — malformed (점 개수 오류)
  it('(Case 8-a) 점 4개 → malformed', () => {
    const res = verifyImpersonationValue(`${PARTNER_A}.${NOW}.${MASTER_UID}.v1`, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('malformed')
  })

  it('(Case 8-b) issued_at이 숫자가 아님 → malformed', () => {
    // 수동으로 서명 생성 (issued_at=abc) — 올바른 서명이지만 payload 필드가 잘못됨
    const message = `${PARTNER_A}.abc.${MASTER_UID}.v1`
    const sig = createHmac('sha256', SECRET)
      .update(message)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const raw = `${message}.${sig}`

    const res = verifyImpersonationValue(raw, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('malformed')
  })

  // Case 9 — invalid UUID
  it('(Case 9-a) partner_id가 UUID 형식이 아니면 invalid_uuid 거부', () => {
    const raw = makeValid({ partner_id: 'not-a-uuid' })

    const res = verifyImpersonationValue(raw, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('invalid_uuid')
  })

  it('(Case 9-b) issued_for_user_id가 UUID 형식이 아니면 invalid_uuid 거부', () => {
    const raw = makeValid({ issued_for_user_id: 'not-a-uuid' })

    const res = verifyImpersonationValue(raw, {
      currentUserId: 'not-a-uuid',
      now: NOW,
      secretsMap: SECRETS_MAP,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('invalid_uuid')
  })

  // Case 10 — null safety
  it('(Case 10-a) 빈 문자열 → missing 거부', () => {
    const res = verifyImpersonationValue('', {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('missing')
  })

  it('(Case 10-b) null → missing 거부', () => {
    const res = verifyImpersonationValue(null, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('missing')
  })

  it('(Case 10-c) undefined → missing 거부', () => {
    const res = verifyImpersonationValue(undefined, {
      currentUserId: MASTER_UID,
      now: NOW,
      secretsMap: SECRETS_MAP,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('missing')
  })
})
