import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import IconRenderer from '@/components/marketing/IconRenderer';
import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import { DEFAULT_STEPS } from '@/lib/marketing/parsers';

interface Props {
  content: LocalizedContentRow | null;
}

// DB에 iconName 미입력 시 스텝 순서별 기본 아이콘
const STEP_ICONS = ['Link', 'ScanSearch', 'Zap'] as const;

export default function HowItWorks({ content }: Props) {
  const title    = content?.title    ?? '비용을 줄이는 3단계';
  const subtitle = content?.subtitle ?? '설치부터 절감까지, 단 하루면 충분합니다. 복잡한 설정 없이 세 단계로 비용 최적화를 시작하세요.';
  // 스텝 콘텐츠는 파트너별 수정 불가(고정) — DB body_json 무시하고 DEFAULT_STEPS 항상 사용
  const steps = DEFAULT_STEPS;

  return (
    <section id="how-it-works" className="scroll-mt-16 bg-background px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* 섹션 헤더 */}
        <div className="mb-14">
          <Badge variant="outline" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {/* 데스크톱: 수평 3열 (md 이상) */}
        <div className="hidden md:block">

          {/* 아이콘 원 행 + 커넥터 점선 */}
          <div className="relative grid grid-cols-3 gap-5">
            {/*
              커넥터 점선: 1번 원 중심 ~ 3번 원 중심을 잇는 가로선.
              left/right = 전체 너비의 1/6 (각 열의 절반 = 열 중앙까지)
              Tailwind 표준 스케일 없음 → calc() arbitrary value 사용 (디자인 필수)
            */}
            <div className="pointer-events-none absolute top-7 left-[calc(100%/6)] right-[calc(100%/6)] border-t-2 border-dashed border-border" />

            {steps.map((step, i) => (
              <div key={step.step} className="flex justify-center">
                <div className="relative z-10">
                  <div className="relative z-10 flex size-14 items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
                    <IconRenderer
                      name={step.iconName ?? STEP_ICONS[i % STEP_ICONS.length]}
                      size={22}
                      strokeWidth={1.6}
                    />
                  </div>
                  {/* 스텝 번호 배지 */}
                  <span className="absolute -right-2 -top-2 z-20 flex size-5 items-center justify-center rounded-full bg-primary text-[0.625rem] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 스텝 카드 */}
          <div className="mt-8 grid grid-cols-3 gap-5">
            {steps.map((step, i) => (
              <div key={step.step} className="rounded-xl border border-border bg-card p-6">
                {/* 스텝 식별자 행 */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-primary">
                    {step.title}
                  </span>
                </div>
                {/* 카드 제목 */}
                <h3 className="mb-3 text-lg font-semibold leading-snug tracking-tight text-foreground">
                  {step.subtitle ?? step.title}
                </h3>
                {/* 설명 */}
                <p className="mb-4 text-[0.9rem] leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                {/* 체크리스트 */}
                {step.details && step.details.length > 0 && (
                  <ul className="flex flex-col gap-2 border-t border-border pt-4">
                    {step.details.map((d) => (
                      <li key={d} className="flex items-center gap-2 text-[0.8125rem] leading-snug text-muted-foreground">
                        <Check className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 모바일: 세로 타임라인 (md 미만) */}
        <div className="flex flex-col md:hidden">
          {steps.map((step, i) => (
            <div key={step.step} className="flex gap-5">
              {/* 타임라인 스파인 */}
              <div className="flex flex-col items-center">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
                  <IconRenderer
                    name={step.iconName ?? STEP_ICONS[i % STEP_ICONS.length]}
                    size={20}
                    strokeWidth={1.6}
                  />
                </div>
                {i < steps.length - 1 && (
                  <div className="my-2 w-px flex-1 border-l-2 border-dashed border-border" />
                )}
              </div>
              {/* 콘텐츠 */}
              <div className="flex-1 pb-8">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-primary">
                    {step.title}
                  </span>
                </div>
                <h3 className="mb-2 text-[1.0625rem] font-semibold leading-snug tracking-tight text-foreground">
                  {step.subtitle ?? step.title}
                </h3>
                <p className="text-[0.9rem] leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
