// Toggleable sections — must match partner_sections CHECK constraint (20260412000001)
export const MARKETING_SECTIONS = [
  'pain_points',
  'stats',
  'how_it_works',
  'finops_automation',
  'core_engines',
  'role_based_value',
  'faq',
  'final_cta',
] as const;
export type MarketingSectionType = (typeof MARKETING_SECTIONS)[number];

// Fixed layout sections — rendered directly in layout, not via SECTION_REGISTRY
export const LEGACY_SECTIONS = ['hero', 'footer'] as const;
export type LegacySectionType = (typeof LEGACY_SECTIONS)[number];

// Legal documents — served at /[locale]/(legal)/[type]; DB type uses underscore
// Mapping: URL slug 'cookie-policy' → DB section_type 'cookie_policy' (explicit in page.tsx SLUG_TO_SECTION, WL-111)
export const LEGAL_SECTIONS = ['terms', 'privacy', 'cookie_policy'] as const;
export type LegalSectionType = (typeof LEGAL_SECTIONS)[number];

export type SectionType = MarketingSectionType | LegacySectionType | LegalSectionType;
