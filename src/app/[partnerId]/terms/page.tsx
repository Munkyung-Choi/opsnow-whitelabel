import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPartnerPageData } from '@/lib/marketing/get-partner-page-data';
import GlobalNav from '@/components/marketing/GlobalNav';
import Footer from '@/components/marketing/Footer';

interface PageProps {
  params: Promise<{ partnerId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { partnerId } = await params;
  const data = await getPartnerPageData(partnerId);
  if (!data) return {};
  return { title: data.terms?.title ?? '이용약관' };
}

export default async function TermsPage({ params }: PageProps) {
  const { partnerId } = await params;
  const data = await getPartnerPageData(partnerId);

  if (!data) notFound();

  const { partner, terms, footer } = data;

  return (
    <>
      <GlobalNav partner={partner} />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {terms?.title && (
          <h1 className="mb-8 text-3xl font-bold text-foreground">{terms.title}</h1>
        )}
        {terms?.body ? (
          <div className="prose prose-sm max-w-none text-muted-foreground">
            {terms.body.split('\n').map((line, i) => (
              <p key={i} className="mb-3 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">이용약관 내용이 준비 중입니다.</p>
        )}
      </main>
      <Footer partner={partner} content={footer} />
    </>
  );
}
