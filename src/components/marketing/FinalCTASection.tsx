import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import type { Locale } from '@/lib/i18n/locales';
import ContactFormMain from '@/components/marketing/ContactFormMain';

interface Props {
  content: LocalizedContentRow | null;
  partnerId: string;
  locale: Locale;
}

export default function FinalCTASection({ content: _content, partnerId, locale }: Props) {
  // WL-80: ContactFormMain으로 교체 — 2-column 풀 디자인 적용.
  // DB content override는 WL-80 범위 외 (추후 DB 연동 시 확장).
  return <ContactFormMain partnerId={partnerId} locale={locale} />;
}
