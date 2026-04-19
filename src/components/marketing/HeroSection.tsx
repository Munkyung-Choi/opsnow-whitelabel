import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroImage from '@/components/marketing/HeroImage';
import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import { parseMiniStats } from '@/lib/marketing/parsers';
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

  const title    = content?.title    ?? null;
  const subtitle = content?.subtitle ?? t.defaultSubtitle;
  const ctaText  = content?.cta_text ?? t.defaultCta;
  const imageSrc = heroImageUrl ?? DEFAULT_HERO_IMAGE;

  // WL-94: DB mini_stats 우선, 없으면 dictionary heroStats 폴백
  const dbStats = parseMiniStats(content?.body_json ?? null);
  const stats = dbStats.length > 0 ? dbStats : t.heroStats;

  return (
    <section
      id="hero"
      className="bg-background px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">

          {/* 좌: 텍스트 + CTA + 미니 스탯 */}
          <div className="flex flex-col gap-6 text-center lg:text-left">

            {/* 카테고리 배지 */}
            <div className="flex justify-center lg:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
                {/* FIXED: bg-primary는 파트너 테마 포인트 컬러 적용을 위한 의도적 사용 */}
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                {t.badge}
              </span>
            </div>

            {/* 메인 타이틀 — {PartnerName} 인터폴레이션 + 조사 처리는 get-partner-page-data.ts에서 수행
                whitespace-pre-line: DB title의 \n 문자를 시각적 줄바꿈으로 렌더링 */}
            {title && (
              <h1
                className="whitespace-pre-line text-4xl/[1.25] font-bold text-foreground sm:text-5xl/[1.25] lg:text-[3.5rem]/[1.25]"
                data-wl-preview="hero.title"
              >
                {title}
              </h1>
            )}

            {/* 서브타이틀 */}
            <p
              className="text-lg/[1.5] text-muted-foreground sm:text-xl/[1.5]"
              data-wl-preview="hero.subtitle"
            >
              {subtitle}
            </p>

            {/* CTA 버튼 그룹 */}
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              {/* FIXED: bg-primary는 파트너 테마 CTA 버튼 — 화이트라벨 핵심 포인트 */}
              <Button asChild size="lg">
                <a href="#contact">
                  {ctaText}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#core-engines">
                  {t.exploreServices}
                  <ChevronDown className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>

            {/* 미니 스탯 — 숫자에 Primary Color 적용 (파트너 포인트 컬러 노출 전략)
                WL-94: DB body_json 우선, 없으면 dictionary heroStats 폴백 */}
            <div className="flex flex-wrap justify-center gap-8 pt-2 lg:justify-start">
              {stats.map((stat) => (
                <div key={stat.label}>
                  {/* FIXED: text-primary는 파트너 테마 포인트 컬러 — 화이트라벨 핵심 */}
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

          </div>

          {/* 우: Hero 이미지 (WL-67 ST-6) */}
          <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <HeroImage
              src={imageSrc}
              alt="클라우드 비용 최적화 플랫폼 대시보드 일러스트레이션"
            />
          </div>

        </div>
      </div>
    </section>
  );
}
