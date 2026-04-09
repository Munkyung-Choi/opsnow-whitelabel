import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import { validatePartner, type Partner } from '@/services/partnerService';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ContentRow = Database['public']['Tables']['contents']['Row'];
type GlobalContentRow = Database['public']['Tables']['global_contents']['Row'];

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

export interface FeaturesContent {
  title: string | null;
  subtitle: string | null;
  cards: FeatureCard[];
}

export interface FooterContactInfo {
  email?: string;
  phone?: string;
  address?: string;
}

export interface PartnerPageData {
  partner: Partner;
  hero: ContentRow | null;
  about: ContentRow | null;
  footer: ContentRow | null;
  terms: ContentRow | null;
  privacy: ContentRow | null;
  features: FeaturesContent | null;
}

function parseFooterContactInfo(contactInfo: Json | null): FooterContactInfo {
  if (!contactInfo || typeof contactInfo !== 'object' || Array.isArray(contactInfo)) return {};
  const obj = contactInfo as Record<string, Json>;
  return {
    email: typeof obj.email === 'string' ? obj.email : undefined,
    phone: typeof obj.phone === 'string' ? obj.phone : undefined,
    address: typeof obj.address === 'string' ? obj.address : undefined,
  };
}

function parseFeaturesContent(row: GlobalContentRow | null): FeaturesContent | null {
  if (!row) return null;

  const meta = row.meta;
  let cards: FeatureCard[] = [];

  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const rawCards = (meta as Record<string, Json>)['cards'];
    if (Array.isArray(rawCards)) {
      cards = rawCards.flatMap((card) => {
        if (!card || typeof card !== 'object' || Array.isArray(card)) return [];
        const c = card as Record<string, Json>;
        if (typeof c.icon !== 'string' || typeof c.title !== 'string' || typeof c.description !== 'string') return [];
        return [{ icon: c.icon, title: c.title, description: c.description }];
      });
    }
  }

  return { title: row.title, subtitle: row.subtitle, cards };
}

export const getPartnerPageData = cache(async (partnerId: string): Promise<PartnerPageData | null> => {
  const [partner, contentsResult, featuresResult] = await Promise.all([
    validatePartner(partnerId),
    supabase
      .from('contents')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('is_published', true),
    supabase
      .from('global_contents')
      .select('*')
      .eq('section_type', 'features')
      .maybeSingle(),
  ]);

  if (!partner) return null;

  const contents = contentsResult.data ?? [];
  const bySection = (type: string): ContentRow | null =>
    contents.find((c) => c.section_type === type) ?? null;

  return {
    partner,
    hero: bySection('hero'),
    about: bySection('about'),
    footer: bySection('footer'),
    terms: bySection('terms'),
    privacy: bySection('privacy'),
    features: parseFeaturesContent(featuresResult.data),
  };
});

export { parseFooterContactInfo };
