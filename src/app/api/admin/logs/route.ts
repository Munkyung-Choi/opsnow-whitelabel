import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'

const LogBodySchema = z.object({
  action: z.string().min(1),
  target_table: z.string().optional(),
  target_id: z.string().uuid().optional(),
  diff: z.record(z.string(), z.unknown()).optional(),
  on_behalf_of: z.string().uuid().optional(),
})

/**
 * POST /api/admin/logs
 * Admin Server Action에서 system_logs를 기록하는 내부 전용 엔드포인트.
 * service_role을 통해 RLS를 우회하여 INSERT 수행.
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

  const { error } = await supabaseAdmin.from('system_logs').insert({
    actor_id: user.id,
    action: parsed.data.action,
    target_table: parsed.data.target_table ?? null,
    target_id: parsed.data.target_id ?? null,
    diff: parsed.data.diff ?? null,
    on_behalf_of: parsed.data.on_behalf_of ?? null,
    ip: request.headers.get('x-forwarded-for') ?? null,
  })

  if (error) {
    return NextResponse.json({ error: 'Log write failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
