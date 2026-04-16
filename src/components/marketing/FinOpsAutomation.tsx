import { XCircle, CheckCircle, ArrowRight, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/locales';

interface Props {
  content: LocalizedGlobalContentRow | null;
  locale: Locale;
}

interface CardData {
  tag: string;
  title: string;
  description: string;
}

function AsIsCard({ data }: { data: CardData }) {
  return (
    <Card className="flex-1 min-w-0 bg-muted/30 ring-0 border border-dashed border-border py-0 gap-0">
      <CardHeader className="pt-5 pb-2 px-5">
        <div className="flex items-center gap-2 mb-3">
          <XCircle size={14} strokeWidth={2} className="text-destructive shrink-0" />
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-destructive">
            {data.tag}
          </span>
        </div>
        <h4 className="text-base font-semibold tracking-[-0.015em] leading-[1.4] text-foreground">
          {data.title}
        </h4>
      </CardHeader>
      <CardContent className="pt-0 pb-5 px-5">
        <p className="text-sm leading-[1.65] text-muted-foreground">
          {data.description}
        </p>
      </CardContent>
    </Card>
  );
}

function ToBeCard({ data }: { data: CardData }) {
  return (
    <Card className="flex-1 min-w-0 bg-background ring-0 border border-border shadow-sm relative py-0 gap-0">
      {/* 상단 포인트 라인 */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/20" />
      <CardHeader className="pt-5 pb-2 px-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle size={14} strokeWidth={2} className="text-primary shrink-0" />
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-primary">
            {data.tag}
          </span>
        </div>
        <h4 className="text-base font-semibold tracking-[-0.015em] leading-[1.4] text-foreground">
          {data.title}
        </h4>
      </CardHeader>
      <CardContent className="pt-0 pb-5 px-5">
        <p className="text-sm leading-[1.65] text-muted-foreground">
          {data.description}
        </p>
      </CardContent>
    </Card>
  );
}

export default function FinOpsAutomation({ content, locale }: Props) {
  const t = getDictionary(locale).finops;
  // 제목/부제는 DB global_contents 오버라이드 허용, 비교 카드 데이터는 locale 딕셔너리 사용
  const hasDbTitle = !!content?.title;
  const subtitle = content?.subtitle ?? t.defaultSubtitle;

  return (
    <section id="finops" className="scroll-mt-16 bg-background px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* 섹션 헤더 */}
        <div className="mb-14 text-center">
          <Badge variant="outline" className="mb-4">FinOps Automation</Badge>
          <h2 className="mx-auto mb-4 max-w-2xl text-[clamp(1.625rem,2.8vw,2.125rem)] font-bold tracking-[-0.02em] leading-[1.3] text-foreground">
            {hasDbTitle ? content!.title : t.defaultTitle}
          </h2>
          <p className="mx-auto max-w-xl text-base leading-[1.7] text-muted-foreground text-balance">
            {subtitle}
          </p>
        </div>

        {/* 비교 행 */}
        <div className="flex flex-col gap-6">
          {t.transitions.map((row) => (
            <div key={row.category} className="flex flex-col gap-2">
              {/* 카테고리 레이블 + 구분선 */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground shrink-0">
                  {row.category}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* As-is → 화살표 → To-be */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <AsIsCard data={row.asIs} />
                <div className="flex items-center justify-center shrink-0">
                  {/* 데스크톱: 오른쪽 화살표 / 모바일: 아래 화살표 */}
                  <ArrowRight size={20} strokeWidth={1.5} className="hidden md:block text-muted-foreground" />
                  <ArrowDown size={20} strokeWidth={1.5} className="block md:hidden text-muted-foreground" />
                </div>
                <ToBeCard data={row.toBe} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
