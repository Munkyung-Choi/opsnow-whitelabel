import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import { validatePartner, type Partner } from '@/services/partnerService';
import type { Locale } from '@/proxy';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ContentRow = Database['public']['Tables']['contents']['Row'];
type GlobalContentRow = Database['public']['Tables']['global_contents']['Row'];

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
 * [WL-61] ContentRow의 JSONB 텍스트 필드를 locale에 맞게 추출한 단순화 타입.
 * 컴포넌트는 이 타입만 다루며 JSONB 구조를 알 필요가 없다.
 */
export interface LocalizedContentRow {
  id: string;
  partner_id: string;
  section_type: string;
  is_published: boolean | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  cta_text: string | null;
  contact_info: Json | null; // 연락처는 언어 무관 사실 정보
  updated_at: string | null;
}

function localizeContentRow(row: ContentRow, locale: Locale): LocalizedContentRow {
  return {
    id: row.id,
    partner_id: row.partner_id,
    section_type: row.section_type,
    is_published: row.is_published,
    // [WL-61] JSONB에서 locale 기준으로 string 추출
    title: extractI18n(row.title as Json, locale),
    subtitle: extractI18n(row.subtitle as Json, locale),
    body: extractI18n(row.body as Json, locale),
    cta_text: extractI18n(row.cta_text as Json, locale),
    contact_info: row.contact_info,
    updated_at: row.updated_at,
  };
}

export interface PartnerPageData {
  partner: Partner;
  hero: LocalizedContentRow | null;
  about: LocalizedContentRow | null;
  footer: LocalizedContentRow | null;
  terms: LocalizedContentRow | null;
  privacy: LocalizedContentRow | null;
  features: FeaturesContent | null;
  locale: Locale;
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

function parseFeaturesContent(row: GlobalContentRow | null, locale: Locale): FeaturesContent | null {
  if (!row) return null;

  const meta = row.meta;
  let cards: FeatureCard[] = [];

  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const rawCards = (meta as Record<string, Json>)['cards'];
    if (Array.isArray(rawCards)) {
      cards = rawCards.flatMap((card) => {
        if (!card || typeof card !== 'object' || Array.isArray(card)) return [];
        const c = card as Record<string, Json>;
        // [WL-61] feature card 텍스트도 JSONB일 경우 추출, 아니면 string 직접 사용
        const title = extractI18n(c.title, locale) ?? (typeof c.title === 'string' ? c.title : '');
        const description = extractI18n(c.description, locale) ?? (typeof c.description === 'string' ? c.description : '');
        if (typeof c.icon !== 'string' || !title || !description) return [];
        return [{ icon: c.icon, title, description }];
      });
    }
  }

  return {
    // extractLocalized already handles legacy string values (backward compat)
    title: extractI18n(row.title as Json, locale),
    subtitle: extractI18n(row.subtitle as Json, locale),
    cards,
  };
}

export const getPartnerPageData = cache(async (
  partnerId: string,
  locale: Locale
): Promise<PartnerPageData | null> => {
  const [partner, contentsResult, featuresResult] = await Promise.all([
    validatePartner(partnerId),
    supabase
      .from('contents')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('is_published', true),
    supabase
      .from('global_contents')
      .select('*')
      .eq('section_type', 'features')
      .maybeSingle(),
  ]);

  if (!partner) return null;

  const contents = contentsResult.data ?? [];
  const bySection = (type: string): LocalizedContentRow | null => {
    const row = contents.find((c) => c.section_type === type) ?? null;
    return row ? localizeContentRow(row, locale) : null;
  };

  return {
    partner,
    hero: bySection('hero'),
    about: bySection('about'),
    footer: bySection('footer'),
    terms: bySection('terms'),
    privacy: bySection('privacy'),
    features: parseFeaturesContent(featuresResult.data, locale),
    locale,
  };
});
