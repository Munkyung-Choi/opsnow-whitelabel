import { notFound } from 'next/navigation';
import { getPartnerPageData } from '@/lib/marketing/get-partner-page-data';
import GlobalNav from '@/components/marketing/GlobalNav';
import HeroSection from '@/components/marketing/HeroSection';
import FeaturesSection from '@/components/marketing/FeaturesSection';
import AboutSection from '@/components/marketing/AboutSection';
import ContactForm from '@/components/marketing/ContactForm';
import Footer from '@/components/marketing/Footer';

interface PageProps {
  params: Promise<{ partnerId: string }>;
}

export default async function MarketingPage({ params }: PageProps) {
  const { partnerId } = await params;
  const data = await getPartnerPageData(partnerId);

  if (!data) notFound();

  const { partner, hero, about, footer, features } = data;
  const ctaText = hero?.cta_text ?? '문의 신청하기';

  return (
    <>
      <GlobalNav partner={partner} />
      <main>
        <HeroSection content={hero} />
        <FeaturesSection content={features} />
        <AboutSection content={about} />
        <ContactForm partnerId={partnerId} ctaText={ctaText} />
      </main>
      <Footer partner={partner} content={footer} />
    </>
  );
}
