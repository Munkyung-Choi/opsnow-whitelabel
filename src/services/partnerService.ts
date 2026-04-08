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

  const { data } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .maybeSingle();

  return data ?? null;
});
