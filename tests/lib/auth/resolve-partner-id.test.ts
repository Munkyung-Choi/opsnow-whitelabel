import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  resolvePartnerId,
  PARTNER_SCOPED_TABLES,
} from '@/lib/auth/resolve-partner-id'
import type { CurrentUser } from '@/lib/auth/get-current-user'

// WL-123 — resolvePartnerId 단일 진입점 규칙 검증
//
// 규칙 우선순위 (Audit Digest 참조):
//   Rule 1: auditDetails.partner_id 명시 → 그 값
//   Rule 2: auditDetails.on_behalf_of 존재 → 복사
//   Rule 3: partner_admin + target_table ∈ PARTNER_SCOPED_TABLES → user.partner_id
//   Rule 4: master_admin + target_table ∈ PARTNER_SCOPED_TABLES + 미명시 → warn + NULL
//   Fallthrough: NULL

const MASTER_USER: CurrentUser = {
  id: 'master-user-id',
  email: 'master@example.com',
  role: 'master_admin',
  partner_id: null,
} as CurrentUser

const PARTNER_A_USER: CurrentUser = {
  id: 'partner-a-admin-id',
  email: 'partner-a@example.com',
  role: 'partner_admin',
  partner_id: 'partner-a-id',
} as CurrentUser

const PARTNER_B_ID = 'partner-b-id'

describe('resolvePartnerId — Rule 1: 명시 우선', () => {
  it('auditDetails.partner_id 명시 → 그 값 반환 (다른 조건 무시)', () => {
    const result = resolvePartnerId(MASTER_USER, { partner_id: 'explicit-partner' })
    expect(result).toBe('explicit-partner')
  })

  it('auditDetails.partner_id + on_behalf_of 동시 명시 → partner_id 우선', () => {
    const result = resolvePartnerId(MASTER_USER, {
      partner_id: 'explicit-partner',
      on_behalf_of: 'different-partner',
    })
    expect(result).toBe('explicit-partner')
  })
})

describe('resolvePartnerId — Rule 2: on_behalf_of 복사', () => {
  it('master_admin + on_behalf_of 존재 → on_behalf_of 값을 partner_id로 반환', () => {
    const result = resolvePartnerId(MASTER_USER, { on_behalf_of: PARTNER_B_ID })
    expect(result).toBe(PARTNER_B_ID)
  })

  it('partner_admin + on_behalf_of 존재 → on_behalf_of 우선 (Rule 1 미명시 시)', () => {
    const result = resolvePartnerId(PARTNER_A_USER, { on_behalf_of: 'some-partner' })
    expect(result).toBe('some-partner')
  })
})

describe('resolvePartnerId — Rule 3: partner_admin 자동 주입', () => {
  it('partner_admin + target_table=contents → user.partner_id 반환', () => {
    const result = resolvePartnerId(PARTNER_A_USER, { target_table: 'contents' })
    expect(result).toBe('partner-a-id')
  })

  it('partner_admin + target_table=leads → user.partner_id 반환', () => {
    const result = resolvePartnerId(PARTNER_A_USER, { target_table: 'leads' })
    expect(result).toBe('partner-a-id')
  })

  it('partner_admin + target_table=profiles (비스코프) → NULL', () => {
    const result = resolvePartnerId(PARTNER_A_USER, { target_table: 'profiles' })
    expect(result).toBeNull()
  })

  it('partner_admin + target_table=global_contents (비스코프) → NULL', () => {
    const result = resolvePartnerId(PARTNER_A_USER, {
      target_table: 'global_contents',
    })
    expect(result).toBeNull()
  })

  it('partner_admin + target_table 미지정 → NULL', () => {
    const result = resolvePartnerId(PARTNER_A_USER, {})
    expect(result).toBeNull()
  })
})

describe('resolvePartnerId — Rule 4: master_admin 경고', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('master_admin + contents 수정 + partner_id/on_behalf_of 미명시 → console.warn 호출 + NULL', () => {
    const result = resolvePartnerId(MASTER_USER, {
      target_table: 'contents',
      target_id: 'content-123',
    })
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain('partner_id missing')
    expect(warnSpy.mock.calls[0][0]).toContain('contents:content-123')
  })

  it('master_admin + partners 수정 + target_id 존재 → warn + NULL', () => {
    const result = resolvePartnerId(MASTER_USER, {
      target_table: 'partners',
      target_id: 'partner-xyz',
    })
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('master_admin + global_contents (비스코프) → warn 없음 + NULL', () => {
    const result = resolvePartnerId(MASTER_USER, {
      target_table: 'global_contents',
      target_id: 'gc-1',
    })
    expect(result).toBeNull()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('master_admin + 스코프 테이블 + target_id 없음 → warn 없음 (명시 누락 감지 조건 미충족)', () => {
    const result = resolvePartnerId(MASTER_USER, { target_table: 'contents' })
    expect(result).toBeNull()
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe('resolvePartnerId — Fallthrough', () => {
  it('master_admin + 모든 조건 미해당 → NULL', () => {
    const result = resolvePartnerId(MASTER_USER, {})
    expect(result).toBeNull()
  })

  it('master_admin + action-only (target 정보 없음) → NULL', () => {
    const result = resolvePartnerId(MASTER_USER, { diff: { anything: 'x' } })
    expect(result).toBeNull()
  })
})

describe('PARTNER_SCOPED_TABLES 상수 검증', () => {
  it('화이트리스트에 partners, contents, partner_sections, leads, site_visits, domain_requests 포함', () => {
    expect(PARTNER_SCOPED_TABLES).toEqual([
      'partners',
      'contents',
      'partner_sections',
      'leads',
      'site_visits',
      'domain_requests',
    ])
  })

  it('화이트리스트에 profiles, global_contents, system_logs 제외 (Default Deny)', () => {
    const tables = PARTNER_SCOPED_TABLES as readonly string[]
    expect(tables).not.toContain('profiles')
    expect(tables).not.toContain('global_contents')
    expect(tables).not.toContain('system_logs')
  })
})
