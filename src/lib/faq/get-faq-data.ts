/**
 * src/lib/faq/get-faq-data.ts
 *
 * WL-97: 글로벌 FAQ 데이터 API
 * global_contents.section_type = 'faq' 에서 데이터 조회.
 *
 * 공통 규칙:
 *   - fetchFaqMeta(): React cache()로 래핑 — 같은 요청에서 DB 쿼리 1회만 실행
 *   - extractI18n()으로 i18n 객체를 locale 문자열로 변환
 *   - 존재하지 않는 slug → null 반환 (호출부가 notFound() 처리)
 */

import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import { extractI18n } from '@/lib/marketing/get-partner-page-data';
import type { Locale } from '@/proxy';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Public types ──────────────────────────────────────────────────────────────

export interface FaqCategoryItem {
  id: string;
  label: string;   // locale 문자열 추출 완료
  order: number;
}

/** Hub 페이지용 — answer 미포함 (경량화) */
export interface FaqListItem {
  id: string;
  slug: string;
  categoryId: string;
  question: string;
  isFeatured: boolean;
  tags: string[];
  updatedAt: string;
}

/** Detail 페이지용 — answer 포함 */
export interface FaqDetailItem extends FaqListItem {
  answer: string;
}

export interface FaqHubData {
  categories: FaqCategoryItem[];
  items: FaqListItem[];
}

export interface FaqDetailData {
  item: FaqDetailItem;
  category: FaqCategoryItem | null;
  seoTitle: string;
  seoDescription: string;  // answer 첫 160자 (markdown stripped)
  jsonLd: object;           // schema.org FAQPage 구조화 데이터
}

// ── Internal DB layer ─────────────────────────────────────────────────────────

/**
 * global_contents.meta (section_type='faq') 단건 조회.
 * React cache()로 래핑 — getFaqHub + getFaqDetailBySlug가 같은 요청에서
 * 호출되어도 DB 쿼리는 1회만 실행.
 */
const fetchFaqMeta = cache(async (): Promise<Json | null> => {
  const { data, error } = await supabase
    .from('global_contents')
    .select('meta')
    .eq('section_type', 'faq')
    .single();

  if (error) {
    // PGRST116: 행 없음 — 시딩 전 정상 케이스, 로그 생략
    if (error.code !== 'PGRST116') {
      console.error('[WL-97] faq meta fetch error:', error.message);
    }
    return null;
  }

  return data?.meta ?? null;
});

// ── Parsing helpers ───────────────────────────────────────────────────────────

function parseCategories(meta: Record<string, Json>, locale: Locale): FaqCategoryItem[] {
  const cats = meta['categories'];
  if (!Array.isArray(cats)) return [];
  return cats
    .flatMap((cat) => {
      if (!cat || typeof cat !== 'object' || Array.isArray(cat)) return [];
      const c = cat as Record<string, Json>;
      if (typeof c.id !== 'string') return [];
      const label = extractI18n(c.label, locale) ?? c.id;
      const order = typeof c.order === 'number' ? c.order : 0;
      return [{ id: c.id, label, order }];
    })
    .sort((a, b) => a.order - b.order);
}

function parseDetailItems(meta: Record<string, Json>, locale: Locale): FaqDetailItem[] {
  const items = meta['items'];
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const i = item as Record<string, Json>;
    if (typeof i.id !== 'string' || typeof i.slug !== 'string') return [];
    const question = extractI18n(i.question, locale);
    if (!question) return [];
    return [{
      id: i.id,
      slug: i.slug,
      categoryId: typeof i.categoryId === 'string' ? i.categoryId : '',
      question,
      answer: extractI18n(i.answer, locale) ?? '',
      isFeatured: i.isFeatured === true,
      tags: Array.isArray(i.tags)
        ? i.tags.flatMap((t) => (typeof t === 'string' ? [t] : []))
        : [],
      updatedAt: typeof i.updatedAt === 'string' ? i.updatedAt : '',
    }];
  });
}

// ── Markdown → plain text ─────────────────────────────────────────────────────
// R-3: [text](url) → text 유지, URL 제거 (SEO상 유리)

export function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, '')               // ## heading → 제거
    .replace(/\*\*(.+?)\*\*/g, '$1')          // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')               // *italic* → italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')        // [text](url) → text (URL 제거)
    .replace(/`(.+?)`/g, '$1')                 // `code` → code
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 160);
}

// ── JSON-LD FAQPage ───────────────────────────────────────────────────────────

export function buildFaqJsonLd(question: string, answer: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripMarkdown(answer),
      },
    }],
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * WL-97: FAQ Hub 페이지 데이터 조회.
 * answer 미포함 — hub 페이지 목록 렌더링 성능 최적화.
 * DB 미시딩 또는 조회 실패 시 null 반환.
 */
export const getFaqHub = cache(async (locale: Locale): Promise<FaqHubData | null> => {
  const meta = await fetchFaqMeta();
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const m = meta as Record<string, Json>;

  const categories = parseCategories(m, locale);
  const detailItems = parseDetailItems(m, locale);

  // Hub용 경량화: answer 제거
  const items: FaqListItem[] = detailItems.map(({ answer: _answer, ...rest }) => rest);

  return { categories, items };
});

/**
 * WL-97: FAQ 상세 페이지 데이터 조회 (slug 기준).
 * answer 포함, SEO 메타데이터 + JSON-LD 반환.
 * 존재하지 않는 slug → null 반환 (호출부에서 notFound() 처리).
 */
export const getFaqDetailBySlug = cache(async (
  slug: string,
  locale: Locale,
): Promise<FaqDetailData | null> => {
  const meta = await fetchFaqMeta();
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const m = meta as Record<string, Json>;

  const allItems = parseDetailItems(m, locale);
  const found = allItems.find((item) => item.slug === slug);
  if (!found) return null;

  const categories = parseCategories(m, locale);
  const category = categories.find((c) => c.id === found.categoryId) ?? null;

  return {
    item: found,
    category,
    seoTitle: `${found.question} | FAQ`,
    seoDescription: stripMarkdown(found.answer),
    jsonLd: buildFaqJsonLd(found.question, found.answer),
  };
});
