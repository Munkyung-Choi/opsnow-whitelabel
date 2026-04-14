import type { Locale } from '@/lib/i18n/locales';
import ko from '@/i18n/ko.json';
import en from '@/i18n/en.json';
import zh from '@/i18n/zh.json';
import ja from '@/i18n/ja.json';

// [WL-71] 새 언어 추가 시 locales.ts + 이 dictionaries 객체에 등록하면 완료됩니다.
const dictionaries: Record<Locale, typeof ko> = { ko, en, zh, ja };

/** next-intl 도입 시 이 타입을 기준으로 Messages 타입을 구성하면 된다. */
export type Dictionary = typeof ko;

/**
 * locale에 맞는 정적 UI 사전을 반환한다.
 * 서버/클라이언트 컴포넌트 모두에서 호출 가능 (동기, 경량).
 * DB 콘텐츠 추출에는 extractI18n (get-partner-page-data)을 사용하라.
 */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
