import type { Json } from '@/types/supabase';

export interface RoleItem {
  role: string;
  title: string;
  description: string;
  metrics: string[];
}

export function parseRoles(meta: Json | null): RoleItem[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const roles = (meta as Record<string, Json>)['roles'];
  if (!Array.isArray(roles)) return [];
  return roles.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const r = item as Record<string, Json>;
    if (
      typeof r.role !== 'string' ||
      typeof r.title !== 'string' ||
      typeof r.description !== 'string'
    ) return [];
    const metrics = Array.isArray(r.metrics)
      ? r.metrics.flatMap((m) => (typeof m === 'string' ? [m] : []))
      : [];
    return [{ role: r.role, title: r.title, description: r.description, metrics }];
  });
}
