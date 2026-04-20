import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import type { Locale } from '@/lib/i18n/locales';
import ContactFormMain from '@/components/marketing/ContactFormMain';

interface Props {
  content: LocalizedContentRow | null;
  locale: Locale;
}

export default function FinalCTASection({ content: _content, locale }: Props) {
  return <ContactFormMain locale={locale} />;
}
