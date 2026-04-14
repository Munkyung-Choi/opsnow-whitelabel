import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';
import type { Json } from '@/types/supabase';

interface FeatureItem {
  title: string;
  subtitle: string;
  description: string;
}

interface Props {
  content: LocalizedGlobalContentRow | null;
}

function parseFeatures(meta: Json | null): FeatureItem[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const features = (meta as Record<string, Json>)['features'];
  if (!Array.isArray(features)) return [];
  return features.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const f = item as Record<string, Json>;
    if (typeof f.title !== 'string' || typeof f.subtitle !== 'string' || typeof f.description !== 'string') return [];
    return [{ title: f.title, subtitle: f.subtitle, description: f.description }];
  });
}

export default function FinOpsAutomation({ content }: Props) {
  const title = content?.title ?? 'FinOps 자동화로 비용 절감을 실현하세요';
  const subtitle = content?.subtitle ?? null;
  const features = parseFeatures(content?.meta ?? null);

  return (
    <section
      id="finops"
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

        {features.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.subtitle}
                className="rounded-xl border border-border bg-background p-6 text-center shadow-sm"
              >
                <p className="text-4xl font-extrabold text-primary">
                  {feature.title}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {feature.subtitle}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
