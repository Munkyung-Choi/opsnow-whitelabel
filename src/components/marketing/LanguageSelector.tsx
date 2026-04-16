'use client';

import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/locales';

/** 언어 코드 + 네이티브 표기 */
const LOCALE_META: Record<Locale, { code: string; native: string }> = {
  ko: { code: 'KO', native: '한국어' },
  en: { code: 'EN', native: 'English' },
  ja: { code: 'JA', native: '日本語' },
  zh: { code: 'ZH', native: '中文' },
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
  const available = SUPPORTED_LOCALES.filter((l) =>
    (publishedLocales ?? []).includes(l)
  );

  // 단일 언어 파트너 — 선택기 불필요
  if (available.length <= 1) return null;

  function handleChange(val: string) {
    // /api/set-locale → 서버사이드 Set-Cookie 후 / 리다이렉트
    // document.cookie 직접 설정은 미들웨어 타이밍 불일치로 locale 감지 실패
    window.location.href = `/api/set-locale?locale=${encodeURIComponent(val)}`;
  }

  const current = LOCALE_META[locale];

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger
        className="h-8 gap-1.5 border-none bg-transparent px-2 text-sm font-medium shadow-none focus:ring-0"
        aria-label="언어 선택"
      >
        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <SelectValue asChild>
          <span>{current.code}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[140px]">
        {available.map((loc) => {
          const meta = LOCALE_META[loc];
          return (
            <SelectItem key={loc} value={loc}>
              <span className="flex items-center gap-3">
                <span className="w-6 text-xs font-semibold text-muted-foreground">
                  {meta.code}
                </span>
                <span className="text-sm">{meta.native}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
