import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import IconRenderer from '@/components/marketing/IconRenderer';

interface ProblemCard {
  id: string;
  icon: string;
  tag: string;
  title: string;
  description: string;
  pain: string;
}

// TODO: DB meta.cards 구조 확정 후 content.meta에서 파싱하도록 교체 (WL-74)
const PROBLEMS: ProblemCard[] = [
  {
    id: 'visibility',
    icon: 'EyeOff',
    tag: 'PROBLEM 01',
    title: '가시성 부족',
    description:
      'AWS, Azure, GCP 비용이 각기 다른 콘솔에 분산되어 있어 통합 현황을 파악하는 것 자체가 하루 업무가 됩니다. 어느 팀이 얼마를 쓰는지조차 알 수 없죠.',
    pain: '평균 3개 이상의 콘솔을 매일 오가는 팀',
  },
  {
    id: 'delay',
    icon: 'Clock',
    tag: 'PROBLEM 02',
    title: '대응 지연',
    description:
      '이달 말에야 청구서를 받아보는 구조에서는 이미 낭비가 일어난 뒤입니다. 경고 알림 하나 설정하는 데도 수동 작업이 수반됩니다.',
    pain: '이상 지출 탐지까지 평균 18일 소요',
  },
  {
    id: 'complexity',
    icon: 'Puzzle',
    tag: 'PROBLEM 03',
    title: '최적화 난제',
    description:
      'Reserved Instance, Savings Plan, Spot Instance의 복잡한 조합은 클라우드 전문가도 최적 선택이 어렵습니다. 잘못된 선택은 오히려 비용을 늘립니다.',
    pain: 'RI/SP 활용률 평균 34%에 그치는 현실',
  },
];

interface Props {
  content: LocalizedGlobalContentRow | null;
}

export default function PainPoints({ content }: Props) {
  const subtitle =
    content?.subtitle ??
    '대부분의 팀이 겪는 세 가지 구조적 문제를 진단합니다. 인지하지 못하는 낭비가 가장 비싼 낭비입니다.';

  return (
    <section
      id="pain-points"
      className="scroll-mt-16 bg-background px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">

        {/* ── 섹션 헤더 ─────────────────────────────────── */}
        <div className="mb-12">
          <Badge variant="outline" className="mb-4">Pain Points</Badge>
          <h2 className="mb-4 max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            아직도 감으로 클라우드 비용을
            <br />관리하시나요?
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {/* ── 문제 카드 그리드 ──────────────────────────── */}
        <div className="grid gap-5 md:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <Card
              key={problem.id}
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
                <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                  {problem.title}
                </h3>

                {/* 설명 — flex-1로 늘려 통계 행을 카드 하단에 고정 */}
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {problem.description}
                </p>

                {/* 구분선 + 통계 */}
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

              </div>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
}
