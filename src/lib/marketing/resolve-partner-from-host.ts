// DEBT-006: proxy.ts(Edge)와 동일한 서브도메인 파싱 로직 — Node.js Server Action 전용 복사본.
// 런타임 격리(Edge vs Node.js)로 공유 불가. proxy.ts 파싱 규칙 변경 시 이 파일도 동기 수정 필요.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'opsnow.com';
const LOCAL_TLD_RE = /^(.+)\.(localhost|opsnow\.test)$/;

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function resolveBySubdomain(subdomain: string): Promise<string | null> {
  const { data } = await supabase
    .from('partners')
    .select('id')
    .eq('subdomain', subdomain)
    .eq('is_active', true)
    .single();
  return data?.id ?? null;
}

async function resolveByCustomDomain(domain: string): Promise<string | null> {
  const { data } = await supabase
    .from('partners')
    .select('id')
    .eq('custom_domain', domain)
    .eq('custom_domain_status', 'active')
    .eq('is_active', true)
    .single();
  return data?.id ?? null;
}

/**
 * Node.js Server Action용 host → partner_id 해결.
 * 해결 우선순위는 proxy.ts와 동일하다:
 *   1. plain localhost / *.vercel.app → DEV_PARTNER_SLUG 환경변수
 *   2. *.localhost / *.opsnow.test → 서브도메인 추출
 *   3. *.opsnow.com (dev- 접두어 포함) → 서브도메인 추출
 *   4. 그 외 → custom_domain 조회
 */
export async function resolvePartnerIdFromHost(host: string): Promise<string | null> {
  const cleanHost = host.split(':')[0];

  // 1. 개발/프리뷰 환경 폴백
  if (cleanHost === 'localhost' || cleanHost.endsWith('.vercel.app')) {
    const devSlug = process.env.DEV_PARTNER_SLUG;
    if (devSlug) return resolveBySubdomain(devSlug);
    return null;
  }

  // 2. *.localhost / *.opsnow.test (Acrylic DNS 로컬 환경)
  const localMatch = cleanHost.match(LOCAL_TLD_RE);
  if (localMatch) return resolveBySubdomain(localMatch[1]);

  // 3. *.opsnow.com (프로덕션 / dev- 접두어)
  if (cleanHost.endsWith(`.${BASE_DOMAIN}`)) {
    const raw = cleanHost.slice(0, -(`.${BASE_DOMAIN}`.length));
    const subdomain = raw.startsWith('dev-') ? raw.slice('dev-'.length) : raw;
    return resolveBySubdomain(subdomain);
  }

  // 4. 커스텀 도메인
  return resolveByCustomDomain(cleanHost);
}
