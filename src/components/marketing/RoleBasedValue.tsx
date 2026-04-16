import { Check, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { interpolateString } from '@/lib/utils/interpolate';
import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/locales';

interface Props {
  content: LocalizedGlobalContentRow | null;
  /** 파트너 상호명 — 부제목·인용구·지표 레이블의 {PartnerName} 치환에 사용 */
  partnerName: string;
  locale: Locale;
}

export default function RoleBasedValue({ content: _content, partnerName, locale }: Props) {
  const t = getDictionary(locale).roleBasedValue;
  const subtitle = interpolateString(t.subtitle, partnerName);

  const personas = t.personas.map((p) => ({
    ...p,
    quote: interpolateString(p.quote, partnerName),
    metrics: p.metrics.map((m) => ({
      ...m,
      label: interpolateString(m.label, partnerName),
    })),
    ctaTitle: t.ctaTitle.replace('{label}', p.label),
  }));

  return (
    <section
      id="role-value"
      className="scroll-mt-16 border-t border-b border-border bg-muted/30"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">

        {/* 섹션 헤더 */}
        <div className="mb-12">
          <Badge variant="outline" className="mb-4">Role-Based Value</Badge>
          <h2 className="mb-4 text-[clamp(1.875rem,3vw,2.25rem)] font-bold tracking-[-0.02em] leading-[1.25] text-foreground">
            {t.title}
          </h2>
          <p className="max-w-xl text-base leading-[1.7] text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {/* 탭 */}
        <Tabs defaultValue={personas[0]?.id ?? 'cto'}>
          <TabsList className="mb-8 h-auto w-full p-1 sm:w-auto">
            {personas.map((p) => (
              <TabsTrigger key={p.id} value={p.id} className="px-6 py-2 text-[0.9375rem]">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {personas.map((p) => (
            <TabsContent key={p.id} value={p.id}>
              <div className="grid gap-6 lg:grid-cols-5">

                {/* 좌측: 설명 + 체크리스트 + 인용구 (3열) */}
                <Card className="gap-0 lg:col-span-3">
                  <CardContent className="py-8">
                    <h3 className="mb-3 text-xl font-semibold tracking-[-0.015em] leading-[1.35] text-foreground">
                      {p.headline}
                    </h3>
                    <p className="mb-6 text-[0.9375rem] leading-[1.7] text-muted-foreground">
                      {p.description}
                    </p>

                    <Separator className="mb-6" />

                    <ul className="flex flex-col gap-3.5">
                      {p.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2.5 text-[0.9375rem] leading-[1.65] text-muted-foreground">
                          <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-primary" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    {/* 인용구 */}
                    <div className="mt-6 border-l-2 border-border pl-4">
                      <p className="mb-1.5 text-sm italic leading-[1.65] text-muted-foreground">
                        {p.quote}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        — {p.quoteAuthor}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 우측: 지표 카드 + CTA 카드 (2열) */}
                <div className="flex flex-col gap-5 lg:col-span-2">
                  {/* 지표 카드 3개 */}
                  {p.metrics.map((m) => (
                    <Card key={m.label} className="gap-0">
                      <CardContent className="flex items-center py-5">
                        {/* 지표 수치 */}
                        <div className="text-center">
                          <p className="text-[1.875rem] font-extrabold tracking-[-0.03em] leading-none tabular-nums text-foreground">
                            {m.value}
                          </p>
                          <p className="mt-1 text-xs leading-[1.4] text-muted-foreground">
                            {m.label}
                          </p>
                        </div>
                        {/* 구분선 */}
                        <div className="mx-5 h-8 w-px bg-border shrink-0" />
                        {/* 프로그레스 바 */}
                        <div className="flex-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            {/* FIXED: 디자인 시안의 고정 진행률 75% */}
                            <div className="h-full w-3/4 rounded-full bg-primary" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* CTA 카드 */}
                  <Card className="gap-0 ring-0 border border-primary bg-primary text-primary-foreground">
                    <CardContent className="py-6">
                      <p className="mb-2 text-base font-semibold tracking-[-0.01em] leading-[1.45]">
                        {p.ctaTitle}
                      </p>
                      <p className="mb-4 text-[0.8125rem] leading-[1.6] opacity-75">
                        {t.ctaSubtitle}
                      </p>
                      <a
                        href="#contact"
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary-foreground/30 px-4 py-2 text-sm font-medium transition-colors hover:bg-primary-foreground/10"
                      >
                        {t.ctaButton}
                        <ArrowRight size={14} strokeWidth={2.5} />
                      </a>
                    </CardContent>
                  </Card>
                </div>

              </div>
            </TabsContent>
          ))}
        </Tabs>

      </div>
    </section>
  );
}
