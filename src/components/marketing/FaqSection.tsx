'use client';

import { memo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import type { Json } from '@/types/supabase';

interface FaqItem {
  question: string;
  answer: string;
}

interface Props {
  content: LocalizedContentRow | null;
}

function parseFaqItems(bodyJson: Json | null): FaqItem[] {
  if (!Array.isArray(bodyJson)) return [];
  return bodyJson.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const f = item as Record<string, Json>;
    if (typeof f.question !== 'string' || typeof f.answer !== 'string') return [];
    return [{ question: f.question, answer: f.answer }];
  });
}

// React.memo: 'use client' Client Component이므로 memo가 유효합니다.
// RSC 섹션들(PainPoints, StatsSection 등)에는 memo를 적용하지 않습니다 (서버 실행이므로 무의미).
const FaqSection = memo(function FaqSection({ content }: Props) {
  const title = content?.title ?? '자주 묻는 질문';
  const items = parseFaqItems(content?.body_json ?? null);

  if (items.length === 0) return null;

  return (
    <section
      id="faq"
      className="scroll-mt-16 bg-background px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {title}
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {items.map((item, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger className="text-base font-medium text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
});

export default FaqSection;
