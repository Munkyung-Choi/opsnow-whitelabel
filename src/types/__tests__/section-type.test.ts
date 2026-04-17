import { vi, describe, it, expect } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

import { MARKETING_SECTIONS, LEGAL_SECTIONS } from '@/types/section-type';
import { DEFAULT_SECTIONS, GLOBAL_SECTION_TYPES } from '@/lib/marketing/get-partner-page-data';

describe('section-type SSOT — MARKETING_SECTIONS 정전 목록', () => {
  it('8종, 중복 없음', () => {
    expect(MARKETING_SECTIONS).toHaveLength(8);
    expect(new Set(MARKETING_SECTIONS).size).toBe(8);
  });

  it('partner_sections CHECK 제약 순서와 일치 (20260412000001)', () => {
    expect([...MARKETING_SECTIONS]).toEqual([
      'pain_points', 'stats', 'how_it_works',
      'finops_automation', 'core_engines', 'role_based_value',
      'faq', 'final_cta',
    ]);
  });
});

describe('section-type SSOT — DEFAULT_SECTIONS === MARKETING_SECTIONS', () => {
  it('section_type 집합이 MARKETING_SECTIONS와 일치', () => {
    const defaultTypes = new Set(DEFAULT_SECTIONS.map((s) => s.section_type));
    const marketingSet = new Set(MARKETING_SECTIONS);
    expect(defaultTypes).toEqual(marketingSet);
  });
});

describe('section-type SSOT — GLOBAL_SECTION_TYPES ⊆ MARKETING_SECTIONS', () => {
  it('모든 global section_type이 MARKETING_SECTIONS의 원소', () => {
    const marketingSet = new Set(MARKETING_SECTIONS);
    for (const type of GLOBAL_SECTION_TYPES) {
      expect(marketingSet.has(type)).toBe(true);
    }
  });
});

describe('section-type SSOT — LEGAL_SECTIONS 정전 목록', () => {
  it('3종 (terms / privacy / cookie_policy)', () => {
    expect([...LEGAL_SECTIONS]).toEqual(['terms', 'privacy', 'cookie_policy']);
  });
});
