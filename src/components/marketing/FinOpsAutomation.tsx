import { XCircle, CheckCircle, ArrowRight, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';

interface Props {
  content: LocalizedGlobalContentRow | null;
}

// FinOps Automation 섹션은 파트너 수정 불가 — 비교 데이터 고정
const TRANSITION_DATA = [
  {
    category: 'Visibility (가시성)',
    asIs: {
      tag: '사후 확인',
      title: '수동 엑셀 추적',
      description: '월말 청구서를 수령한 뒤에야 예산 초과를 뒤늦게 발견합니다.',
    },
    toBe: {
      tag: '실시간',
      title: 'AI 통합 대시보드',
      description: '역할별(CTO/CFO) 대시보드로 100% 투명한 가시성을 즉시 확보합니다.',
    },
  },
  {
    category: 'Commitment (약정 관리)',
    asIs: {
      tag: '방치된 자산',
      title: '약정 커버리지 누수',
      description: '복잡한 RI/SP 관리 실패로 낭비되는 인스턴스가 발생합니다.',
    },
    toBe: {
      tag: '자동화',
      title: '약정 24시간 자동 매매',
      description: '실시간 사용량 분석을 통해 낭비 없는 100% 약정 커버리지를 유지합니다.',
    },
  },
  {
    category: 'Operation (운영 효율)',
    asIs: {
      tag: '피로도 증가',
      title: '노이즈 알람 폭탄',
      description: '의미 없는 중복 경고 알람으로 인해 핵심 비용 폭증 인시던트를 놓칩니다.',
    },
    toBe: {
      tag: '선제 대응',
      title: '스마트 이상 비용 탐지',
      description: '조치가 필요한 5%의 핵심 알람만 필터링하여 사전 예방합니다.',
    },
  },
] as const;

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

export default function FinOpsAutomation({ content }: Props) {
  // 제목/부제는 DB global_contents 오버라이드 허용, 비교 카드 데이터는 고정
  const hasDbTitle = !!content?.title;
  const subtitle = content?.subtitle ??
    '운영팀이 직접 겪는 세 가지 만성 비효율을 자동화 기반의 To-be 상태로 전환합니다. 각 항목은 실 도입 기업의 Before/After 데이터에 근거합니다.';

  return (
    <section id="finops" className="scroll-mt-16 bg-background px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* 섹션 헤더 */}
        <div className="mb-14 text-center">
          <Badge variant="outline" className="mb-4">FinOps Automation</Badge>
          <h2 className="mx-auto mb-4 max-w-2xl text-[clamp(1.625rem,2.8vw,2.125rem)] font-bold tracking-[-0.02em] leading-[1.3] text-foreground">
            {hasDbTitle ? content!.title : (
              <>엑셀과 감에 의존하던 관리,<br />이제 AI로 자율주행하십시오.</>
            )}
          </h2>
          <p className="mx-auto max-w-xl text-base leading-[1.7] text-muted-foreground text-balance">
            {subtitle}
          </p>
        </div>

        {/* 비교 행 */}
        <div className="flex flex-col gap-6">
          {TRANSITION_DATA.map((row) => (
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
