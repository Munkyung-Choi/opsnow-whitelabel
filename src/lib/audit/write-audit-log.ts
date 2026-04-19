import { supabaseAdmin } from '@/lib/supabase/server'

export interface AuditLogEntry {
  actor_id: string
  action: string
  target_table?: string | null
  target_id?: string | null
  diff?: Record<string, unknown> | null
  on_behalf_of?: string | null
  ip?: string | null
}

/**
 * system_logs INSERT — service_role 전용. 실패 시 throw.
 *
 * 사용처:
 *   - /api/admin/logs (Route Handler, 브라우저 fetch 경로)
 *   - withAdminAction (Server Action 헬퍼, 자동 기록 경로)
 *
 * 둘 다 동일한 감사 로그 포맷을 사용한다 (SSOT).
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  const { error } = await supabaseAdmin.from('system_logs').insert({
    actor_id: entry.actor_id,
    action: entry.action,
    target_table: entry.target_table ?? null,
    target_id: entry.target_id ?? null,
    diff: (entry.diff ?? null) as never,
    on_behalf_of: entry.on_behalf_of ?? null,
    ip: entry.ip ?? null,
  })
  if (error) {
    throw new Error(`[audit] system_logs write failed: ${error.message}`)
  }
}
