import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Locale } from '@/lib/i18n/locales';
import type { FaqListItem, FaqCategoryItem } from '@/lib/faq/get-faq-data';

interface Props {
  item: FaqListItem;
  category: FaqCategoryItem | null;
  locale: Locale;
}

export default function FaqItemCard({ item, category, locale }: Props) {
  return (
    <Link
      href={`/${locale}/faq/${item.slug}`}
      data-testid="faq-card"
      className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-background px-5 py-4 transition-all hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="min-w-0 flex-1">
        {category && (
          <div className="mb-1.5">
            <Badge variant="secondary" className="shrink-0 text-[0.6875rem]">
              {category.label}
            </Badge>
          </div>
        )}
        <p
          className="mb-1 font-semibold leading-[1.45] tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary"
          style={{ fontSize: '0.9375rem' }}
        >
          {item.question}
        </p>
        {item.summary && (
          <p className="line-clamp-2 text-muted-foreground" style={{ fontSize: '0.8125rem', lineHeight: 1.65 }}>
            {item.summary}
          </p>
        )}
      </div>
      <ChevronRight
        aria-hidden="true"
        size={16}
        strokeWidth={2}
        className="mt-1 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
      />
    </Link>
  );
}
