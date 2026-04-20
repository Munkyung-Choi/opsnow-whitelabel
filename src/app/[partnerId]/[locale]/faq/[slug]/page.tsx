import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, ChevronLeft } from 'lucide-react';
import { validateLocale } from '@/proxy';
import { getPartnerPageData } from '@/lib/marketing/get-partner-page-data';
import { getFaqDetailBySlug } from '@/lib/faq/get-faq-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlobalNav from '@/components/marketing/GlobalNav';
import Footer from '@/components/marketing/Footer';
import FaqDetailContent from '@/components/marketing/FaqDetailContent';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ partnerId: string; locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = validateLocale(rawLocale);
  const detail = await getFaqDetailBySlug(slug, locale);
  if (!detail) return {};

  return {
    title: detail.seoTitle,
    description: detail.seoDescription,
    alternates: {
      canonical: `/${locale}/faq/${slug}`,
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

      {/* sticky-footer layout: min-h-screen + flex-col */}
      <div className="flex min-h-screen flex-col">
        <GlobalNav partner={data.partner} locale={locale} />

        <main className="flex-1">
          {/* ── Hero — same style as FAQ Hub ─────────────────────────── */}
          <section className="border-b bg-muted">
            <div className="container mx-auto max-w-5xl px-4 py-10 sm:py-14">

              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                {t.helpCenter}
              </p>

              <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
                {t.pageTitle}
              </h2>

              {/* Search — plain GET form: submits to /locale/faq?q= */}
              <form action={`/${locale}/faq`} method="GET" className="flex max-w-2xl gap-2">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    strokeWidth={1.8}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    name="q"
                    placeholder={t.searchPlaceholder}
                    className="h-11 bg-background pl-10"
                  />
                </div>
                <Button type="submit" className="h-11 shrink-0 px-5">
                  {t.searchBtn}
                </Button>
              </form>
            </div>
          </section>

          {/* ── Content: Breadcrumb → Question → Answer ──────────────── */}
          <section className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">

            {/* Breadcrumb */}
            <nav
              aria-label="breadcrumb"
              className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Link href={`/${locale}`} className="transition-colors hover:text-foreground">
                {t.breadcrumbHome}
              </Link>
              <span aria-hidden="true">/</span>
              <Link
                href={`/${locale}/faq`}
                className="transition-colors hover:text-foreground"
              >
                {t.breadcrumbFaq}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="truncate font-medium text-foreground">{item.question}</span>
            </nav>

            {/* Category badge */}
            {category && (
              <Badge variant="secondary" className="mb-3">
                {category.label}
              </Badge>
            )}

            {/* Question */}
            <h1 className="mb-8 text-2xl font-bold leading-tight sm:text-3xl">
              {item.question}
            </h1>

            {/* Answer */}
            <FaqDetailContent answer={item.answer} />

            {/* Back link */}
            <div className="mt-12 border-t pt-8">
              <Link
                href={`/${locale}/faq`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                {t.backToFaq}
              </Link>
            </div>
          </section>
        </main>

        <Footer partner={data.partner} content={data.footer} locale={locale} />
      </div>
    </>
  );
}
