import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { validateLocale } from '@/proxy';
import { getPartnerPageData } from '@/lib/marketing/get-partner-page-data';
import { getFaqHub } from '@/lib/faq/get-faq-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import GlobalNav from '@/components/marketing/GlobalNav';
import Footer from '@/components/marketing/Footer';
import FaqHubHero from '@/components/marketing/FaqHubHero';
import FaqItemCard from '@/components/marketing/FaqItemCard';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ partnerId: string; locale: string }>;
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = validateLocale(rawLocale);
  const t = getDictionary(locale).faq;
  return { title: t.pageTitle };
}

export default async function FaqHubPage({ params, searchParams }: PageProps) {
  const { partnerId, locale: rawLocale } = await params;
  const { category } = await searchParams;
  const locale = validateLocale(rawLocale);

  const [data, faqHub] = await Promise.all([
    getPartnerPageData(partnerId, locale),
    getFaqHub(locale),
  ]);

  if (!data) notFound();

  const t = getDictionary(locale).faq;

  const categories = faqHub?.categories ?? [];
  const allItems = faqHub?.items ?? [];

  const activeCategory = category && categories.some((c) => c.id === category)
    ? category
    : null;

  const filteredItems = activeCategory
    ? allItems.filter((item) => item.categoryId === activeCategory)
    : allItems;

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <>
      <GlobalNav partner={data.partner} locale={locale} />
      <main>
        <FaqHubHero
          locale={locale}
          categories={categories}
          activeCategory={activeCategory}
        />

        <section className="container mx-auto max-w-5xl px-4 py-10 sm:py-14">
          {filteredItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">{t.noResults}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {filteredItems.map((item) => (
                <li key={item.id}>
                  <FaqItemCard
                    item={item}
                    category={categoryMap[item.categoryId] ?? null}
                    locale={locale}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bottom CTA */}
        <section className="border-t bg-muted">
          <div className="container mx-auto max-w-5xl px-4 py-12 text-center">
            <p className="text-lg font-semibold">{t.ctaTitle}</p>
            <p className="mt-1 text-muted-foreground">{t.ctaSubtitle}</p>
            <a
              href={`/${locale}#contact`}
              className="mt-6 inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {getDictionary(locale).nav.contact}
            </a>
          </div>
        </section>
      </main>
      <Footer partner={data.partner} content={data.footer} locale={locale} />
    </>
  );
}
