import { BrainCircuit, Zap, Cloud, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';
import { parseEngines } from '@/lib/marketing/parsers';
import IconRenderer from '@/components/marketing/IconRenderer';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/locales';
import { interpolateString } from '@/lib/utils/interpolate';

interface Props {
  content: LocalizedGlobalContentRow | null;
  /** 파트너 상호명 — 부제목의 {PartnerName} 자리에 삽입 */
  partnerName: string;
  locale: Locale;
}

// WL-95: 인덱스 기준 정적 아이콘 폴백 (DB icon 없을 때 사용)
const ENGINE_ICONS: LucideIcon[] = [BrainCircuit, Zap, Cloud];

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[0.8125rem] leading-[1.6] text-muted-foreground">
      <Check size={14} strokeWidth={2.5} className="mt-0.5 shrink-0 text-primary" />
      {children}
    </li>
  );
}

export default function CoreEngines({ content, partnerName, locale }: Props) {
  const t = getDictionary(locale).coreEngines;
  const title = t.title;
  const subtitle = interpolateString(t.subtitle, partnerName);

  // WL-95: DB engines에서 icon 이름 추출 (인덱스 기준 정적 아이콘으로 폴백)
  const dbEngines = parseEngines(content?.meta ?? null);

  return (
    <section id="core-engines" className="scroll-mt-16 bg-background px-4 section-py sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* 섹션 헤더 */}
        <div className="mb-12">
          <Badge variant="outline" className="mb-4">Core Engines</Badge>
          <h2 className="mb-4 text-[clamp(1.875rem,3vw,2.25rem)] font-bold tracking-[-0.02em] leading-[1.25] text-foreground">
            {title}
          </h2>
          <p className="max-w-2xl text-base leading-[1.7] text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {/* 엔진 카드 그리드 */}
        <div className="grid gap-5 md:grid-cols-3">
          {t.engines.map((engine, idx) => {
            // WL-95: DB icon 이름 있으면 IconRenderer, 없으면 정적 아이콘 폴백
            const dbIconName = dbEngines[idx]?.icon;
            const FallbackIcon = ENGINE_ICONS[idx] ?? BrainCircuit;
            return (
            <Card key={engine.tag} className="flex flex-col gap-0 transition-shadow hover:shadow-md">
              <CardHeader className="pb-4">
                {/* 아이콘 + 태그 행 */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground">
                    {dbIconName
                      ? <IconRenderer name={dbIconName} size={22} strokeWidth={1.6} />
                      : <FallbackIcon size={22} strokeWidth={1.6} />
                    }
                  </div>
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {engine.tag}
                  </span>
                </div>

                {/* 제목 + 배지 */}
                <div className="mb-1 flex items-start gap-2">
                  <CardTitle className="text-lg font-semibold tracking-[-0.015em] leading-[1.35]">
                    {engine.title}
                  </CardTitle>
                  <Badge variant="secondary" className="mt-0.5 shrink-0 text-[0.6875rem]">
                    {engine.badge}
                  </Badge>
                </div>

                <CardDescription className="text-[0.9rem] leading-[1.7] mt-1">
                  {engine.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col">
                {/* 지표 콜아웃 */}
                <div className="mb-4 flex items-baseline gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
                  <span className="text-[1.75rem] font-extrabold tracking-[-0.03em] leading-none tabular-nums text-foreground">
                    {engine.metricValue}
                  </span>
                  <span className="text-[0.8125rem] text-muted-foreground">
                    {engine.metricLabel}
                  </span>
                </div>

                <Separator className="mb-4" />

                {/* 체크 리스트 */}
                <ul className="flex flex-1 flex-col gap-2.5">
                  {engine.checks.map((c) => (
                    <CheckItem key={c}>{c}</CheckItem>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
          })}
        </div>

      </div>
    </section>
  );
}
