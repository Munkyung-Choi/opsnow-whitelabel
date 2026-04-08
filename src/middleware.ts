import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const ADMIN_HOST = 'admin.opsnow.me';
const BASE_DOMAIN = 'opsnow.me';
const IS_DEV = process.env.NODE_ENV === 'development';

function createSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function isAdminHost(host: string): boolean {
  return host === ADMIN_HOST || host.startsWith('admin.');
}

function isLocalHost(host: string): boolean {
  const cleanHost = host.split(':')[0];
  return (
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === '::1'
  );
}

async function resolvePartnerIdFromHost(host: string): Promise<string | null> {
  const supabase = createSupabaseClient();
  const cleanHost = host.split(':')[0];

  // 서브도메인 패턴: {subdomain}.opsnow.me
  if (cleanHost.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = cleanHost.slice(0, -(`.${BASE_DOMAIN}`.length));
    const { data } = await supabase
      .from('partners')
      .select('id')
      .eq('subdomain', subdomain)
      .eq('is_active', true)
      .maybeSingle();
    return data?.id ?? null;
  }

  // 커스텀 도메인 (custom_domain_status = 'active' 인 경우에만)
  const { data } = await supabase
    .from('partners')
    .select('id')
    .eq('custom_domain', cleanHost)
    .eq('custom_domain_status', 'active')
    .eq('is_active', true)
    .maybeSingle();
  return data?.id ?? null;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const pathname = request.nextUrl.pathname;

  if (IS_DEV) {
    console.log(`[Middleware] host=${host} pathname=${pathname}`);
  }

  // 어드민 사이트: 파트너 라우팅 없이 통과
  if (isAdminHost(host)) {
    if (IS_DEV) console.log('[Middleware] → Admin passthrough');
    return NextResponse.next();
  }

  // 로컬 개발 환경: 통과
  // TODO: [partnerId] 라우트 구현 후 NEXT_PUBLIC_DEV_PARTNER_SLUG 기반 테스트 지원 추가
  if (isLocalHost(host)) {
    if (IS_DEV) console.log('[Middleware] → Localhost passthrough');
    return NextResponse.next();
  }

  const partnerId = await resolvePartnerIdFromHost(host);

  if (!partnerId) {
    if (IS_DEV) console.log(`[Middleware] → Partner not found for host: ${host}`);
    return NextResponse.redirect(new URL('/not-found', request.url));
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${partnerId}${pathname === '/' ? '' : pathname}`;

  if (IS_DEV) console.log(`[Middleware] → Rewriting to ${url.pathname}`);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
