import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import { parseStats } from '@/lib/marketing/parsers';

interface Props {
  content: LocalizedContentRow | null;
}

export default function StatsSection({ content }: Props) {
  const sectionTitle = content?.title ?? null;
  const stats = parseStats(content?.body_json ?? null);

  return (
    <section
      id="stats"
      className="scroll-mt-16 border-t border-b border-border bg-muted/30"
    >
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12">
          <Badge variant="outline" className="mb-4">
            숫자로 보는 성과
          </Badge>
          {sectionTitle && (
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {sectionTitle}
            </h2>
          )}
        </div>

        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border bg-card">
              <CardContent className="pb-6 pt-6">
                <div className="mb-1 flex items-baseline gap-1.5">
                  <span className="tabular-nums text-4xl font-extrabold leading-none tracking-tight text-foreground">
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="text-xs font-medium leading-none text-muted-foreground">
                      {stat.unit}
                    </span>
                  )}
                </div>

                <p className="mb-3 text-sm font-semibold leading-snug tracking-tight text-foreground">
                  {stat.label}
                </p>

                <Separator className="mb-3" />

                {stat.detail && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {stat.detail}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
