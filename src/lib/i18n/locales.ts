/**
 * [WL-71] 다국어 중앙 등록소 (Single Source of Truth for locale config).
 *
 * 새 언어 추가 절차:
 *  1. SUPPORTED_LOCALES 배열에 언어 코드 추가 (예: 'da')
 *  2. COUNTRY_LOCALE_MAP 에 해당 국가 코드 추가 (예: DK: 'da')
 *  3. src/i18n/{locale}.json 번역 파일 생성 (ko.json 키 구조 준수)
 *  4. src/lib/i18n/dictionary.ts 에 import + dictionaries 객체에 등록
 *
 * proxy.ts 와 dictionary.ts 는 이 파일에서 locale 정의를 가져오므로
 * 두 파일을 별도로 수정할 필요가 없습니다.
 */

// ─── Supported Locale List ────────────────────────────────────────────────────
// 1차 범위: ko, en, zh(간체), ja
// 추후 확장: 이 배열에 추가하고 위 절차를 따르면 됩니다.
export const SUPPORTED_LOCALES = ['ko', 'en', 'zh', 'ja'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

// ─── Country → Locale Mapping (Vercel x-vercel-ip-country) ───────────────────
// 미매핑 국가 코드는 호출부에서 'en' 으로 폴백됩니다.
// 참고: SG(싱가포르)는 중국어 화자 비율 고려하여 'zh' 매핑.
export const COUNTRY_LOCALE_MAP: Partial<Record<string, Locale>> = {
  KR: 'ko',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  MO: 'zh',
  SG: 'zh',
  JP: 'ja',
};

// ─── Locale Validation ────────────────────────────────────────────────────────
// 허용되지 않은 값은 기본값(ko)으로 강제합니다.
export function validateLocale(raw: string | null | undefined): Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw ?? '')
    ? (raw as Locale)
    : 'ko';
}
