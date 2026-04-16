import { NextRequest, NextResponse } from 'next/server';
import { validateLocale } from '@/proxy';

/**
 * GET /api/set-locale?locale=en
 *
 * NEXT_LOCALE 쿠키를 서버사이드 Set-Cookie 헤더로 설정하고 루트(/)로 리다이렉트.
 * 미들웨어는 /api/* 경로를 매처에서 제외하므로 이 라우트는 proxy를 거치지 않음.
 * 리다이렉트 후 루트 요청이 미들웨어를 통과하며 쿠키 기반 locale을 감지함.
 */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'ko';
  const validLocale = validateLocale(locale);

  // returnTo: 언어 전환 후 돌아갈 경로. 반드시 /로 시작해야 함 (open-redirect 방지)
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/';
  const safePath = returnTo.startsWith('/') ? returnTo : '/';

  // request.url은 내부 서버 주소(localhost:3000)를 반환할 수 있으므로
  // Host 헤더에서 브라우저가 보낸 실제 호스트(e.g. partner-a.localhost:3000)를 사용
  const host = request.headers.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') || host.includes('.localhost') ? 'http' : 'https';
  const response = NextResponse.redirect(`${protocol}://${host}${safePath}`);
  response.cookies.set('NEXT_LOCALE', validLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1년
    sameSite: 'lax',
  });
  return response;
}
