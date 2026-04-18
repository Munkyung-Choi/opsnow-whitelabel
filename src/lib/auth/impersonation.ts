import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'
import { getCurrentUser } from './get-current-user'

/**
 * WL-51 — Impersonation 세션 사이드카 (서명 쿠키).
 *
 * 설계 배경:
 *   Master의 Supabase auth 세션은 건드리지 않는다 (auth.uid() 불변 → system_logs 무결성).
 *   별도의 서명 쿠키로 "대리 접속 컨텍스트"만 병기한다.
 *
 * 쿠키 페이로드 구조 (5 segment — 점 구분):
 *   <partner_id>.<issued_at_ms>.<issued_for_user_id>.<kid>.<hmac_sha256_base64url>
 *
 * Defense 레이어:
 *   G1 위조: HMAC-SHA256 + timingSafeEqual
 *   G2 만료: issued_at_ms 검증 (1시간 + ±5초 leeway)
 *   G4 타인 쿠키 재사용: issued_for_user_id ↔ 현재 auth.uid() 대조
 *   MEDIUM-4 키 로테이션: kid 기반 secrets map lookup
 */

export const COOKIE_NAME = 'opsnow_impersonate'
export const COOKIE_MAX_AGE_SEC = 3600
export const CLOCK_SKEW_MS = 5_000
export const COOKIE_MAX_AGE_MS = COOKIE_MAX_AGE_SEC * 1_000

export const CURRENT_KID = 'v1'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ImpersonationPayload {
  partner_id: string
  issued_at: number
  issued_for_user_id: string
  kid: string
}

export type VerifyResult =
  | {
      ok: true
      payload: ImpersonationPayload
    }
  | {
      ok: false
      reason:
        | 'missing'
        | 'malformed'
        | 'invalid_uuid'
        | 'unknown_kid'
        | 'bad_signature'
        | 'expired'
        | 'future_beyond_skew'
        | 'user_mismatch'
    }

export type ImpersonationContext =
  | { isImpersonating: false; context: null }
  | {
      isImpersonating: true
      context: {
        target_partner_id: string
        actor_id: string
        issued_at: number
        expires_at: number
      }
    }

function hmac(message: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(message).digest()
}

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4)
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad)
  return Buffer.from(padded, 'base64')
}

/**
 * 쿠키 값 서명. Route Handler start 시점에 호출.
 * 순수 함수 — secret을 외부에서 주입하여 테스트 가능성 보장.
 */
export function signImpersonationValue(
  payload: ImpersonationPayload,
  secret: string
): string {
  const message = `${payload.partner_id}.${payload.issued_at}.${payload.issued_for_user_id}.${payload.kid}`
  const sig = toBase64Url(hmac(message, secret))
  return `${message}.${sig}`
}

/**
 * 쿠키 값 검증. 순수 함수.
 * AP 아키텍트 피드백: timingSafeEqual 사용, ±5초 clock skew 허용.
 */
export function verifyImpersonationValue(
  raw: string | undefined | null,
  options: {
    currentUserId: string
    now: number
    secretsMap: Record<string, string>
  }
): VerifyResult {
  if (!raw || typeof raw !== 'string') return { ok: false, reason: 'missing' }

  const parts = raw.split('.')
  if (parts.length !== 5) return { ok: false, reason: 'malformed' }

  const [partner_id, issuedAtStr, issued_for_user_id, kid, sig] = parts

  if (!UUID_RE.test(partner_id)) return { ok: false, reason: 'invalid_uuid' }
  if (!UUID_RE.test(issued_for_user_id)) return { ok: false, reason: 'invalid_uuid' }

  const secret = options.secretsMap[kid]
  if (!secret) return { ok: false, reason: 'unknown_kid' }

  const issued_at = Number(issuedAtStr)
  if (!Number.isFinite(issued_at) || issued_at <= 0) {
    return { ok: false, reason: 'malformed' }
  }

  // 서명 검증 — timingSafeEqual (G1)
  const message = `${partner_id}.${issued_at}.${issued_for_user_id}.${kid}`
  const expected = hmac(message, secret)
  const actual = fromBase64Url(sig)
  if (actual.length !== expected.length) return { ok: false, reason: 'bad_signature' }
  if (!timingSafeEqual(actual, expected)) return { ok: false, reason: 'bad_signature' }

  // 만료 검증 — ±5초 clock skew 허용 (AP 아키텍트 피드백 2)
  const age = options.now - issued_at
  if (age > COOKIE_MAX_AGE_MS) return { ok: false, reason: 'expired' }
  if (age < -CLOCK_SKEW_MS) return { ok: false, reason: 'future_beyond_skew' }

  // 사용자 일치 검증 — MEDIUM-5 (로그아웃 후 쿠키 잔존 방어)
  if (issued_for_user_id !== options.currentUserId) {
    return { ok: false, reason: 'user_mismatch' }
  }

  return {
    ok: true,
    payload: { partner_id, issued_at, issued_for_user_id, kid },
  }
}

function getSecretsMap(): Record<string, string> {
  const secret = process.env.IMPERSONATION_SIGNING_SECRET
  if (!secret) {
    // Fail closed in prod — 빈 map 반환 시 모든 쿠키 unknown_kid로 거부된다.
    return {}
  }
  return { [CURRENT_KID]: secret }
}

/**
 * Server Component / Server Action에서 현재 요청의 impersonation 맥락을 반환한다.
 *
 * 설계:
 *   - `getCurrentUser()` 호출 — master_admin 세션 재검증 (G4).
 *   - 단방향 의존 (Context → User 호출하지만, User는 Context를 호출하지 않음 — HIGH-1 방어).
 *   - React cache() 없이 매 호출마다 cookie/user 조회. 성능이 문제될 경우 추후 cache() 래핑.
 */
export async function getImpersonationContext(): Promise<ImpersonationContext> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return { isImpersonating: false, context: null }

  const user = await getCurrentUser()
  if (user.role !== 'master_admin') {
    // G4: partner_admin 세션에서 master 쿠키 탈취 시도 — 무시
    return { isImpersonating: false, context: null }
  }

  const result = verifyImpersonationValue(raw, {
    currentUserId: user.id,
    now: Date.now(),
    secretsMap: getSecretsMap(),
  })

  if (!result.ok) return { isImpersonating: false, context: null }

  return {
    isImpersonating: true,
    context: {
      target_partner_id: result.payload.partner_id,
      actor_id: result.payload.issued_for_user_id,
      issued_at: result.payload.issued_at,
      expires_at: result.payload.issued_at + COOKIE_MAX_AGE_MS,
    },
  }
}

/**
 * Route Handler에서 호출. 서명된 쿠키 값을 반환한다.
 */
export function buildSignedCookieValue(
  partner_id: string,
  issued_for_user_id: string,
  now: number = Date.now()
): string {
  const secret = process.env.IMPERSONATION_SIGNING_SECRET
  if (!secret) {
    throw new Error('IMPERSONATION_SIGNING_SECRET is not configured')
  }
  return signImpersonationValue(
    { partner_id, issued_at: now, issued_for_user_id, kid: CURRENT_KID },
    secret
  )
}
