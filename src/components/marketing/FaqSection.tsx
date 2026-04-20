'use client';

import { useState, memo } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { parseFaqContent, FAQ_CATEGORIES, type FaqCategory } from '@/lib/faq/faq-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/locales';
import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';

interface Props {
  content: LocalizedGlobalContentRow | null;
  locale: Locale;
}

const MAX_VISIBLE = 5;

// React.memo: 'use client' Client Component이므로 memo가 유효합니다.
const FaqSection = memo(function FaqSection({ content, locale }: Props) {
  const t = getDictionary(locale).faq;
  const [activeCategory, setActiveCategory] = useState<FaqCategory | '전체'>('전체');

  const title = content?.title ?? t.sectionTitle;
  const subtitle = content?.subtitle ?? t.sectionSubtitle;
  const allItems = parseFaqContent(content);

  const filtered =
    activeCategory === '전체'
      ? allItems.slice(0, MAX_VISIBLE)
      : allItems.filter((f) => f.category === activeCategory).slice(0, MAX_VISIBLE);

  // /{locale}/faq — 전체 FAQ 페이지 (WL-96 완료 후 활성화)
  const faqBase = `/${locale}/faq`;

  return (
    <section id="faq" className="scroll-mt-16 bg-background px-4 section-py sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-3">

          {/* ── Left: 헤더 + 카테고리 필터 ─────────────────── */}
          <div className="lg:col-span-1">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="mb-4 text-[clamp(1.75rem,2.5vw,2rem)] font-bold tracking-[-0.02em] leading-[1.3] text-foreground">
              {title}
            </h2>
            <p className="mb-8 text-[0.9375rem] leading-[1.7] text-muted-foreground">
              {subtitle}
            </p>

            {/* 카테고리 필터 칩 */}
            <div className="mb-5 flex flex-wrap gap-2">
              {(['전체', ...FAQ_CATEGORIES] as const).map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'inline-flex cursor-pointer items-center rounded-md border px-2.5 py-1 text-[0.75rem] transition-colors',
                      isActive
                        ? 'border-primary bg-primary font-semibold text-primary-foreground'
                        : 'border-border bg-transparent font-medium text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* 전체 FAQ 페이지 링크 (WL-96 구현 완료 후 faqBase가 생성됨) */}
            {faqBase && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link href={faqBase}>
                  모든 FAQ 보기
                  <ChevronRight size={14} strokeWidth={2} />
                </Link>
              </Button>
            )}
          </div>

          {/* ── Right: 아코디언 ──────────────────────────────── */}
          <div className="lg:col-span-2">
            {filtered.length === 0 ? (
              <p className="text-[0.9rem] text-muted-foreground">
                해당 카테고리의 질문이 없습니다.
              </p>
            ) : (
              <Accordion type="single" collapsible defaultValue={filtered[0]?.id}>
                {filtered.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="py-5 text-left hover:no-underline">
                      {/* 카테고리 배지 + 질문 텍스트 */}
                      <span className="flex flex-1 items-center gap-2.5 pr-4">
                        <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-[0.04em] text-muted-foreground">
                          {faq.category}
                        </span>
                        <span className="text-[0.9375rem] font-semibold tracking-[-0.01em] leading-[1.45] text-foreground">
                          {faq.question}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pb-2">
                        <p className="mb-3 text-[0.9375rem] leading-[1.75] text-muted-foreground">
                          {faq.summary}
                        </p>
                        {/* 자세히 보기 → 개별 FAQ 상세 페이지 (WL-96) */}
                        {faqBase && (
                          <Link
                            href={`${faqBase}/${faq.id}`}
                            className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-primary hover:underline"
                          >
                            자세히 보기
                            <ChevronRight size={13} strokeWidth={2} />
                          </Link>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>

        </div>
      </div>
    </section>
  );
});

export default FaqSection;
