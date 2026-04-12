import { Button } from '@/components/ui/button';
import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/proxy';

interface HeroSectionProps {
  content: LocalizedContentRow | null;
  locale: Locale;
}

export default function HeroSection({ content, locale }: HeroSectionProps) {
  const t = getDictionary(locale).hero;

  const title = content?.title ?? t.defaultTitle;
  const subtitle = content?.subtitle ?? t.defaultSubtitle;
  const ctaText = content?.cta_text ?? t.defaultCta;

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
            <a href="#features">{t.exploreServices}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
