import { Cpu, Brain, Shield } from 'lucide-react';
import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';
import type { Json } from '@/types/supabase';

interface Engine {
  name: string;
  description: string;
}

interface Props {
  content: LocalizedGlobalContentRow | null;
}

// 고정 순서로 각 엔진에 아이콘 매핑
const ENGINE_ICONS = [Cpu, Brain, Shield];

function parseEngines(meta: Json | null): Engine[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const engines = (meta as Record<string, Json>)['engines'];
  if (!Array.isArray(engines)) return [];
  return engines.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const e = item as Record<string, Json>;
    if (typeof e.name !== 'string' || typeof e.description !== 'string') return [];
    return [{ name: e.name, description: e.description }];
  });
}

export default function CoreEngines({ content }: Props) {
  const title = content?.title ?? '핵심 엔진으로 클라우드 지출을 혁신하세요';
  const subtitle = content?.subtitle ?? null;
  const engines = parseEngines(content?.meta ?? null);

  return (
    <section
      id="core-engines"
      className="scroll-mt-16 bg-background px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
        </div>

        {engines.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-3">
            {engines.map((engine, index) => {
              const IconComp = ENGINE_ICONS[index % ENGINE_ICONS.length];
              return (
                <div
                  key={engine.name}
                  className="rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <IconComp className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-card-foreground">
                    {engine.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {engine.description}
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
