import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const ADMIN_HOST = 'admin-whitelabel.opsnow.com';
const BASE_DOMAIN = 'opsnow.com';
const IS_DEV = process.env.NODE_ENV === 'development';
const IS_PREVIEW = process.env.VERCEL_ENV === 'preview';

// [WL-61] Auditor #1 요건: SQL Injection 방지 화이트리스트
const SUPPORTED_LOCALES = ['ko', 'en'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

function createSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 화이트리스트 검증 — 허용되지 않은 값은 기본값(ko)으로 강제
export function validateLocale(raw: string | null | undefined): Locale {
  return SUPPORTED_LOCALES.includes(raw as Locale) ? (raw as Locale) : 'ko';
}

/**
 * 로케일 감지 파이프라인 (우선순위: 쿠키 → IP → 파트너 기본값)
 *
 * ⚠ Architect 초안 수정: `ipCountry === 'KR' ? 'ko' : 'en'` 표현식은
 *   ipCountry가 null이어도 항상 truthy('en')를 반환하여 partner.default_locale에
 *   절대 도달하지 않는 버그가 있었음. null 체크를 분리하여 수정.
 */
function detectLocale(request: NextRequest, partnerDefault: string): Locale {
  // 우선순위 1: 사용자 쿠키 (명시적 언어 선택)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value ?? null;
  if (SUPPORTED_LOCALES.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // 우선순위 2: Vercel IP 리전 (헤더가 존재할 때만 사용)
  const ipCountry = request.headers.get('x-vercel-ip-country');
  if (ipCountry !== null) {
    return ipCountry === 'KR' ? 'ko' : 'en';
  }

  // 우선순위 3: 파트너 기본 설정 (화이트리스트 재검증)
  return validateLocale(partnerDefault);
}

function isAdminHost(host: string): boolean {
  return (
    host === ADMIN_HOST ||
    host.startsWith('admin-whitelabel.') ||
    host.startsWith('dev-admin-whitelabel.')
  );
}

/** 순수 localhost (서브도메인 없는 경우만) — e.g. localhost:3000, 127.0.0.1 */
function isPlainLocalhost(host: string): boolean {
  const cleanHost = host.split(':')[0];
  return (
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === '::1'
  );
}

/** *.localhost 서브도메인 추출 — e.g. "partner-a.localhost:3000" → "partner-a" */
function extractLocalhostSubdomain(host: string): string | null {
  const cleanHost = host.split(':')[0];
  const match = cleanHost.match(/^(.+)\.localhost$/);
  return match ? match[1] : null;
}

// [WL-61] 타입 재생성 전 임시 인터페이스 — type gen 후 Database 타입으로 자동 대체됨
interface PartnerLocaleData {
  id: string;
  default_locale: string;
  published_locales: string[];
}

function parsePartnerLocaleData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any> | null
): PartnerLocaleData | null {
  if (!data) return null;
  return {
    id: data.id as string,
    default_locale: (data.default_locale as string) ?? 'ko',
    published_locales: (data.published_locales as string[]) ?? ['ko'],
  };
}

async function resolvePartnerFromHost(host: string): Promise<PartnerLocaleData | null> {
  const supabase = createSupabaseClient();
  const cleanHost = host.split(':')[0];
  // [WL-61] default_locale, published_locales 신규 컬럼 추가
  const selectCols = 'id, default_locale, published_locales';

  // 1. *.localhost 서브도메인 (로컬 개발 — 프로덕션과 동일한 매칭 로직)
  const localhostSubdomain = extractLocalhostSubdomain(host);
  if (localhostSubdomain) {
    const { data } = await supabase
      .from('partners')
      .select(selectCols)
      .eq('subdomain', localhostSubdomain)
      .eq('is_active', true)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsePartnerLocaleData(data as Record<string, any> | null);
  }

  // 2. *.opsnow.com 서브도메인 (프로덕션 및 dev- 접두어 개발 환경)
  // dev-partner-a.opsnow.com → DB 조회 시 'partner-a'로 정규화
  if (cleanHost.endsWith(`.${BASE_DOMAIN}`)) {
    const rawSubdomain = cleanHost.slice(0, -(`.${BASE_DOMAIN}`.length));
    const subdomain = rawSubdomain.startsWith('dev-')
      ? rawSubdomain.slice('dev-'.length)
      : rawSubdomain;
    const { data } = await supabase
      .from('partners')
      .select(selectCols)
      .eq('subdomain', subdomain)
      .eq('is_active', true)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsePartnerLocaleData(data as Record<string, any> | null);
  }

  // 3. 커스텀 도메인 (custom_domain_status = 'active' 인 경우에만)
  const { data } = await supabase
    .from('partners')
    .select(selectCols)
    .eq('custom_domain', cleanHost)
    .eq('custom_domain_status', 'active')
    .eq('is_active', true)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parsePartnerLocaleData(data as Record<string, any> | null);
}

/** proxy.ts 내부용: 로케일 + 파트너 ID로 최종 리라이트 URL 생성 */
function buildRewriteUrl(
  request: NextRequest,
  partnerId: string,
  locale: Locale,
  pathname: string
): URL {
  const url = request.nextUrl.clone();
  url.pathname = `/${partnerId}/${locale}${pathname === '/' ? '' : pathname}`;
  return url;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const pathname = request.nextUrl.pathname;

  if (IS_DEV) {
    console.log(`[Proxy] host=${host} pathname=${pathname}`);
  }

  // 어드민 사이트: 파트너 라우팅 없이 통과
  if (isAdminHost(host)) {
    if (IS_DEV) console.log('[Proxy] → Admin passthrough');
    return NextResponse.next();
  }

  // 순수 localhost 또는 Vercel 기본 도메인(*.vercel.app): DEV_PARTNER_SLUG 기반 fallback
  // *.vercel.app은 실제 파트너 도메인이 아니므로 DEV_PARTNER_SLUG로만 접근 가능
  // ?partner=slug 쿼리 파라미터는 이 블록(dev/preview 환경)에서만 유효 — 프로덕션 도메인 격리 보호
  if (isPlainLocalhost(host) || host.endsWith('.vercel.app')) {
    const devSlug =
      request.nextUrl.searchParams.get('partner') ?? process.env.DEV_PARTNER_SLUG;
    if (devSlug) {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from('partners')
        .select('id, default_locale, published_locales')
        .eq('subdomain', devSlug)
        .eq('is_active', true)
        .maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const partner = parsePartnerLocaleData(data as Record<string, any> | null);
      if (partner) {
        const locale = detectLocale(request, partner.default_locale);
        const finalLocale = partner.published_locales.includes(locale)
          ? locale
          : validateLocale(partner.default_locale);
        const url = buildRewriteUrl(request, partner.id, finalLocale, pathname);
        if (IS_DEV) console.log(`[Proxy] → DEV_PARTNER_SLUG rewrite to ${url.pathname}`);
        return NextResponse.rewrite(url);
      }
    }
    if (IS_DEV) console.log('[Proxy] → Localhost passthrough (no DEV_PARTNER_SLUG set)');
    return NextResponse.next();
  }

  // *.localhost 서브도메인 + 프로덕션 호스트 처리
  const partner = await resolvePartnerFromHost(host);

  if (!partner) {
    if (IS_DEV) console.log(`[Proxy] → Partner not found for host: ${host}`);
    return NextResponse.redirect(new URL('/not-found', request.url));
  }

  // [WL-61] 로케일 감지
  const locale = detectLocale(request, partner.default_locale);

  // [WL-61] Published Locales Guard — 미발행 언어는 기본 언어로 Soft-landing
  const finalLocale: Locale = partner.published_locales.includes(locale)
    ? validateLocale(locale)
    : validateLocale(partner.default_locale);

  const url = buildRewriteUrl(request, partner.id, finalLocale, pathname);
  if (IS_DEV) console.log(`[Proxy] → Rewriting to ${url.pathname} (locale=${finalLocale})`);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
