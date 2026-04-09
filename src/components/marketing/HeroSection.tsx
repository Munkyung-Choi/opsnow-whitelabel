import { Button } from '@/components/ui/button';
import type { Database } from '@/types/supabase';

type ContentRow = Database['public']['Tables']['contents']['Row'];

interface HeroSectionProps {
  content: ContentRow | null;
}

export default function HeroSection({ content }: HeroSectionProps) {
  const title = content?.title ?? 'OpsNow으로 클라우드를 최적화하세요';
  const subtitle = content?.subtitle ?? '파트너와 함께하는 스마트한 클라우드 관리 솔루션';
  const ctaText = content?.cta_text ?? '무료 진단 신청';

  return (
    <section
      id="home"
      className="relative flex min-h-[560px] items-center bg-primary px-4 py-24 sm:px-6"
    >
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-primary-foreground/80 sm:text-xl">
          {subtitle}
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="min-w-[180px] font-semibold"
          >
            <a href="#contact">{ctaText}</a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="min-w-[180px] border border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <a href="#features">서비스 살펴보기</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
