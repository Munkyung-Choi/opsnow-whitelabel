import { Cloud, Brain, TrendingDown, Shield, type LucideIcon } from 'lucide-react';
import type { FeaturesContent, FeatureCard } from '@/lib/marketing/get-partner-page-data';

interface FeaturesSectionProps {
  content: FeaturesContent | null;
}

const ICON_MAP: Record<string, LucideIcon> = {
  cloud: Cloud,
  brain: Brain,
  'trending-down': TrendingDown,
  shield: Shield,
};

function FeatureCardItem({ card }: { card: FeatureCard }) {
  const Icon = ICON_MAP[card.icon] ?? Cloud;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-card-foreground">{card.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{card.description}</p>
    </div>
  );
}

export default function FeaturesSection({ content }: FeaturesSectionProps) {
  if (!content) return null;

  const title = content.title ?? 'OpsNow 핵심 기능';
  const subtitle = content.subtitle ?? '전 세계 고객이 신뢰하는 클라우드 관리 플랫폼';

  return (
    <section id="features" className="bg-secondary px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          {/* OpsNow 공식 Identity 배지 */}
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Powered by OpsNow
          </span>
          <h2 className="text-3xl font-bold text-secondary-foreground sm:text-4xl">{title}</h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">{subtitle}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {content.cards.map((card) => (
            <FeatureCardItem key={card.title} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
