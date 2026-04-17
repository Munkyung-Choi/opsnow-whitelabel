import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import { validateLocale } from '@/proxy';
import { getPartnerPageData } from '@/lib/marketing/get-partner-page-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Dictionary } from '@/lib/i18n/dictionary';
import GlobalNav from '@/components/marketing/GlobalNav';
import Footer from '@/components/marketing/Footer';

/** 유효한 법적 문서 URL slug */
const VALID_LEGAL_TYPES = ['terms', 'privacy', 'cookie-policy'] as const;
type LegalType = (typeof VALID_LEGAL_TYPES)[number];

function isValidLegalType(value: string): value is LegalType {
  return (VALID_LEGAL_TYPES as readonly string[]).includes(value);
}

/** URL slug → DB section_type 명시적 매핑 (WL-111) */
const SLUG_TO_SECTION = {
  terms:           'terms',
  privacy:         'privacy',
  'cookie-policy': 'cookie_policy',
} as const satisfies Record<LegalType, 'terms' | 'privacy' | 'cookie_policy'>;

/** 타입별 i18n 키 매핑 (URL slug → dictionary key) */
const LEGAL_CONFIG: Record<LegalType, (t: Dictionary) => { defaultTitle: string; comingSoon: string }> = {
  terms: (t) => t.termsPage,
  privacy: (t) => t.privacyPage,
  'cookie-policy': (t) => t.cookiesPage,
};

interface PageProps {
  params: Promise<{ partnerId: string; locale: string; type: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { partnerId, locale: rawLocale, type } = await params;
  if (!isValidLegalType(type)) return {};

  const locale = validateLocale(rawLocale);
  const data = await getPartnerPageData(partnerId, locale);
  if (!data) return {};

  const t = getDictionary(locale);
  const config = LEGAL_CONFIG[type](t);

  const sectionKey = SLUG_TO_SECTION[type];
  const content = data[sectionKey];
  const pageTitle = content?.title ?? config.defaultTitle;
  return { title: `${data.partner.business_name} - ${pageTitle}` };
}

export default async function LegalPage({ params }: PageProps) {
  const { partnerId, locale: rawLocale, type } = await params;

  // 유효하지 않은 type → 404
  if (!isValidLegalType(type)) notFound();

  const locale = validateLocale(rawLocale);
  const data = await getPartnerPageData(partnerId, locale);
  if (!data) notFound();

  const { partner, footer } = data;
  const t = getDictionary(locale);
  const config = LEGAL_CONFIG[type](t);

  const sectionKey = SLUG_TO_SECTION[type];
  const content = data[sectionKey];

  return (
    <>
      <GlobalNav partner={partner} locale={locale} />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {content?.title && (
          <h1 className="mb-8 text-3xl font-bold text-foreground">{content.title}</h1>
        )}
        {content?.body ? (
          <div className="prose prose-sm max-w-none text-foreground/80 prose-headings:text-foreground prose-a:text-primary">
            <ReactMarkdown>{content.body}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-muted-foreground">{config.comingSoon}</p>
        )}
      </main>
      <Footer partner={partner} content={footer} locale={locale} />
    </>
  );
}
