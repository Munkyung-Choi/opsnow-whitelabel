'use client';

import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/locales';

/** 표시 레이블 — 네이티브 언어로 표기 */
const LOCALE_LABEL: Record<Locale, string> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JA',
  zh: 'ZH',
};

interface LanguageSelectorProps {
  locale: Locale;
  /** partners.published_locales — null이면 단일 언어로 간주 */
  publishedLocales: string[] | null;
  /** partners.id (UUID) — 로케일 전환 URL 구성에 사용 */
  partnerId: string;
}

/**
 * 파트너의 published_locales 기준으로 언어 전환 Select를 렌더링한다.
 * 발행된 언어가 1개 이하면 숨김 처리한다.
 *
 * URL 패턴: /{partnerId}/{locale}
 */
export function LanguageSelector({ locale, publishedLocales, partnerId }: LanguageSelectorProps) {
  const router = useRouter();

  const available = SUPPORTED_LOCALES.filter((l) =>
    (publishedLocales ?? []).includes(l)
  );

  // 단일 언어 파트너 — 선택기 불필요
  if (available.length <= 1) return null;

  return (
    <Select
      value={locale}
      onValueChange={(val) => router.push(`/${partnerId}/${val}`)}
    >
      <SelectTrigger
        className="h-8 w-[60px] border-none bg-transparent text-sm font-medium shadow-none focus:ring-0"
        aria-label="언어 선택"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {available.map((loc) => (
          <SelectItem key={loc} value={loc}>
            {LOCALE_LABEL[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
