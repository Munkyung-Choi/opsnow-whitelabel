import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/proxy';

interface CorporateInfoProps {
  companyName: string;
  representative: string;
  address: string;
  registrationNumber: string;
  locale: Locale;
}

export default function CorporateInfo({ locale, ...data }: CorporateInfoProps) {
  const t = getDictionary(locale).corporate;

  return (
    <footer className="opacity-60 text-[11px] leading-[1.2]">
      <div>
        {t.companyName}: {data.companyName} | {t.representative}: {data.representative}
      </div>
      <div>
        {t.address}: {data.address}
      </div>
      <div>
        {t.registrationNumber}: {data.registrationNumber}
      </div>
      <p>
        © {new Date().getFullYear()} {data.companyName}. All rights reserved.
      </p>
    </footer>
  );
}
