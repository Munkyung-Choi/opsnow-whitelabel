import { describe, it, expect } from 'vitest';
import { leadSchema } from '@/lib/schemas/lead';

// WL-154 — leadSchema.strict() 적용 검증 (Auditor MEDIUM #1 방어 + 외부 AI Test Case 1)
// 목적: marketing 리드 수집 폼의 Zod 스키마가 unknown key를 거부하여
// service_role INSERT payload에 악의적 필드(특히 partner_id)가 침투하지 못함을 증명.

describe('leadSchema — WL-154 strict 적용 검증', () => {
  it('정상 페이로드(customer_name + email)는 safeParse.success === true', () => {
    const result = leadSchema.safeParse({
      customer_name: '홍길동',
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('optional 필드(company_name, phone, cloud_usage_amount) 부재도 허용', () => {
    const result = leadSchema.safeParse({
      customer_name: '홍길동',
      email: 'test@example.com',
      company_name: undefined,
      phone: undefined,
      cloud_usage_amount: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('[방어 핵심] unknown key "partner_id" 주입 시 safeParse.success === false', () => {
    const result = leadSchema.safeParse({
      customer_name: '홍길동',
      email: 'test@example.com',
      partner_id: 'evil-partner-uuid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.code === 'unrecognized_keys');
      expect(issue).toBeDefined();
    }
  });

  it('[방어 핵심] unknown key "status" 주입 시 safeParse.success === false', () => {
    const result = leadSchema.safeParse({
      customer_name: '홍길동',
      email: 'test@example.com',
      status: 'contacted',
    });
    expect(result.success).toBe(false);
  });

  it('[방어 핵심] unknown key "created_at" 주입 시 safeParse.success === false', () => {
    const result = leadSchema.safeParse({
      customer_name: '홍길동',
      email: 'test@example.com',
      created_at: '2020-01-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('customer_name 빈 문자열은 거부 (기존 min(1) 규칙 유지)', () => {
    const result = leadSchema.safeParse({
      customer_name: '',
      email: 'test@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('email 포맷 오류는 거부 (기존 .email() 규칙 유지)', () => {
    const result = leadSchema.safeParse({
      customer_name: '홍길동',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});
