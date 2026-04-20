import type { Locale } from '@/lib/i18n/locales';
import ContactFormMain from '@/components/marketing/ContactFormMain';

interface Props {
  locale: Locale;
}

export default function FinalCTASection({ locale }: Props) {
  return <ContactFormMain locale={locale} />;
}
