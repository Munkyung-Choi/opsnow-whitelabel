import { Mail, Phone, MapPin } from 'lucide-react';
import type { Partner } from '@/services/partnerService';
import type { Database } from '@/types/supabase';
import { parseFooterContactInfo } from '@/lib/marketing/get-partner-page-data';

type ContentRow = Database['public']['Tables']['contents']['Row'];

interface FooterProps {
  partner: Partner;
  content: ContentRow | null;
}

export default function Footer({ partner, content }: FooterProps) {
  const contactInfo = parseFooterContactInfo(content?.contact_info ?? null);
  const year = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* 브랜드 */}
          <div>
            <p className="text-lg font-bold">{partner.business_name}</p>
            <p className="mt-2 text-sm text-background/60">
              OpsNow 파트너가 제공하는 클라우드 최적화 서비스
            </p>
          </div>

          {/* 연락처 */}
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-background/60">
              연락처
            </p>
            <ul className="flex flex-col gap-2">
              {contactInfo.email && (
                <li className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-background/60" aria-hidden="true" />
                  <a href={`mailto:${contactInfo.email}`} className="hover:underline">
                    {contactInfo.email}
                  </a>
                </li>
              )}
              {contactInfo.phone && (
                <li className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 shrink-0 text-background/60" aria-hidden="true" />
                  <a href={`tel:${contactInfo.phone}`} className="hover:underline">
                    {contactInfo.phone}
                  </a>
                </li>
              )}
              {contactInfo.address && (
                <li className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-background/60" aria-hidden="true" />
                  <span>{contactInfo.address}</span>
                </li>
              )}
            </ul>
          </div>

          {/* 법적 링크 */}
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-background/60">
              법적 고지
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <a href="terms" className="hover:underline">
                  이용약관
                </a>
              </li>
              <li>
                <a href="privacy" className="hover:underline">
                  개인정보 처리방침
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-background/10 pt-6 text-center text-xs text-background/40">
          © {year} {partner.business_name}. All rights reserved. Powered by OpsNow.
        </div>
      </div>
    </footer>
  );
}
