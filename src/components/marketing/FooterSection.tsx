import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/proxy';
import type { FooterCorporateInfo } from '@/lib/marketing/parsers';

interface CorporateInfoProps {
  corporate: FooterCorporateInfo;
  locale: Locale;
}

// WL-81: copyright는 Footer.tsx에서 단일 출처로 관리 — 여기서 중복 렌더링 금지
export default function CorporateInfo({ corporate, locale }: CorporateInfoProps) {
  const t = getDictionary(locale).corporate;

  return (
    <div className="text-[11px] leading-relaxed text-background/40">
      <span>{t.companyName}: {corporate.companyName}</span>
      {corporate.representative && (
        <span> | {t.representative}: {corporate.representative}</span>
      )}
      {corporate.registrationNumber && (
        <span> | {t.registrationNumber}: {corporate.registrationNumber}</span>
      )}
    </div>
  );
}
