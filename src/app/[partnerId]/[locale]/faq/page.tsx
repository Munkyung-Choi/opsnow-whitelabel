import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { validateLocale } from '@/proxy';
import { getPartnerPageData } from '@/lib/marketing/get-partner-page-data';
import { getFaqHub } from '@/lib/faq/get-faq-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import GlobalNav from '@/components/marketing/GlobalNav';
import Footer from '@/components/marketing/Footer';
import FaqHubClient from '@/components/marketing/FaqHubClient';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ partnerId: string; locale: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = validateLocale(rawLocale);
  const t = getDictionary(locale).faq;
  return { title: t.pageTitle };
}

export default async function FaqHubPage({ params, searchParams }: PageProps) {
  const { partnerId, locale: rawLocale } = await params;
  const { category, q } = await searchParams;
  const locale = validateLocale(rawLocale);

  const [data, faqHub] = await Promise.all([
    getPartnerPageData(partnerId, locale),
    getFaqHub(locale),
  ]);

  if (!data) notFound();

  const categories = faqHub?.categories ?? [];
  const items = faqHub?.items ?? [];

  // URL ?category= 파람을 초기 탭 상태로 전달 (deep-link 지원)
  const initialCategory =
    category && categories.some((c) => c.id === category) ? category : null;

  return (
    <>
      <GlobalNav partner={data.partner} locale={locale} />
      <main>
        <FaqHubClient
          locale={locale}
          categories={categories}
          items={items}
          initialCategory={initialCategory}
          initialQuery={q ?? ''}
        />
      </main>
      <Footer partner={data.partner} content={data.footer} locale={locale} />
    </>
  );
}
