import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { type Locale, SUPPORTED_LOCALES, COUNTRY_LOCALE_MAP, validateLocale } from '@/lib/i18n/locales';
// 기존 소비자(import { Locale/validateLocale } from '@/proxy') 하위 호환 re-export
export type { Locale } from '@/lib/i18n/locales';
export { validateLocale }; // 내부 import 바인딩을 그대로 재노출

const ADMIN_HOST = 'admin-whitelabel.opsnow.com';
const BASE_DOMAIN = 'opsnow.com';
const IS_DEV = process.env.NODE_ENV === 'development';
const IS_PREVIEW = process.env.VERCEL_ENV === 'preview';

// ─── Middleware In-Memory Cache ───────────────────────────────────────────────
// Edge Worker 인스턴스 내에서 파트너 조회 중복 방지.
// 캐시 키: "subdomain:{slug}" 또는 "custom_domain:{host}"
const PARTNER_CACHE_TTL_MS = 60_000; // 60초
const MAX_CACHE_SIZE = 500;           // Auditor #2: DoS 방지용 상한

interface PartnerCacheEntry {
  data: PartnerLocaleData | null;
  expiresAt: number;
}

const partnerCache = new Map<string, PartnerCacheEntry>();

function getCached(key: string): PartnerLocaleData | null | undefined {
  const entry = partnerCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    partnerCache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCache(key: string, data: PartnerLocaleData | null): void {
  // FIFO 퇴출: 상한 초과 시 가장 오래된 항목 제거
  if (partnerCache.size >= MAX_CACHE_SIZE) {
    const oldest = partnerCache.keys().next().value;
    if (oldest) partnerCache.delete(oldest);
  }
  partnerCache.set(key, { data, expiresAt: Date.now() + PARTNER_CACHE_TTL_MS });
}

// ─── Supabase Client Singleton ────────────────────────────────────────────────
// 매 요청마다 createClient()를 호출하지 않도록 모듈 레벨에서 1회만 생성
let _supabase: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseClient() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

// [WL-70] 미들웨어 DB 쿼리 타임아웃 — Vercel Edge 제한 고려
const SUPABASE_QUERY_TIMEOUT_MS = 2500;

/**
 * [WL-70] Promise에 타임아웃을 적용한다.
 * 초과 시 Error를 throw — 호출부 catch에서 null 반환하여 미들웨어 크래시를 방지.
 * Edge Runtime의 setTimeout 사용 (Node.js 전용 API 없음).
 * ⚠️ Auditor Note: Promise.race는 기다림만 포기하며 Supabase 요청 자체를 취소하지 않음.
 *    AbortController 미지원 SDK 한계 — Ghost Request 위험은 Edge Worker TTL이 자연 정리.
 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[Proxy] DB timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// [WL-71] SUPPORTED_LOCALES, Locale, validateLocale 는 locales.ts 로 이전.
// 위 import 및 re-export 참고.

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

  // 우선순위 2: Vercel IP 리전 → COUNTRY_LOCALE_MAP 매핑 (헤더가 존재할 때만 사용)
  // [WL-71] ko/en 고정 매핑에서 다국어 매핑 테이블로 교체. 미매핑 국가는 'en' 폴백.
  const ipCountry = request.headers.get('x-vercel-ip-country');
  if (ipCountry !== null) {
    return COUNTRY_LOCALE_MAP[ipCountry] ?? 'en';
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

const PARTNER_SELECT = 'id, default_locale, published_locales';

/** subdomain 기반 파트너 조회 (캐시 적용) */
async function resolvePartnerBySubdomain(subdomain: string): Promise<PartnerLocaleData | null> {
  const cacheKey = `subdomain:${subdomain}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  const supabase = getSupabaseClient();
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('partners')
        .select(PARTNER_SELECT)
        .eq('subdomain', subdomain)
        .eq('is_active', true)
        .maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS
    );
    if (error) console.error(`[Proxy] Supabase error (subdomain=${subdomain}):`, error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = parsePartnerLocaleData(error ? null : (data as Record<string, any> | null));
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    // [WL-70] 네트워크 장애·타임아웃 — 미들웨어 크래시 방지, null 반환 → /not-found 리다이렉트
    // 에러 캐싱 없음: 다음 요청에서 DB 재시도 허용
    console.error(`[Proxy] resolvePartnerBySubdomain failed (subdomain=${subdomain}):`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

/** custom_domain 기반 파트너 조회 (캐시 적용) */
async function resolvePartnerByCustomDomain(domain: string): Promise<PartnerLocaleData | null> {
  const cacheKey = `custom_domain:${domain}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  const supabase = getSupabaseClient();
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('partners')
        .select(PARTNER_SELECT)
        .eq('custom_domain', domain)
        .eq('custom_domain_status', 'active')
        .eq('is_active', true)
        .maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS
    );
    if (error) console.error(`[Proxy] Supabase error (custom_domain=${domain}):`, error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = parsePartnerLocaleData(error ? null : (data as Record<string, any> | null));
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    // [WL-70] 네트워크 장애·타임아웃 — 미들웨어 크래시 방지, null 반환 → /not-found 리다이렉트
    // 에러 캐싱 없음: 다음 요청에서 DB 재시도 허용
    console.error(`[Proxy] resolvePartnerByCustomDomain failed (custom_domain=${domain}):`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function resolvePartnerFromHost(host: string): Promise<PartnerLocaleData | null> {
  const cleanHost = host.split(':')[0];

  // 1. *.localhost 서브도메인 (로컬 개발)
  const localhostSubdomain = extractLocalhostSubdomain(host);
  if (localhostSubdomain) {
    return resolvePartnerBySubdomain(localhostSubdomain);
  }

  // 2. *.opsnow.com 서브도메인 (프로덕션 및 dev- 접두어 개발 환경)
  if (cleanHost.endsWith(`.${BASE_DOMAIN}`)) {
    const rawSubdomain = cleanHost.slice(0, -(`.${BASE_DOMAIN}`.length));
    const subdomain = rawSubdomain.startsWith('dev-')
      ? rawSubdomain.slice('dev-'.length)
      : rawSubdomain;
    return resolvePartnerBySubdomain(subdomain);
  }

  // 3. 커스텀 도메인 (custom_domain_status = 'active' 인 경우에만)
  return resolvePartnerByCustomDomain(cleanHost);
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

  // [WL-65] /not-found 경로는 파트너 라우팅 대상에서 제외 — redirect 루프 방지
  if (pathname.startsWith('/not-found')) {
    return NextResponse.next();
  }

  // 진단용 헬스체크 — 미들웨어 실행 확인 (임시, WL-46 완료 후 제거)
  if (pathname === '/__proxy_health') {
    return NextResponse.json({
      ok: true,
      host,
      env: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasDevSlug: !!process.env.DEV_PARTNER_SLUG,
    });
  }

  console.log(`[Proxy] host=${host} pathname=${pathname} vercelEnv=${process.env.VERCEL_ENV ?? 'none'}`);

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
      const partner = await resolvePartnerBySubdomain(devSlug);
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
    // 파트너 서브도메인에서 /not-found로 리다이렉트하면 미들웨어가 재실행되어
    // 루프가 발생한다. 베이스 호스트(localhost:3000 또는 BASE_DOMAIN)로 리다이렉트.
    const notFoundBase = IS_DEV
      ? `http://localhost:${new URL(request.url).port || 3000}`
      : `https://${BASE_DOMAIN}`;
    return NextResponse.redirect(new URL('/not-found', notFoundBase));
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
  // [WL-68] images/ 경로 추가 — public/ 정적 파일을 미들웨어가 가로채면
  // 파트너 라우트로 rewrite되어 404가 발생하므로 명시적으로 제외
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|not-found|images/).*)'],
};
