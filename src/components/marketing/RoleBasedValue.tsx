import { Check, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { interpolateString } from '@/lib/utils/interpolate';
import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';

interface Props {
  content: LocalizedGlobalContentRow | null;
  /** 파트너 상호명 — 부제목·인용구·지표 레이블의 {PartnerName} 치환에 사용 */
  partnerName: string;
}

// RoleBasedValue 섹션은 파트너 수정 불가 — 고정 데이터
// {PartnerName} / {PartnerName:조사쌍} 형식으로 파트너명 삽입
const RAW_PERSONAS = [
  {
    id: 'cto',
    label: 'CTO',
    headline: '기술 전략과 비용 효율을 동시에 달성하세요',
    description:
      '클라우드 아키텍처의 낭비 요인을 구조적으로 진단합니다. 팀별 비용 책임 배분과 예산 거버넌스를 자동화해 기술 로드맵에 집중할 수 있게 합니다.',
    metrics: [
      { value: '40%', label: '인프라 비용 절감' },
      { value: '8h', label: '주간 운영 시간 절약' },
      { value: '100%', label: '가시성 확보율' },
    ],
    benefits: [
      '조직 전체 클라우드 비용 한 화면에서 실시간 파악',
      '팀/서비스/환경별 비용 책임 자동 배분 (차지백)',
      '아키텍처 비용 영향도 사전 시뮬레이션',
      '이사회 보고용 비용 최적화 KPI 대시보드 제공',
    ],
    quote:
      '"분기마다 AWS 청구서 설명하는 데 반나절씩 쏟았는데, 이제는 {PartnerName} 대시보드 화면 하나로 5분 내에 끝냅니다."',
    quoteAuthor: 'CTO, Series B SaaS 기업',
  },
  {
    id: 'devops',
    label: 'DevOps',
    headline: '인프라 운영 효율을 코드처럼 자동화하세요',
    description:
      '온콜 없이 비용 이상을 자동 탐지하고, Terraform·Pulumi 파이프라인과 통합해 인프라 변경 시 비용 영향을 사전에 확인합니다.',
    metrics: [
      { value: '72%', label: '비용 알림 노이즈 감소' },
      { value: '3min', label: '이상 탐지 평균 대응' },
      { value: '99.9%', label: '서비스 다운 없는 최적화' },
    ],
    benefits: [
      'Terraform / Pulumi PR에 비용 변화량 자동 코멘트',
      'Slack 채널로 임계값 초과 즉시 알림',
      '환경별(dev/staging/prod) 비용 격리 관리',
      '유휴 리소스 자동 스케줄링 정책 설정',
    ],
    quote:
      '"새벽 2시에 스토리지 비용 폭증 알람 받은 게 이제 없어졌어요. {PartnerName:이/가} 먼저 막아주니까요."',
    quoteAuthor: 'DevOps 리드, 국내 핀테크 유니콘 기업',
  },
  {
    id: 'cfo',
    label: 'CFO',
    headline: '클라우드 예산을 예측 가능한 고정비로 만드세요',
    description:
      '변동성 높은 클라우드 청구액을 예산 계획 가능한 구조로 전환합니다. 재무팀이 직접 이해할 수 있는 비용 리포트와 ROI 분석을 자동 생성합니다.',
    metrics: [
      { value: '±3%', label: '월별 예산 예측 오차' },
      { value: '15min', label: '임원 리포트 생성 시간' },
      { value: '2.4×', label: '{PartnerName} 투자 대비 ROI' },
    ],
    benefits: [
      '회계 기준 클라우드 비용 분류 및 집계 자동화',
      '부서/프로젝트별 예산 대비 실적 월간 리포트',
      '계약 갱신 타이밍에 맞춘 RI/SP 최적 포트폴리오 권고',
      '감사 대응용 비용 증빙 자료 원클릭 내보내기',
    ],
    quote:
      '"클라우드 비용이 단순 지출이 아니라, 성장을 위한 전략적 투자 항목으로 관리되기 시작했습니다."',
    quoteAuthor: '재무 총괄(CFO), 코스닥 상장 IT 기업',
  },
] as const;

function buildPersonas(partnerName: string) {
  return RAW_PERSONAS.map((p) => ({
    ...p,
    quote: interpolateString(p.quote, partnerName),
    metrics: p.metrics.map((m) => ({
      ...m,
      label: interpolateString(m.label, partnerName),
    })),
  }));
}

export default function RoleBasedValue({ content: _content, partnerName }: Props) {
  // 완전 고정 섹션 — DB global_contents title/subtitle 무시
  const subtitle = interpolateString(
    '{PartnerName:은/는} CTO, DevOps, CFO 각자의 언어로 클라우드 비용을 말합니다. 같은 데이터를 역할에 맞게 다르게 보여줍니다.',
    partnerName,
  );
  const personas = buildPersonas(partnerName);

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
            당신의 역할에 최적화된 대시보드
          </h2>
          <p className="max-w-xl text-base leading-[1.7] text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {/* 탭 */}
        <Tabs defaultValue="cto">
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
                        {p.label}용 무료 환경 분석
                      </p>
                      <p className="mb-4 text-[0.8125rem] leading-[1.6] opacity-75">
                        현재 환경의 절감 가능 금액을 무료로 산출해 드립니다.
                      </p>
                      <a
                        href="#contact"
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary-foreground/30 px-4 py-2 text-sm font-medium transition-colors hover:bg-primary-foreground/10"
                      >
                        지금 신청하기
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
