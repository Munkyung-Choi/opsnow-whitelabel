import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import IconRenderer from '@/components/marketing/IconRenderer';
import { parsePainPoints } from '@/lib/marketing/parsers';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/locales';

interface Props {
  content: LocalizedGlobalContentRow | null;
  locale: Locale;
}

export default function PainPoints({ content, locale }: Props) {
  const t = getDictionary(locale).painPoints;
  const subtitle = content?.subtitle ?? t.subtitle;

  const problems = parsePainPoints(content?.meta ?? null, locale);

  return (
    <section
      id="pain-points"
      className="scroll-mt-16 bg-background px-4 section-py sm:px-6"
    >
      <div className="mx-auto max-w-6xl">

        {/* ── 섹션 헤더 ─────────────────────────────────── */}
        <div className="mb-12">
          <Badge variant="outline" className="mb-4">Pain Points</Badge>
          <h2 className="mb-4 max-w-2xl text-3xl/[1.4] font-bold text-foreground sm:text-4xl/[1.4]">
            {t.title}
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {/* ── 문제 카드 그리드 ──────────────────────────── */}
        <div className="grid gap-5 md:grid-cols-3">
          {problems.map((problem) => (
            <Card
              key={problem.title}
              className="relative overflow-hidden gap-0 py-0"
            >
              {/* 카드 상단 포인트 라인 */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/20" />

              <div className="flex flex-1 flex-col px-6 pb-5 pt-7">

                {/* 아이콘 + PROBLEM 레이블 */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/50">
                    <IconRenderer
                      name={problem.icon}
                      className="h-5 w-5 text-muted-foreground"
                      strokeWidth={1.6}
                    />
                  </div>
                  {/* FIXED: PROBLEM 레이블은 디자인 고정값 — 시맨틱 색상 사용 */}
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {problem.tag}
                  </span>
                </div>

                {/* 카드 제목 */}
                <h3 className="mb-2 text-lg/[1.45] font-semibold text-foreground">
                  {problem.title}
                </h3>

                {/* 설명 — flex-1로 늘려 통계 행을 카드 하단에 고정 */}
                <p className="flex-1 text-sm/[1.5] text-muted-foreground">
                  {problem.description}
                </p>

                {/* 구분선 + 통계 — pain 필드가 있을 때만 노출 */}
                {problem.pain && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="flex items-start gap-2 text-[13px] leading-snug text-muted-foreground">
                      <IconRenderer
                        name="Info"
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60"
                        strokeWidth={2}
                      />
                      {problem.pain}
                    </p>
                  </div>
                )}

              </div>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
}
