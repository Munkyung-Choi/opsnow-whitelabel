// @module-purpose: 마케팅 사이트 파트너 조회 전용 (anon key + RLS, 읽기 전용).
// Admin 쓰기 연산에 이 모듈을 사용하지 말 것 — src/app/admin/partners/actions.ts 참조.
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// anon key 사용: partners_public_anon_read RLS 정책 준수
// 해당 정책이 is_active = true 파트너만 반환하도록 강제함
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type Partner = Database['public']['Tables']['partners']['Row'];

/**
 * partnerId의 유효성을 검증하고 파트너 데이터를 반환한다.
 * React.cache로 래핑되어 단일 요청 내 중복 DB 호출을 방지한다.
 *
 * @returns 활성 파트너 객체 또는 null (비UUID 형식 / 미존재 / 비활성)
 */
export const validatePartner = cache(async (partnerId: string): Promise<Partner | null> => {
  // UUID 형식이 아닌 요청은 DB 조회 없이 즉시 차단
  if (!UUID_REGEX.test(partnerId)) return null;

  try {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .maybeSingle();

    if (error) {
      console.error('[validatePartner] Supabase error:', error.message);
      return null;
    }
    return data ?? null;
  } catch (err) {
    // Supabase 네트워크 장애 시 앱 크래시 방지 — graceful 404로 처리됨
    console.error('[validatePartner] Network error:', err);
    return null;
  }
});
