import type { Json } from '@/types/supabase';

// WL-94: HeroSection heroStats DB 이관
// DB 구조: contents.body_json = [{ value, label }, ...]
// 빈 배열 반환 → 호출부(HeroSection)가 dictionary heroStats로 폴백

export interface MiniStatItem {
  value: string;
  label: string;
}

export function parseMiniStats(bodyJson: Json | null): MiniStatItem[] {
  if (!Array.isArray(bodyJson)) return [];
  return bodyJson.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const s = item as Record<string, Json>;
    if (typeof s.value !== 'string' || typeof s.label !== 'string') return [];
    return [{ value: s.value, label: s.label }];
  });
}
