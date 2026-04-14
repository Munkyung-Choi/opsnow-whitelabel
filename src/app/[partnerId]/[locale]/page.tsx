import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { validateLocale } from '@/proxy';
import { getPartnerPageData } from '@/lib/marketing/get-partner-page-data';
import { renderSection } from '@/lib/marketing/section-registry';
import GlobalNav from '@/components/marketing/GlobalNav';
import HeroSection from '@/components/marketing/HeroSection';
import Footer from '@/components/marketing/Footer';

// [WL-68] ISR 300초 갱신 — 어드민 즉시 반영은 WL-42(revalidatePath) 완료 후 대응
export const revalidate = 300;

interface PageProps {
  params: Promise<{ partnerId: string; locale: string }>;
}

export default async function MarketingPage({ params }: PageProps) {
  const { partnerId, locale: rawLocale } = await params;
  const locale = validateLocale(rawLocale);
  const data = await getPartnerPageData(partnerId, locale);

  if (!data) notFound();

  return (
    <>
      <GlobalNav partner={data.partner} locale={locale} />
      <main>
        {/* HeroSection은 LCP 대상이므로 Suspense 외부에서 정적 임포트로 유지 */}
        <HeroSection content={data.hero} locale={locale} heroImageUrl={data.partner.hero_image_url} />

        {data.sections.length === 0 ? (
          // Empty State: partner_sections 행이 0개인 경우 (파트너 설정 미완료 등)
          <section className="flex min-h-[40vh] items-center justify-center px-4 py-20">
            <p className="text-center text-muted-foreground">
              콘텐츠를 준비 중입니다. 곧 더 많은 정보를 제공해 드리겠습니다.
            </p>
          </section>
        ) : (
          // Suspense: App Router 스트리밍 SSR — 각 섹션이 완료되는 순서대로 전송됩니다.
          // next/dynamic(ssr:true)으로 선언된 컴포넌트들이 청크 단위로 분리됩니다.
          <Suspense>
            {data.sections.map((section) => (
              <Suspense key={section.section_type}>
                {renderSection(section.section_type, data)}
              </Suspense>
            ))}
          </Suspense>
        )}
      </main>
      <Footer partner={data.partner} content={data.footer} locale={locale} />
    </>
  );
}
