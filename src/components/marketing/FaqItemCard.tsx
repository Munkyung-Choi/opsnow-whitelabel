import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Locale } from '@/lib/i18n/locales';
import type { FaqListItem, FaqCategoryItem } from '@/lib/faq/get-faq-data';
import { getDictionary } from '@/lib/i18n/dictionary';

interface Props {
  item: FaqListItem;
  category: FaqCategoryItem | null;
  locale: Locale;
}

export default function FaqItemCard({ item, category, locale }: Props) {
  const t = getDictionary(locale).faq;
  const href = `/${locale}/faq/${item.slug}`;

  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-4 rounded-xl border bg-background p-5 transition-shadow hover:shadow-md"
    >
      <div className="min-w-0 flex-1">
        {category && (
          <Badge variant="secondary" className="mb-2 text-xs">
            {category.label}
          </Badge>
        )}
        <p className="font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {item.question}
        </p>
        {item.updatedAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t.updatedAt}: {item.updatedAt}
          </p>
        )}
      </div>
      <ChevronRight
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}
