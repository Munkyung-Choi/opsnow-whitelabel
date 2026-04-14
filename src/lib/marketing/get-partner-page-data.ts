import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import { validatePartner, type Partner } from '@/services/partnerService';
import type { Locale } from '@/proxy';
import { interpolateString, interpolateJson } from '@/lib/utils/interpolate';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ContentRow = Database['public']['Tables']['contents']['Row'];
type GlobalContentRow = Database['public']['Tables']['global_contents']['Row'];
type PartnerSectionRow = Database['public']['Tables']['partner_sections']['Row'];

// Global section types fetched for all partners (fixed / not partner-editable)
const GLOBAL_SECTION_TYPES = [
  'pain_points',
  'finops_automation',
  'core_engines',
  'role_based_value',
  'features',
] as const;

// Default section order when partner has no partner_sections rows (new partners)
export interface SectionConfig {
  section_type: string;
  is_visible: boolean;
  display_order: number;
}

const DEFAULT_SECTIONS: SectionConfig[] = [
  { section_type: 'pain_points', is_visible: true, display_order: 1 },
  { section_type: 'stats', is_visible: true, display_order: 2 },
  { section_type: 'how_it_works', is_visible: true, display_order: 3 },
  { section_type: 'finops_automation', is_visible: true, display_order: 4 },
  { section_type: 'core_engines', is_visible: true, display_order: 5 },
  { section_type: 'role_based_value', is_visible: true, display_order: 6 },
  { section_type: 'faq', is_visible: true, display_order: 7 },
  { section_type: 'final_cta', is_visible: true, display_order: 8 },
];

/**
 * [WL-61] JSONB {"ko": "...", "en": null} 구조에서 locale 키 추출.
 * 컴포넌트에서 직접 호출할 수 있도록 export됨.
 */
export function extractI18n(value: Json | null | undefined, locale: Locale): string | null {
  if (value === null || value === undefined) return null;
  // 마이그레이션 전 레거시 데이터 (plain string) 호환
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, Json>;
    const localized = obj[locale];
    if (typeof localized === 'string' && localized.length > 0) return localized;
    // 요청 locale 값이 null/빈 문자열이면 'ko'로 폴백
    const fallback = obj['ko'];
    return typeof fallback === 'string' ? fallback : null;
  }
  return null;
}

/**
 * ContentRow의 JSONB 텍스트 필드를 locale에 맞게 추출한 단순화 타입.
 * body_json: stats, how_it_works, faq 처럼 배열 JSONB body를 가진 섹션용 raw 필드.
 */
export interface LocalizedContentRow {
  id: string;
  partner_id: string;
  section_type: string;
  is_published: boolean | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;        // i18n 문자열 추출 (hero, terms 등 텍스트 섹션)
  body_json: Json | null;     // 배열 JSON 원본 (stats, how_it_works, faq 등 배열 섹션)
  cta_text: string | null;
  contact_info: Json | null;
  updated_at: string | null;
}

/**
 * GlobalContentRow의 locale 추출 타입.
 * meta 필드는 섹션별 구조화 데이터 (cards, features, engines, roles 배열 등).
 */
export interface LocalizedGlobalContentRow {
  id: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  meta: Json | null;
  updated_at: string | null;
}

/** null-safe 문자열 인터폴레이션 헬퍼 */
function applyInterp(value: string | null, businessName: string): string | null {
  return value === null ? null : interpolateString(value, businessName);
}

function localizeContentRow(row: ContentRow, locale: Locale, businessName: string): LocalizedContentRow {
  const rawBody = row.body;
  const bodyIsArray = Array.isArray(rawBody);
  return {
    id: row.id,
    partner_id: row.partner_id,
    section_type: row.section_type,
    is_published: row.is_published,
    title: applyInterp(extractI18n(row.title as Json, locale), businessName),
    subtitle: applyInterp(extractI18n(row.subtitle as Json, locale), businessName),
    body: bodyIsArray ? null : applyInterp(extractI18n(rawBody as Json, locale), businessName),
    body_json: bodyIsArray ? interpolateJson(rawBody as Json, businessName) : null,
    cta_text: applyInterp(extractI18n(row.cta_text as Json, locale), businessName),
    contact_info: row.contact_info, // excluded from interpolation (email/phone/address)
    updated_at: row.updated_at,
  };
}

function localizeGlobalContentRow(row: GlobalContentRow, locale: Locale, businessName: string): LocalizedGlobalContentRow {
  return {
    id: row.id,
    section_type: row.section_type,
    title: applyInterp(extractI18n(row.title as Json, locale), businessName),
    subtitle: applyInterp(extractI18n(row.subtitle as Json, locale), businessName),
    meta: interpolateJson(row.meta, businessName),
    updated_at: row.updated_at,
  };
}

// ─── Legacy types (backward-compat — FeaturesSection, AboutSection) ───────────

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

export interface FeaturesContent {
  title: string | null;
  subtitle: string | null;
  cards: FeatureCard[];
}

export interface FooterContactInfo {
  email?: string;
  phone?: string;
  address?: string;
}

export function parseFooterContactInfo(contactInfo: Json | null): FooterContactInfo {
  if (!contactInfo || typeof contactInfo !== 'object' || Array.isArray(contactInfo)) return {};
  const obj = contactInfo as Record<string, Json>;
  return {
    email: typeof obj.email === 'string' ? obj.email : undefined,
    phone: typeof obj.phone === 'string' ? obj.phone : undefined,
    address: typeof obj.address === 'string' ? obj.address : undefined,
  };
}

// [WL-58] LocalizedGlobalContentRow를 받도록 변경 — title/subtitle은 이미 locale 추출 + 인터폴레이션 완료.
// meta 내부 카드들의 i18n 객체는 여전히 locale 추출이 필요하므로 locale 파라미터 유지.
function parseFeaturesContent(row: LocalizedGlobalContentRow | null, locale: Locale): FeaturesContent | null {
  if (!row) return null;
  const meta = row.meta;
  let cards: FeatureCard[] = [];
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const rawCards = (meta as Record<string, Json>)['cards'];
    if (Array.isArray(rawCards)) {
      cards = rawCards.flatMap((card) => {
        if (!card || typeof card !== 'object' || Array.isArray(card)) return [];
        const c = card as Record<string, Json>;
        const title = extractI18n(c.title, locale) ?? (typeof c.title === 'string' ? c.title : '');
        const description = extractI18n(c.description, locale) ?? (typeof c.description === 'string' ? c.description : '');
        if (typeof c.icon !== 'string' || !title || !description) return [];
        return [{ icon: c.icon, title, description }];
      });
    }
  }
  return {
    title: row.title,
    subtitle: row.subtitle,
    cards,
  };
}

// ─── Main exported interface ──────────────────────────────────────────────────

export interface PartnerPageData {
  partner: Partner;
  // WL-40: 동적 오케스트레이션
  sections: SectionConfig[];                              // display_order 정렬, is_visible=true 필터 (RLS)
  contents: Map<string, LocalizedContentRow>;             // section_type → row
  globalContents: Map<string, LocalizedGlobalContentRow>; // section_type → row
  locale: Locale;
  // 하위 호환 필드 (terms/privacy 페이지 등 기존 소비자 유지)
  hero: LocalizedContentRow | null;
  about: LocalizedContentRow | null;
  footer: LocalizedContentRow | null;
  terms: LocalizedContentRow | null;
  privacy: LocalizedContentRow | null;
  features: FeaturesContent | null;
}

export const getPartnerPageData = cache(async (
  partnerId: string,
  locale: Locale
): Promise<PartnerPageData | null> => {
  // [WL-69] 개별 쿼리에 .catch() 적용 — 특정 쿼리 실패 시 나머지 데이터로 부분 렌더링 유지 (Graceful Degradation)
  // Promise.resolve() 래핑: PostgrestBuilder는 PromiseLike이므로 .catch()가 직접 없음
  // validatePartner는 내부에 이미 try/catch 있어 래핑 불필요
  const [partner, contentsResult, globalContentsResult, partnerSectionsResult] = await Promise.all([
    validatePartner(partnerId),
    Promise.resolve(
      supabase.from('contents').select('*').eq('partner_id', partnerId).eq('is_published', true)
    ).catch((err: unknown) => {
      console.error('[WL-69] contents fetch failed:', err instanceof Error ? err.message : String(err));
      return { data: null as ContentRow[] | null, error: null };
    }),
    Promise.resolve(
      supabase.from('global_contents').select('*').in('section_type', GLOBAL_SECTION_TYPES)
    ).catch((err: unknown) => {
      console.error('[WL-69] global_contents fetch failed:', err instanceof Error ? err.message : String(err));
      return { data: null as GlobalContentRow[] | null, error: null };
    }),
    Promise.resolve(
      supabase.from('partner_sections').select('*').eq('partner_id', partnerId).order('display_order', { ascending: true })
    ).catch((err: unknown) => {
      console.error('[WL-69] partner_sections fetch failed:', err instanceof Error ? err.message : String(err));
      return { data: null as PartnerSectionRow[] | null, error: null };
    }),
  ]);

  if (!partner) return null;

  // Contents → Map (인터폴레이션 적용)
  const rawContents = contentsResult.data ?? [];
  const contents = new Map<string, LocalizedContentRow>(
    rawContents.map((row) => [row.section_type, localizeContentRow(row, locale, partner.business_name)])
  );

  // Global contents → Map (인터폴레이션 적용)
  const rawGlobal = globalContentsResult.data ?? [];
  const globalContents = new Map<string, LocalizedGlobalContentRow>(
    rawGlobal.map((row) => [row.section_type, localizeGlobalContentRow(row, locale, partner.business_name)])
  );

  // partner_sections → SectionConfig[]
  // RLS anon 정책(is_visible=true)이 자동 필터링하므로 코드 레벨 필터 불필요.
  // rows가 없으면(신규 파트너) DEFAULT_SECTIONS로 폴백.
  const rawSections = (partnerSectionsResult.data ?? []) as PartnerSectionRow[];
  const sections: SectionConfig[] =
    rawSections.length > 0
      ? rawSections.map((r) => ({
          section_type: r.section_type,
          is_visible: r.is_visible,
          display_order: r.display_order,
        }))
      : DEFAULT_SECTIONS;

  // 하위 호환 필드
  const bySection = (type: string): LocalizedContentRow | null =>
    contents.get(type) ?? null;

  return {
    partner,
    sections,
    contents,
    globalContents,
    locale,
    hero: bySection('hero'),
    about: bySection('about'),
    footer: bySection('footer'),
    terms: bySection('terms'),
    privacy: bySection('privacy'),
    features: parseFeaturesContent(globalContents.get('features') ?? null, locale),
  };
});
