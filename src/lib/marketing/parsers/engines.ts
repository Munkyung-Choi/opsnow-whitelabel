import type { Json } from '@/types/supabase';

export interface Engine {
  name: string;
  description: string;
  /** WL-95: Lucide 아이콘 이름 (IconRenderer에 전달). 없으면 정적 폴백 사용. */
  icon?: string;
}

export function parseEngines(meta: Json | null): Engine[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const engines = (meta as Record<string, Json>)['engines'];
  if (!Array.isArray(engines)) return [];
  return engines.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const e = item as Record<string, Json>;
    if (typeof e.name !== 'string' || typeof e.description !== 'string') return [];
    return [{
      name: e.name,
      description: e.description,
      icon: typeof e.icon === 'string' ? e.icon : undefined,
    }];
  });
}
