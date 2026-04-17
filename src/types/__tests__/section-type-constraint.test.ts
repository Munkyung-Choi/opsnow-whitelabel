import { describe, it, expect } from 'vitest';
import { MARKETING_SECTIONS, LEGACY_SECTIONS, LEGAL_SECTIONS } from '@/types/section-type';

const CONSTRAINT_SECTION_TYPES = [
  'pain_points', 'stats', 'how_it_works', 'finops_automation',
  'core_engines', 'role_based_value', 'faq', 'final_cta',
  'hero', 'footer',
  'terms', 'privacy', 'cookie_policy',
] as const;

describe('contents.section_type CHECK constraint (WL-110)', () => {
  it('SSOT 13종과 제약 조건 리스트가 완전히 일치한다', () => {
    const ssotSet = new Set([
      ...MARKETING_SECTIONS,
      ...LEGACY_SECTIONS,
      ...LEGAL_SECTIONS,
    ]);
    const constraintSet = new Set(CONSTRAINT_SECTION_TYPES);
    expect(ssotSet).toEqual(constraintSet);
  });

  it('제약 조건은 정확히 13종으로 구성된다', () => {
    expect(CONSTRAINT_SECTION_TYPES).toHaveLength(13);
  });
});
