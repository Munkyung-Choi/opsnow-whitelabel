import { describe, it, expect } from 'vitest';
import { leadSchema } from './lead';

describe('leadSchema — 입력 검증', () => {
  it('유효한 입력 전체 — parse 성공', () => {
    const result = leadSchema.safeParse({
      customer_name: '홍길동',
      company_name: 'OpsNow',
      email: 'test@example.com',
      phone: '010-1234-5678',
      cloud_usage_amount: '1000만원 이상',
    });
    expect(result.success).toBe(true);
  });

  it('필수 필드(customer_name, email)만 있어도 parse 성공', () => {
    const result = leadSchema.safeParse({
      customer_name: '홍길동',
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('customer_name 빈 문자열 — 에러 반환', () => {
    const result = leadSchema.safeParse({
      customer_name: '',
      email: 'test@example.com',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.customer_name).toBeDefined();
    }
  });

  it('email 형식 오류 — 에러 반환', () => {
    const result = leadSchema.safeParse({
      customer_name: '홍길동',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it('customer_name 누락(undefined) — 에러 반환', () => {
    const result = leadSchema.safeParse({
      email: 'test@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('email 누락 — 에러 반환', () => {
    const result = leadSchema.safeParse({
      customer_name: '홍길동',
    });
    expect(result.success).toBe(false);
  });

  it('optional 필드 undefined 허용 — parse 성공', () => {
    const result = leadSchema.safeParse({
      customer_name: '홍길동',
      email: 'test@example.com',
      company_name: undefined,
      phone: undefined,
      cloud_usage_amount: undefined,
    });
    expect(result.success).toBe(true);
  });
});
