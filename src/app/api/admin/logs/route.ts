import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit/write-audit-log'

const LogBodySchema = z.object({
  action: z.string().min(1),
  target_table: z.string().optional(),
  target_id: z.string().uuid().optional(),
  diff: z.record(z.string(), z.unknown()).optional(),
  on_behalf_of: z.string().uuid().optional(),
})

/**
 * POST /api/admin/logs
 * 브라우저 fetch 경로 감사 로그용 엔드포인트 (Admin UI → 서버 기록).
 *
 * Server Action 내부에서는 withAdminAction이 writeAuditLog를 직접 호출하므로
 * 이 엔드포인트를 fetch로 돌아갈 필요 없다 — Server Action은 lib 직접 호출.
 *
 * Authorization: Bearer {access_token} 헤더 필수.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = LogBodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    await writeAuditLog({
      actor_id: user.id,
      action: parsed.data.action,
      target_table: parsed.data.target_table,
      target_id: parsed.data.target_id,
      diff: parsed.data.diff,
      on_behalf_of: parsed.data.on_behalf_of,
      ip: request.headers.get('x-forwarded-for') ?? null,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Log write failed' },
      { status: 500 }
    )
  }
}
