import type { Json } from '@/types/supabase';

// WL-81: Schema-driven JSON 확장
// contact_info JSON 구조:
// {
//   "email": "...", "phone": "...", "address": "...",  ← 기존 (Contact 컬럼)
//   "corporate_info": {                                 ← WL-81 신규
//     "company_name": "...", "representative": "...", "registration_number": "..."
//   },
//   "social_links": [{ "platform": "linkedin", "url": "..." }]  ← WL-81 신규
// }

export interface FooterCorporateInfo {
  companyName: string;
  representative?: string;
  registrationNumber?: string;
}

export interface FooterSocialLink {
  platform: string;
  url: string;
}

export interface FooterContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  corporate?: FooterCorporateInfo;
  socials?: FooterSocialLink[];
}

export function parseFooterContactInfo(contactInfo: Json | null): FooterContactInfo {
  if (!contactInfo || typeof contactInfo !== 'object' || Array.isArray(contactInfo)) return {};
  const obj = contactInfo as Record<string, Json>;

  let corporate: FooterCorporateInfo | undefined;
  const ci = obj.corporate_info;
  if (ci && typeof ci === 'object' && !Array.isArray(ci)) {
    const c = ci as Record<string, Json>;
    const companyName = typeof c.company_name === 'string' ? c.company_name : undefined;
    if (companyName) {
      corporate = {
        companyName,
        representative: typeof c.representative === 'string' ? c.representative : undefined,
        registrationNumber: typeof c.registration_number === 'string' ? c.registration_number : undefined,
      };
    }
  }

  let socials: FooterSocialLink[] | undefined;
  const sl = obj.social_links;
  if (Array.isArray(sl)) {
    const parsed = sl.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const s = item as Record<string, Json>;
      if (typeof s.platform !== 'string' || typeof s.url !== 'string' || !s.url) return [];
      return [{ platform: s.platform, url: s.url }];
    });
    if (parsed.length > 0) socials = parsed;
  }

  return {
    email: typeof obj.email === 'string' ? obj.email : undefined,
    phone: typeof obj.phone === 'string' ? obj.phone : undefined,
    address: typeof obj.address === 'string' ? obj.address : undefined,
    corporate,
    socials,
  };
}
