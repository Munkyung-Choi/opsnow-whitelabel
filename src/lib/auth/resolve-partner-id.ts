import type { CurrentUser } from './get-current-user'

/**
 * WL-123 — PARTNER_SCOPED_TABLES 화이트리스트 (Default Deny).
 *
 * 이 목록에 포함된 테이블 작업만 `system_logs.partner_id`에 자동 주입된다.
 * 글로벌 리소스(`global_contents`, `profiles`, `system_logs` 자체 등)는 NULL로 남아
 * partner_admin의 감사 로그 조회에서 제외된다.
 *
 * 새 테이블 추가 시 명시적으로 이 목록에 등록해야 한다 — 보안 정책 의사결정의 단일 진입점.
 */
export const PARTNER_SCOPED_TABLES = [
  'partners',
  'contents',
  'partner_sections',
  'leads',
  'site_visits',
  'domain_requests',
] as const

export type PartnerScopedTable = (typeof PARTNER_SCOPED_TABLES)[number]

function isPartnerScopedTable(
  table: string | undefined
): table is PartnerScopedTable {
  return !!table && (PARTNER_SCOPED_TABLES as readonly string[]).includes(table)
}

export interface ResolvePartnerIdInput {
  target_table?: string
  target_id?: string
  on_behalf_of?: string
  partner_id?: string
}

/**
 * WL-123 — system_logs.partner_id 자동 주입 단일 진입점.
 *
 * 우선순위 (AP Architect Decision 2026-04-19, Auditor Digest WL-123 §Decisions):
 *   Rule 1: auditDetails.partner_id 명시 → 그 값 (최우선)
 *   Rule 2: auditDetails.on_behalf_of 존재 → impersonation 대상으로 복사
 *   Rule 3: partner_admin + target_table ∈ PARTNER_SCOPED_TABLES → user.partner_id
 *   Rule 4: master_admin + target_table ∈ PARTNER_SCOPED_TABLES + target_id 존재 + 미명시
 *           → console.warn + NULL (개발자에게 명시 누락 신호)
 *   Fallthrough: NULL (글로벌 작업 — 정당한 NULL)
 *
 * 설계 근거: "명시성 = 안정성". URL 자동 감지 같은 '숨은 마법' 대신 명시적 계약으로
 * 추적성을 확보한다. Rule 4의 warn은 AI 개발 공정에서 실수를 즉시 피드백하는 장치.
 */
export function resolvePartnerId(
  user: CurrentUser,
  input: ResolvePartnerIdInput
): string | null {
  // Rule 1: 명시 우선
  if (input.partner_id) {
    return input.partner_id
  }

  // Rule 2: impersonation 복사
  if (input.on_behalf_of) {
    return input.on_behalf_of
  }

  const scoped = isPartnerScopedTable(input.target_table)

  // Rule 3: partner_admin 자동 주입 (스코프 테이블만)
  if (user.role === 'partner_admin' && scoped && user.partner_id) {
    return user.partner_id
  }

  // Rule 4: master_admin 스코프 테이블 직편집 누락 감지
  if (user.role === 'master_admin' && scoped && input.target_id) {
    console.warn(
      `[audit] partner_id missing for master_admin ${input.target_table}:${input.target_id}. ` +
        `Explicit auditDetails.partner_id recommended for partner-scoped mutations.`
    )
  }

  // Fallthrough
  return null
}
