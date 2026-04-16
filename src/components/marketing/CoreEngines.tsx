import { BrainCircuit, Zap, Cloud, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';
import { parseEngines } from '@/lib/marketing/parsers';
import IconRenderer from '@/components/marketing/IconRenderer';

interface Props {
  content: LocalizedGlobalContentRow | null;
  /** 파트너 상호명 — 부제목의 {PartnerName} 자리에 삽입 */
  partnerName: string;
}

interface EngineData {
  id: string;
  tag: string;
  Icon: LucideIcon;
  title: string;
  badge: string;
  description: string;
  metric: { value: string; label: string };
  checks: string[];
}

// WL-95: 인덱스 기준 정적 아이콘 폴백 (DB icon 없을 때 사용)
const ENGINE_ICONS: LucideIcon[] = [BrainCircuit, Zap, Cloud];

// CoreEngines 섹션은 파트너 수정 불가 — 고정 데이터
const ENGINES: EngineData[] = [
  {
    id: 'ai',
    tag: 'Engine 01',
    Icon: BrainCircuit,
    title: 'AI 비용 예측',
    badge: 'AI Powered',
    description:
      '과거 소비 패턴과 서비스 성장률을 조합해 향후 90일간의 클라우드 비용을 정밀 예측합니다. 예산 초과 전에 먼저 알려드립니다.',
    metric: { value: '96%', label: '예측 정확도' },
    checks: [
      'ML 기반 이상 지출 자동 탐지',
      '팀/서비스별 예산 임계값 설정',
      '월말 청구액 사전 예상 리포트',
      '비용 급증 패턴 조기 경고 알림',
    ],
  },
  {
    id: 'auto',
    tag: 'Engine 02',
    Icon: Zap,
    title: '자동 절감 권고',
    badge: 'Automation',
    description:
      '유휴 EC2, 과도한 RDS 인스턴스 유형, 불필요한 EBS 스냅샷까지 실행 가능한 수백 가지 절감 액션을 우선순위에 따라 자동 큐에 올립니다.',
    metric: { value: '27%', label: '즉시 절감 평균' },
    checks: [
      '원클릭 최적화 즉시 실행',
      'RI / Savings Plan 갱신 자동 권고',
      'Spot Instance 전환 가이드',
      '안전 모드 → 롤백 1분 이내 완료',
    ],
  },
  {
    id: 'multi',
    tag: 'Engine 03',
    Icon: Cloud,
    title: '멀티 클라우드 통합',
    badge: 'Multi-Cloud',
    description:
      'AWS, Azure, GCP 비용을 단일 대시보드에서 통합 관리합니다. 벤더별 단가를 비교하고 워크로드 재배치 시 절감 가능 금액을 자동 산출합니다.',
    metric: { value: '3개', label: '클라우드 통합 지원' },
    checks: [
      '통합 태그 정책 기반 비용 배분',
      '팀/프로젝트별 차지백 리포트',
      '멀티 클라우드 비교 분석 뷰',
      '벤더 마이그레이션 비용 시뮬레이션',
    ],
  },
];

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[0.8125rem] leading-[1.6] text-muted-foreground">
      <Check size={14} strokeWidth={2.5} className="mt-0.5 shrink-0 text-primary" />
      {children}
    </li>
  );
}

export default function CoreEngines({ content, partnerName }: Props) {
  // 완전 고정 섹션 — DB global_contents title/subtitle 무시, 항상 하드코딩 값 사용
  // (HowItWorks와 동일 정책: 파트너별 수정 불가)
  const title = '절감을 현실로 만드는 핵심 엔진';
  const subtitle = `AI 진단부터 자동 실행까지, ${partnerName}의 세 가지 엔진이 복잡한 절감 과정을 완전히 자동화합니다.`;

  // WL-95: DB engines에서 icon 이름 추출 (인덱스 기준 정적 아이콘으로 폴백)
  const dbEngines = parseEngines(content?.meta ?? null);

  return (
    <section id="core-engines" className="scroll-mt-16 bg-background px-4 py-20 sm:px-6">
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
          {ENGINES.map(({ id, tag, Icon, title: engineTitle, badge, description, metric, checks }, idx) => {
            // WL-95: DB icon 이름 있으면 IconRenderer, 없으면 정적 아이콘 폴백
            const dbIconName = dbEngines[idx]?.icon;
            const FallbackIcon = ENGINE_ICONS[idx] ?? Icon;
            return (
            <Card key={id} className="flex flex-col gap-0 transition-shadow hover:shadow-md">
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
                    {tag}
                  </span>
                </div>

                {/* 제목 + 배지 */}
                <div className="mb-1 flex items-start gap-2">
                  <CardTitle className="text-lg font-semibold tracking-[-0.015em] leading-[1.35]">
                    {engineTitle}
                  </CardTitle>
                  <Badge variant="secondary" className="mt-0.5 shrink-0 text-[0.6875rem]">
                    {badge}
                  </Badge>
                </div>

                <CardDescription className="text-[0.9rem] leading-[1.7] mt-1">
                  {description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col">
                {/* 지표 콜아웃 */}
                <div className="mb-4 flex items-baseline gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
                  <span className="text-[1.75rem] font-extrabold tracking-[-0.03em] leading-none tabular-nums text-foreground">
                    {metric.value}
                  </span>
                  <span className="text-[0.8125rem] text-muted-foreground">
                    {metric.label}
                  </span>
                </div>

                <Separator className="mb-4" />

                {/* 체크 리스트 */}
                <ul className="flex flex-1 flex-col gap-2.5">
                  {checks.map((c) => (
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
