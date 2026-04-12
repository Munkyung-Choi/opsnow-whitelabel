import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { validateLocale } from '@/proxy';
import { getPartnerPageData } from '@/lib/marketing/get-partner-page-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import GlobalNav from '@/components/marketing/GlobalNav';
import Footer from '@/components/marketing/Footer';

interface PageProps {
  params: Promise<{ partnerId: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { partnerId, locale: rawLocale } = await params;
  const locale = validateLocale(rawLocale);
  const data = await getPartnerPageData(partnerId, locale);
  if (!data) return {};
  const defaultTitle = getDictionary(locale).termsPage.defaultTitle;
  return { title: data.terms?.title ?? defaultTitle };
}

export default async function TermsPage({ params }: PageProps) {
  const { partnerId, locale: rawLocale } = await params;
  const locale = validateLocale(rawLocale);
  const data = await getPartnerPageData(partnerId, locale);

  if (!data) notFound();

  const { partner, terms, footer } = data;
  const t = getDictionary(locale).termsPage;

  return (
    <>
      <GlobalNav partner={partner} locale={locale} />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {terms?.title && (
          <h1 className="mb-8 text-3xl font-bold text-foreground">{terms.title}</h1>
        )}
        {terms?.body ? (
          <div className="prose prose-sm max-w-none text-muted-foreground">
            {terms.body.split('\n').map((line, i) => (
              <p key={i} className="mb-3 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{t.comingSoon}</p>
        )}
      </main>
      <Footer partner={partner} content={footer} locale={locale} />
    </>
  );
}
