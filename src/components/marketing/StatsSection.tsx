import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import type { Json } from '@/types/supabase';

interface StatItem {
  number: string;
  label: string;
}

interface Props {
  content: LocalizedContentRow | null;
}

const DEFAULT_STATS: StatItem[] = [
  { number: '30%', label: '평균 비용 절감' },
  { number: '5분', label: '전체 현황 파악' },
  { number: '99.9%', label: '서비스 안정성' },
  { number: '500+', label: '도입 기업' },
];

function parseStats(bodyJson: Json | null): StatItem[] {
  if (!Array.isArray(bodyJson)) return DEFAULT_STATS;
  const parsed = bodyJson.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const s = item as Record<string, Json>;
    if (typeof s.number !== 'string' || typeof s.label !== 'string') return [];
    return [{ number: s.number, label: s.label }];
  });
  return parsed.length > 0 ? parsed : DEFAULT_STATS;
}

export default function StatsSection({ content }: Props) {
  const title = content?.title ?? null;
  const stats = parseStats(content?.body_json ?? null);

  return (
    <section
      id="stats"
      className="scroll-mt-16 bg-primary px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-5xl">
        {title && (
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
              {title}
            </h2>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl font-extrabold text-primary-foreground sm:text-5xl">
                {stat.number}
              </p>
              <p className="mt-2 text-sm font-medium text-primary-foreground/70">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
