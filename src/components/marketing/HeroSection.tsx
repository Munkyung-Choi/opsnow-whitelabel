import Image from 'next/image';
import { Button } from '@/components/ui/button';
import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/proxy';

// WL-67 ST-6: 파트너별 커스텀 이미지가 없을 경우 사용하는 시스템 기본 이미지
const DEFAULT_HERO_IMAGE = '/images/marketing/hero-default.webp';

interface HeroSectionProps {
  content: LocalizedContentRow | null;
  locale: Locale;
  /** 파트너별 커스텀 Hero 이미지 URL (Supabase Storage).
   *  미설정 시 DEFAULT_HERO_IMAGE로 자동 폴백.
   *  DB 연결: partners.hero_image_url (migration: WL-67 ST-6 승인 후 활성화) */
  heroImageUrl?: string | null;
}

export default function HeroSection({ content, locale, heroImageUrl }: HeroSectionProps) {
  const t = getDictionary(locale).hero;

  const title = content?.title ?? t.defaultTitle;
  const subtitle = content?.subtitle ?? t.defaultSubtitle;
  const ctaText = content?.cta_text ?? t.defaultCta;
  const imageSrc = heroImageUrl ?? DEFAULT_HERO_IMAGE;

  return (
    <section
      id="home"
      className="relative bg-primary px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">

          {/* 좌: 텍스트 + CTA */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-primary-foreground/80 sm:text-xl">
              {subtitle}
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
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
                <a href="#how-it-works">{t.exploreServices}</a>
              </Button>
            </div>
          </div>

          {/* 우: Hero 이미지 (WL-67 ST-6) */}
          <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <Image
              src={imageSrc}
              alt="클라우드 비용 최적화 플랫폼 일러스트레이션"
              width={1400}
              height={1046}
              className="h-auto w-full object-contain"
              priority
            />
          </div>

        </div>
      </div>
    </section>
  );
}
