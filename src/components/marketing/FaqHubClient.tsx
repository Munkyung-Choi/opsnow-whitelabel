'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, ArrowRight, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getDictionary } from '@/lib/i18n/dictionary';
import FaqItemCard from '@/components/marketing/FaqItemCard';
import type { Locale } from '@/lib/i18n/locales';
import type { FaqCategoryItem, FaqListItem } from '@/lib/faq/get-faq-data';

const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;

function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

interface Props {
  locale: Locale;
  categories: FaqCategoryItem[];
  items: FaqListItem[];
  initialCategory: string | null;
  initialQuery?: string;
}

export default function FaqHubClient({
  locale,
  categories,
  items,
  initialCategory,
  initialQuery = '',
}: Props) {
  const dict = getDictionary(locale);
  const t = dict.faq;

  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const handleCategoryChange = (categoryId: string | null) => {
    setActiveCategory(categoryId);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(Number(val));
    setCurrentPage(1);
  };

  const isSearching = submitted.trim().length > 0;

  const searchResults = useMemo(() => {
    const q = submitted.toLowerCase();
    return items.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q),
    );
  }, [submitted, items]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setQuery('');
    setSubmitted('');
    setCurrentPage(1);
  };

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!activeCategory) return items;
    return items.filter((item) => item.categoryId === activeCategory);
  }, [items, activeCategory]);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredItems, currentPage, pageSize],
  );
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="border-b bg-muted">
        <div className="container mx-auto max-w-5xl px-4 py-10 sm:py-14">

          {/* Breadcrumb */}
          <nav
            aria-label="breadcrumb"
            className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Link href={`/${locale}`} className="transition-colors hover:text-foreground">
              {t.breadcrumbHome}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-foreground">{t.breadcrumbFaq}</span>
          </nav>

          {/* HELP CENTER label */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            {t.helpCenter}
          </p>

          {/* Page heading */}
          <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
            {t.pageTitle}
          </h1>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="mb-8 flex max-w-2xl gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value) clearSearch();
                }}
                placeholder={t.searchPlaceholder}
                className="h-11 bg-background pl-10"
              />
            </div>
            <Button type="submit" className="h-11 shrink-0 px-5">
              {t.searchBtn}
            </Button>
          </form>

          {/* Category pill tabs */}
          {categories.length > 0 && (
            <div
              role="tablist"
              aria-label={t.allCategory}
              className="flex flex-wrap gap-2 overflow-x-auto pb-1"
            >
              <button
                role="tab"
                aria-selected={activeCategory === null}
                onClick={() => handleCategoryChange(null)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                  activeCategory === null
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-foreground hover:bg-muted hover:border-primary/30',
                )}
              >
                {t.allCategory}
                <span className="ml-1.5 text-xs opacity-70">{items.length}</span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={activeCategory === cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                    activeCategory === cat.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-foreground hover:bg-muted hover:border-primary/30',
                  )}
                >
                  {cat.label}
                  <span className="ml-1.5 text-xs opacity-70">
                    {categoryCounts[cat.id] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="bg-background">
        <div className="container mx-auto max-w-5xl px-4 py-8">

          {/* ── Search results view ───────────────────────────────────── */}
          {isSearching ? (
            <div>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">&quot;{submitted}&quot;</span>{' '}
                  {t.searchResults} — {searchResults.length}{t.searchResultsUnit}
                </p>
                <button
                  onClick={clearSearch}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t.clearSearch}
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <p className="text-base">{t.noSearchResults}</p>
                  <p className="mt-1 text-sm">{t.noSearchResultsHint}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {searchResults.map((item) => (
                    <FaqItemCard
                      key={item.id}
                      item={item}
                      category={categoryMap[item.categoryId] ?? null}
                      locale={locale}
                    />
                  ))}
                </div>
              )}
            </div>

          ) : (
            /* ── Paginated list view ──────────────────────────────────── */
            <div>
              {/* List header: count + page-size selector */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {totalItems > 0 ? (
                    <>
                      <span className="font-semibold text-foreground">
                        {startItem}–{endItem}
                      </span>
                      {' / '}총 {totalItems}개
                    </>
                  ) : (
                    '결과 없음'
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t.itemsPerPage}</span>
                  <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="h-8 w-[72px] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)} className="text-sm">
                          {n}개
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* FAQ card list */}
              {paginatedItems.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <p className="text-base">{t.noResults}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {paginatedItems.map((item) => (
                    <FaqItemCard
                      key={item.id}
                      item={item}
                      category={categoryMap[item.categoryId] ?? null}
                      locale={locale}
                    />
                  ))}
                </div>
              )}

              {/* ── Pagination ────────────────────────────────────────── */}
              {totalPages > 1 && (
                <div className="mt-8">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p - 1)}
                      disabled={currentPage === 1}
                      className="h-9 gap-1 px-3"
                    >
                      <ChevronLeft size={14} aria-hidden="true" />
                      <span>{t.paginationPrev}</span>
                    </Button>

                    {pageNumbers.map((page, idx) =>
                      page === 'ellipsis' ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground"
                        >
                          …
                        </span>
                      ) : (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          aria-current={page === currentPage ? 'page' : undefined}
                          className="h-9 w-9 p-0 text-sm"
                        >
                          {page}
                        </Button>
                      ),
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage === totalPages}
                      className="h-9 gap-1 px-3"
                    >
                      <span>{t.paginationNext}</span>
                      <ChevronRight size={14} aria-hidden="true" />
                    </Button>
                  </div>

                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {currentPage} / {totalPages} {t.pageLabel}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Bottom CTA ────────────────────────────────────────────── */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-muted/30 p-6 sm:flex-row">
            <div>
              <p className="font-semibold text-foreground">{t.ctaTitle}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t.ctaSubtitle}</p>
            </div>
            <Button asChild className="shrink-0 gap-2">
              <Link href={`/${locale}#contact`}>
                {dict.nav.contact}
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
