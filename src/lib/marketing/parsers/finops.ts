import type { Json } from '@/types/supabase';

export interface FinOpsFeature {
  title: string;
  subtitle: string;
  description: string;
}

export function parseFinOpsFeatures(meta: Json | null): FinOpsFeature[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const features = (meta as Record<string, Json>)['features'];
  if (!Array.isArray(features)) return [];
  return features.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const f = item as Record<string, Json>;
    if (
      typeof f.title !== 'string' ||
      typeof f.subtitle !== 'string' ||
      typeof f.description !== 'string'
    ) return [];
    return [{ title: f.title, subtitle: f.subtitle, description: f.description }];
  });
}
