import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { validateLocale } from '@/proxy';
import { getPartnerPageData } from '@/lib/marketing/get-partner-page-data';
import { getFaqDetailBySlug } from '@/lib/faq/get-faq-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Badge } from '@/components/ui/badge';
import GlobalNav from '@/components/marketing/GlobalNav';
import Footer from '@/components/marketing/Footer';
import FaqDetailContent from '@/components/marketing/FaqDetailContent';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ partnerId: string; locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { partnerId, locale: rawLocale, slug } = await params;
  const locale = validateLocale(rawLocale);
  const detail = await getFaqDetailBySlug(slug, locale);
  if (!detail) return {};

  return {
    title: detail.seoTitle,
    description: detail.seoDescription,
    alternates: {
      canonical: `/${partnerId}/${locale}/faq/${slug}`,
    },
  };
}

export default async function FaqDetailPage({ params }: PageProps) {
  const { partnerId, locale: rawLocale, slug } = await params;
  const locale = validateLocale(rawLocale);

  const [data, detail] = await Promise.all([
    getPartnerPageData(partnerId, locale),
    getFaqDetailBySlug(slug, locale),
  ]);

  if (!data) notFound();
  if (!detail) notFound();

  const t = getDictionary(locale).faq;
  const { item, category, jsonLd } = detail;

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <GlobalNav partner={data.partner} locale={locale} />
      <main>
        {/* Hero / breadcrumb area */}
        <section className="bg-muted border-b">
          <div className="container mx-auto max-w-3xl px-4 py-10 sm:py-12">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Link href={`/${partnerId}/${locale}`} className="hover:text-foreground transition-colors">
                {t.breadcrumbHome}
              </Link>
              <span aria-hidden="true">/</span>
              <Link href={`/${partnerId}/${locale}/faq`} className="hover:text-foreground transition-colors">
                {t.breadcrumbFaq}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="truncate text-foreground font-medium">{item.question}</span>
            </nav>

            {category && (
              <Badge variant="secondary" className="mb-3">
                {category.label}
              </Badge>
            )}

            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
              {item.question}
            </h1>

            {item.updatedAt && (
              <p className="mt-3 text-sm text-muted-foreground">
                {t.updatedAt}: {item.updatedAt}
              </p>
            )}
          </div>
        </section>

        {/* Answer content */}
        <section className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <FaqDetailContent answer={item.answer} />

          {/* Back link */}
          <div className="mt-12 border-t pt-8">
            <Link
              href={`/${partnerId}/${locale}/faq`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              {t.backToFaq}
            </Link>
          </div>
        </section>
      </main>
      <Footer partner={data.partner} content={data.footer} locale={locale} />
    </>
  );
}
