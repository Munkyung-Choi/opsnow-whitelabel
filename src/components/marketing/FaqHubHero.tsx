import Link from 'next/link';
import type { Locale } from '@/lib/i18n/locales';
import type { FaqCategoryItem } from '@/lib/faq/get-faq-data';
import { getDictionary } from '@/lib/i18n/dictionary';

interface Props {
  partnerId: string;
  locale: Locale;
  categories: FaqCategoryItem[];
  activeCategory: string | null;
}

export default function FaqHubHero({ partnerId, locale, categories, activeCategory }: Props) {
  const t = getDictionary(locale).faq;

  const buildHref = (categoryId: string | null) => {
    const base = `/${partnerId}/${locale}/faq`;
    return categoryId ? `${base}?category=${categoryId}` : base;
  };

  return (
    <section className="bg-muted border-b">
      <div className="container mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/${partnerId}/${locale}`} className="hover:text-foreground transition-colors">
            {t.breadcrumbHome}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground font-medium">{t.breadcrumbFaq}</span>
        </nav>

        {/* Help Center label */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
          {t.helpCenter}
        </p>

        {/* Page title */}
        <h1 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl">
          {t.pageTitle}
        </h1>

        {/* Category tab strip */}
        {categories.length > 0 && (
          <div
            role="tablist"
            aria-label={t.allCategory}
            className="flex flex-wrap gap-2"
          >
            {/* "All" tab */}
            <Link
              href={buildHref(null)}
              role="tab"
              aria-selected={activeCategory === null}
              className={[
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                activeCategory === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input bg-background text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {t.allCategory}
            </Link>

            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={buildHref(cat.id)}
                role="tab"
                aria-selected={activeCategory === cat.id}
                className={[
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input bg-background text-foreground hover:bg-muted',
                ].join(' ')}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
