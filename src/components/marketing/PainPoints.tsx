import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';
import type { Json } from '@/types/supabase';
import IconRenderer from '@/components/marketing/IconRenderer';

interface PainPointCard {
  icon: string;
  title: string;
  description: string;
}

interface Props {
  content: LocalizedGlobalContentRow | null;
}

function parsePainPoints(meta: Json | null): PainPointCard[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const cards = (meta as Record<string, Json>)['cards'];
  if (!Array.isArray(cards)) return [];
  return cards.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const c = item as Record<string, Json>;
    if (typeof c.icon !== 'string' || typeof c.title !== 'string' || typeof c.description !== 'string') return [];
    return [{ icon: c.icon, title: c.title, description: c.description }];
  });
}

export default function PainPoints({ content }: Props) {
  const title = content?.title ?? '아직도 엑셀로 클라우드 비용을 관리하시나요?';
  const subtitle = content?.subtitle ?? '수작업 관리의 한계를 넘어, 이제는 자동화된 인텔리전스로 비용을 통제하세요.';
  const cards = parsePainPoints(content?.meta ?? null);

  return (
    <section
      id="pain-points"
      className="scroll-mt-16 bg-secondary px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-secondary-foreground sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
        </div>

        {cards.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              return (
                <div
                  key={card.title}
                  className="rounded-xl border border-border bg-background p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <IconRenderer name={card.icon} className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
