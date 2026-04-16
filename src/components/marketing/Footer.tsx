import Image from 'next/image';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import type { Partner } from '@/services/partnerService';
import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import { parseFooterContactInfo } from '@/lib/marketing/parsers';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/proxy';
import CorporateInfo from '@/components/marketing/FooterSection';

interface FooterProps {
  partner: Partner;
  content: LocalizedContentRow | null;
  locale: Locale;
}

/** SVG는 Next.js 최적화 우회 */
function isSvgUrl(url: string) {
  return url.toLowerCase().endsWith('.svg');
}

// ── Zero-dependency SNS icon mapper (Simple Icons SVG, MIT) ──────────────────
// lucide-react에 브랜드 아이콘이 없으므로 필요한 플랫폼만 인라인 SVG로 관리.
// 새 플랫폼 추가 시 이 파일의 SOCIAL_ICON_MAP에만 SVG 추가하면 됨.

type SvgIconProps = { className?: string };

function LinkedinIcon({ className }: SvgIconProps) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YoutubeIcon({ className }: SvgIconProps) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function InstagramIcon({ className }: SvgIconProps) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12c0 3.259.014 3.668.072 4.948.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24c3.259 0 3.668-.014 4.948-.072 1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.689.072-4.948 0-3.259-.014-3.667-.072-4.947-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.755-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

const SOCIAL_ICON_MAP: Record<string, ComponentType<SvgIconProps>> = {
  linkedin:  LinkedinIcon,
  youtube:   YoutubeIcon,
  instagram: InstagramIcon,
};

/** platform 키 → 인라인 SVG, 미등록 플랫폼은 Globe 폴백 */
function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = SOCIAL_ICON_MAP[platform.toLowerCase()];
  if (Icon) return <Icon className={className} />;
  return <Globe aria-hidden="true" className={className} />;
}

export default function Footer({ partner, content, locale }: FooterProps) {
  const t = getDictionary(locale).footer;
  const contactInfo = parseFooterContactInfo(content?.contact_info ?? null);
  const year = new Date().getFullYear();

  // legal 링크 — partner.id 기반 절대 경로 (GlobalNav 패턴과 동일)
  const legalBase = `/${partner.id}/${locale}`;

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

          {/* 브랜드 + 로고 */}
          <div>
            {partner.logo_url ? (
              /* FIXED: brightness(0)+invert(1) — 실루엣 추출 후 흰색 반전.
                 ⚠️  PNG/SVG 투명 배경 로고 전용.
                 JPEG처럼 불투명 흰 배경 이미지는 반전 시 배경이 검게 나와 로고가 가려짐.
                 TODO(WL-어드민 로고 업로드): 파일 확장자 또는 alpha 채널 존재 여부를
                 서버에서 검증하고, JPEG 업로드 시 "PNG 또는 SVG를 사용하세요" 경고 노출. */
              <Image
                src={partner.logo_url}
                alt={`${partner.business_name} 로고`}
                width={120}
                height={28}
                className="mb-3 h-7 w-auto object-contain brightness-0 invert"
                unoptimized={isSvgUrl(partner.logo_url)}
              />
            ) : (
              <p className="mb-3 text-lg font-bold">{partner.business_name}</p>
            )}
            <p className="text-sm text-background/60">{t.tagline}</p>

            {/* SNS 링크 — Zero-dep SVG mapper (LinkedIn/YouTube/Instagram + Globe 폴백) */}
            {contactInfo.socials && contactInfo.socials.length > 0 && (
              <ul className="mt-4 flex gap-3" aria-label="SNS">
                {contactInfo.socials.map(({ platform, url }) => (
                  <li key={platform}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={platform}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-background/20 text-background/60 transition-colors hover:border-background/60 hover:text-background"
                    >
                      <SocialIcon platform={platform} className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 연락처 */}
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-background/60">
              {t.contact}
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
              {t.legal}
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <Link href={`${legalBase}/terms`} className="hover:underline">
                  {t.terms}
                </Link>
              </li>
              <li>
                <Link href={`${legalBase}/privacy`} className="hover:underline">
                  {t.privacy}
                </Link>
              </li>
              <li>
                <Link href={`${legalBase}/cookie-policy`} className="hover:underline">
                  {t.cookies}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 copyright + 사업자 정보 */}
        <div className="mt-10 border-t border-background/10 pt-6 space-y-1 text-center text-xs">
          {contactInfo.corporate && (
            <CorporateInfo corporate={contactInfo.corporate} locale={locale} />
          )}
          <p className="text-background/40">
            © {year} {partner.business_name}. All rights reserved. Powered by OpsNow.
          </p>
        </div>
      </div>
    </footer>
  );
}
