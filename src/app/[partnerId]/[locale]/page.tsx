import { notFound } from 'next/navigation';
import { validateLocale } from '@/proxy';
import { getPartnerPageData } from '@/lib/marketing/get-partner-page-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import GlobalNav from '@/components/marketing/GlobalNav';
import HeroSection from '@/components/marketing/HeroSection';
import FeaturesSection from '@/components/marketing/FeaturesSection';
import AboutSection from '@/components/marketing/AboutSection';
import ContactForm from '@/components/marketing/ContactForm';
import Footer from '@/components/marketing/Footer';

interface PageProps {
  params: Promise<{ partnerId: string; locale: string }>;
}

export default async function MarketingPage({ params }: PageProps) {
  const { partnerId, locale: rawLocale } = await params;
  const locale = validateLocale(rawLocale);
  const data = await getPartnerPageData(partnerId, locale);

  if (!data) notFound();

  const { partner, hero, about, footer, features } = data;
  const dict = getDictionary(locale);
  const ctaText = hero?.cta_text ?? dict.contactForm.defaultCta;

  return (
    <>
      <GlobalNav partner={partner} locale={locale} />
      <main>
        <HeroSection content={hero} locale={locale} />
        <FeaturesSection content={features} />
        <AboutSection content={about} />
        <ContactForm partnerId={partnerId} ctaText={ctaText} />
      </main>
      <Footer partner={partner} content={footer} locale={locale} />
    </>
  );
}
