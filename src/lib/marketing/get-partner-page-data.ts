import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import { validatePartner, type Partner } from '@/services/partnerService';
import type { Locale } from '@/proxy';
import { interpolateString, interpolateJson } from '@/lib/utils/interpolate';
import type { MarketingSectionType } from '@/types/section-type';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ContentRow = Database['public']['Tables']['contents']['Row'];
type GlobalContentRow = Database['public']['Tables']['global_contents']['Row'];
type PartnerSectionRow = Database['public']['Tables']['partner_sections']['Row'];

// Global section types fetched for all partners (fixed / not partner-editable)
export const GLOBAL_SECTION_TYPES: readonly MarketingSectionType[] = [
  'pain_points',
  'finops_automation',
  'core_engines',
  'role_based_value',
  'faq',
] as const;

// Default section order when partner has no partner_sections rows (new partners)
export interface SectionConfig {
  section_type: MarketingSectionType;
  is_visible: boolean;
  display_order: number;
}

export const DEFAULT_SECTIONS: SectionConfig[] = [
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
 * [WL-61] {"ko": "...", "en": "..."} 구조에서 locale 키 추출.
 * 컴포넌트에서 직접 호출할 수 있도록 export됨.
 *
 * TEXT 컬럼에 JSON 포맷 문자열이 저장된 경우도 처리한다.
 * Supabase는 TEXT 컬럼을 파싱 없이 string으로 반환하므로,
 * '{' pre-check 후 JSON.parse를 시도하고 실패하면 레거시 plain string으로 취급.
 *
 * 폴백 순서: 요청 locale → ko → en → 첫 번째 값 → plain string 원본
 */
export function extractI18n(value: Json | null | undefined, locale: Locale): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    // Performance: '{' 로 시작하는 문자열만 JSON.parse 시도 (ReDoS·성능 방어)
    if (value.trimStart().startsWith('{')) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return extractFromObj(parsed as Record<string, unknown>, locale) ?? value;
        }
      } catch {
        // JSON 파싱 실패 — 레거시 plain string으로 취급
      }
    }
    return value;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return extractFromObj(value as Record<string, Json>, locale);
  }
  return null;
}

/** locale 키 추출 내부 헬퍼. 폴백 순서: locale → ko → en → 첫 번째 문자열 값 */
function extractFromObj(obj: Record<string, unknown>, locale: string): string | null {
  const tryStr = (v: unknown): string | null =>
    typeof v === 'string' && v.length > 0 ? v : null;

  return (
    tryStr(obj[locale]) ??
    tryStr(obj['ko']) ??
    tryStr(obj['en']) ??
    (Object.values(obj).find((v) => typeof v === 'string' && (v as string).length > 0) as string | undefined) ??
    null
  );
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
  // body는 TEXT 컬럼이므로 항상 string. '[' 로 시작하면 JSON 배열 문자열로 파싱 시도.
  const rawBody = row.body;
  let parsedBody: Json | null = rawBody;
  if (typeof rawBody === 'string' && rawBody.trimStart().startsWith('[')) {
    try { parsedBody = JSON.parse(rawBody) as Json; } catch { /* keep string */ }
  }
  const bodyIsArray = Array.isArray(parsedBody);
  return {
    id: row.id,
    partner_id: row.partner_id,
    section_type: row.section_type,
    is_published: row.is_published,
    title: applyInterp(extractI18n(row.title as Json, locale), businessName),
    subtitle: applyInterp(extractI18n(row.subtitle as Json, locale), businessName),
    body: bodyIsArray ? null : applyInterp(extractI18n(parsedBody, locale), businessName),
    body_json: bodyIsArray ? deepLocalizeJson(interpolateJson(parsedBody, businessName), locale) : null,
    cta_text: applyInterp(extractI18n(row.cta_text as Json, locale), businessName),
    contact_info: row.contact_info, // excluded from interpolation (email/phone/address)
    updated_at: row.updated_at,
  };
}

/**
 * [WL-92] Option B: meta JSON을 깊이 순회하여 i18n 객체를 locale 문자열로 치환.
 *
 * i18n 탐지 기준: { ko, en, ja, zh } 중 하나 이상의 키가 string 값으로 존재.
 * plain string / number / boolean / null → 변환 없이 통과 (Backward Compatible).
 * 재귀 깊이: 현재 실측 meta 구조(1~2레벨)를 커버하며 최대 10레벨로 제한.
 */
function deepLocalizeJson(value: Json, locale: Locale, depth = 0): Json {
  if (depth > 10 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return (value as Json[]).map((item) => deepLocalizeJson(item, locale, depth + 1));
  }
  const obj = value as Record<string, Json>;
  // i18n 객체 탐지: locale key가 string 값으로 존재
  if (['ko', 'en', 'ja', 'zh'].some((k) => typeof obj[k] === 'string')) {
    const extracted = extractI18n(value, locale);
    return extracted !== null ? extracted : value;
  }
  // 일반 객체: 각 값을 재귀 처리
  const result: Record<string, Json> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = deepLocalizeJson(v, locale, depth + 1);
  }
  return result;
}

function localizeGlobalContentRow(row: GlobalContentRow, locale: Locale, businessName: string): LocalizedGlobalContentRow {
  const interpolated = interpolateJson(row.meta, businessName);
  return {
    id: row.id,
    section_type: row.section_type,
    title: applyInterp(extractI18n(row.title as Json, locale), businessName),
    subtitle: applyInterp(extractI18n(row.subtitle as Json, locale), businessName),
    // meta: interpolation 후 deep localize — 파서는 locale-free 순수 구조 변환기가 됨
    meta: interpolated !== null ? deepLocalizeJson(interpolated, locale) : null,
    updated_at: row.updated_at,
  };
}

// ─── Main exported interface ──────────────────────────────────────────────────
// FeatureCard, FeaturesContent 타입은 parsers.ts에서 import (WL-92)

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
  cookie_policy: LocalizedContentRow | null;
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
          section_type: r.section_type as MarketingSectionType,
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
    cookie_policy: bySection('cookie_policy'),
  };
});
