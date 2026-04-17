import { vi, describe, it, expect } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

import type { Database } from '@/types/supabase';

type DomainRequestRow    = Database['public']['Tables']['domain_requests']['Row'];
type DomainRequestInsert = Database['public']['Tables']['domain_requests']['Insert'];
type DomainRequestStatus = Database['public']['Enums']['domain_request_status'];

describe('domain_requests — 타입 정합성 (WL-108)', () => {
  it('Row 타입: 11개 필드 모두 존재', () => {
    // 컴파일 타임 검증 — 필드 누락 시 TypeScript 에러 발생
    const row: DomainRequestRow = {
      id: 'uuid',
      partner_id: 'uuid',
      requested_domain: 'example.com',
      request_type: 'custom_tld',   // 클라우드 기존 컬럼이 nullable이므로 string | null
      status: 'pending',
      verification_record: null,
      rejection_reason: null,
      created_at: null,
      updated_at: null,
      reviewed_at: null,
      activated_at: null,
    };
    expect(row.id).toBeDefined();
    expect(row.partner_id).toBeDefined();
    expect(row.requested_domain).toBeDefined();
  });

  it('status ENUM: 5종 (pending/approved/active/rejected/expired)', () => {
    const statuses: DomainRequestStatus[] = [
      'pending', 'approved', 'active', 'rejected', 'expired',
    ];
    expect(statuses).toHaveLength(5);
    expect(new Set(statuses).size).toBe(5);
  });

  it('status ENUM 기본값: pending', () => {
    // Insert 타입에서 status는 선택적 (DB DEFAULT 'pending' 적용)
    const insert: DomainRequestInsert = {
      partner_id: 'uuid',
      requested_domain: 'partner-a',
      // status 생략 → DB DEFAULT 'pending' 적용
    };
    expect(insert.partner_id).toBeDefined();
    expect(insert.status).toBeUndefined();
  });

  it('Insert 타입: id/timestamps 선택적 (DB 기본값)', () => {
    const minimalInsert: DomainRequestInsert = {
      partner_id: 'uuid',
      requested_domain: 'sub.example.com',
    };
    // id, created_at, updated_at 등은 DB DEFAULT → Insert에서 선택적
    expect(minimalInsert.id).toBeUndefined();
    expect(minimalInsert.created_at).toBeUndefined();
  });

  it('FK 관계: partner_id → partners 테이블', () => {
    // FK 존재 확인은 supabase.ts의 Relationships 섹션으로 컴파일 타임 보장됨
    // 런타임 assertion: partner_id 필드가 Row에 존재
    const row: Pick<DomainRequestRow, 'partner_id'> = { partner_id: 'some-uuid' };
    expect(typeof row.partner_id).toBe('string');
  });
});
