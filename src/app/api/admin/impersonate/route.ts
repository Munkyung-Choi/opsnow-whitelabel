import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { supabaseAdmin } from '@/lib/supabase/server'
import {
  COOKIE_NAME,
  COOKIE_MAX_AGE_SEC,
  buildSignedCookieValue,
  getImpersonationContext,
} from '@/lib/auth/impersonation'

/**
 * WL-51 — Impersonation Route Handler.
 *
 * SECURITY.md §8 Invariant:
 *   이 엔드포인트는 어떠한 경우에도 master_admin 권한 없이는 실행되지 않는다.
 *   `getCurrentUser()`의 redirect 및 role 체크가 불변 게이트.
 *
 * system_logs 기록 주체: `supabaseAdmin` (service_role) — RLS 우회.
 *
 * AP 아키텍트 Race 방어 (HIGH-2):
 *   POST 직전 동일 actor_id로 최근 5초 내 impersonate_start 로그 존재 시 409.
 */

const DUPE_WINDOW_MS = 5_000

const StartBodySchema = z.object({
  partner_id: z.string().uuid(),
})

async function ensureMasterAdmin() {
  const user = await getCurrentUser()
  if (user.role !== 'master_admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  }
  return { ok: true as const, user }
}

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null
  )
}

// ── POST: 대리 접속 시작 ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await ensureMasterAdmin()
  if (!auth.ok) return auth.response

  // 입력 검증
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const parsed = StartBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_partner_id' }, { status: 400 })
  }
  const { partner_id } = parsed.data

  // 중첩 impersonation 차단 (G8)
  const existing = await getImpersonationContext()
  if (existing.isImpersonating) {
    return NextResponse.json(
      { error: 'already_impersonating', current: existing.context.target_partner_id },
      { status: 409 }
    )
  }

  // 대상 파트너 존재 + is_active 검증 (G7)
  const { data: partner, error: partnerError } = await supabaseAdmin
    .from('partners')
    .select('id, is_active, business_name')
    .eq('id', partner_id)
    .single()

  if (partnerError || !partner) {
    return NextResponse.json({ error: 'partner_not_found' }, { status: 404 })
  }
  if (partner.is_active === false) {
    return NextResponse.json({ error: 'partner_inactive' }, { status: 400 })
  }

  // AP 아키텍트 HIGH-2: Race 방어 — 최근 5초 내 동일 actor의 start가 있고
  // 그 이후 end가 없으면 미종료 중복 요청 → 409.
  // end가 존재하면 정상 종료 후 재시작이므로 허용.
  const sinceIso = new Date(Date.now() - DUPE_WINDOW_MS).toISOString()
  const { data: recentStart } = await supabaseAdmin
    .from('system_logs')
    .select('id, created_at')
    .eq('actor_id', auth.user.id)
    .eq('action', 'impersonate_start')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentStart) {
    const { data: recentEnd } = await supabaseAdmin
      .from('system_logs')
      .select('id')
      .eq('actor_id', auth.user.id)
      .eq('action', 'impersonate_end')
      .gt('created_at', recentStart.created_at)
      .limit(1)
      .maybeSingle()

    if (!recentEnd) {
      return NextResponse.json({ error: 'duplicate_request' }, { status: 409 })
    }
  }

  // IMP-07: system_logs 기록 (actor_id, action, on_behalf_of, ip)
  const { error: logError } = await supabaseAdmin.from('system_logs').insert({
    actor_id: auth.user.id,
    action: 'impersonate_start',
    target_table: 'partners',
    target_id: partner.id,
    on_behalf_of: partner.id,
    diff: { before: null, after: { target_partner_id: partner.id } },
    ip: clientIp(request),
  })

  if (logError) {
    return NextResponse.json({ error: 'log_insert_failed' }, { status: 500 })
  }

  // 쿠키 세팅 (로그 성공 후)
  const value = buildSignedCookieValue(partner.id, auth.user.id)
  const response = NextResponse.json({ ok: true, partner_id: partner.id })
  response.cookies.set({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SEC,
  })
  return response
}

// ── DELETE: 대리 접속 종료 ──────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await ensureMasterAdmin()
  if (!auth.ok) return auth.response

  const ctx = await getImpersonationContext()
  // 쿠키가 없거나 무효하면 no-op로 성공 반환 (종료 버튼 재클릭 안전)
  if (!ctx.isImpersonating) {
    const response = NextResponse.json({ ok: true, already_stopped: true })
    response.cookies.delete(COOKIE_NAME)
    return response
  }

  // IMP-07: system_logs 종료 기록
  await supabaseAdmin.from('system_logs').insert({
    actor_id: auth.user.id,
    action: 'impersonate_end',
    target_table: 'partners',
    target_id: ctx.context.target_partner_id,
    on_behalf_of: ctx.context.target_partner_id,
    diff: { before: { target_partner_id: ctx.context.target_partner_id }, after: null },
    ip: clientIp(request),
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.delete(COOKIE_NAME)
  return response
}
