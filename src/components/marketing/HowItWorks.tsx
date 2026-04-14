import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import type { Json } from '@/types/supabase';

interface Step {
  step: number;
  title: string;
  description: string;
}

interface Props {
  content: LocalizedContentRow | null;
}

const DEFAULT_STEPS: Step[] = [
  { step: 1, title: '연결', description: '클라우드 계정에 연결합니다. AWS, Azure, GCP 모두 5분 내 설정 완료.' },
  { step: 2, title: '분석', description: 'AI가 지출 패턴을 자동으로 분석하고 낭비 리소스를 탐지합니다.' },
  { step: 3, title: '최적화', description: '권고안을 적용하고 즉시 비용 절감 효과를 확인하세요.' },
];

function parseSteps(bodyJson: Json | null): Step[] {
  if (!Array.isArray(bodyJson)) return DEFAULT_STEPS;
  const parsed = bodyJson.flatMap((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const s = item as Record<string, Json>;
    if (typeof s.title !== 'string' || typeof s.description !== 'string') return [];
    return [{
      step: typeof s.step === 'number' ? s.step : idx + 1,
      title: s.title,
      description: s.description,
    }];
  });
  return parsed.length > 0 ? parsed : DEFAULT_STEPS;
}

export default function HowItWorks({ content }: Props) {
  const title = content?.title ?? '비용을 줄이는 3가지 단계';
  const subtitle = content?.subtitle ?? null;
  const steps = parseSteps(content?.body_json ?? null);

  return (
    <section
      id="how-it-works"
      className="scroll-mt-16 bg-background px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.step} className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {step.step}
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
