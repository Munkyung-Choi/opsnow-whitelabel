/**
 * [WL-58] 파트너명 템플릿 인터폴레이션 엔진
 *
 * 지원 문법:
 *   {PartnerName}        → partner.business_name 단순 치환
 *   {PartnerName:이/가}  → 종성 여부를 판단하여 조사를 선택 후 치환
 *
 * @warning 이 함수의 출력을 `dangerouslySetInnerHTML`에 직접 전달하지 마십시오.
 *          business_name이 HTML 특수문자를 포함할 경우 XSS 위험이 있습니다.
 *          React JSX {expression} 방식으로만 렌더링하십시오.
 */

import type { Json } from '@/types/supabase';

/** 영어 알파벳 중 한국어 발음 끝에 종성이 있는 글자 (L→엘, M→엠, N→엔, R→알) */
const ENGLISH_HAS_JONGSEONG: Readonly<Record<string, boolean>> = {
  L: true, M: true, N: true, R: true,
};

/** 숫자(0~9)의 한국어 발음(영·일·이·삼·사·오·육·칠·팔·구) 종성 여부 */
const DIGIT_HAS_JONGSEONG: Readonly<Record<string, boolean>> = {
  '0': false, // 영
  '1': true,  // 일 (ㄹ)
  '2': false, // 이
  '3': true,  // 삼 (ㅁ)
  '4': false, // 사
  '5': false, // 오
  '6': true,  // 육 (ㄱ)
  '7': true,  // 칠 (ㄹ)
  '8': true,  // 팔 (ㄹ)
  '9': false, // 구
};

/**
 * 파트너명 마지막 글자의 종성 여부를 분석하여 올바른 한국어 조사를 선택한다.
 *
 * 처리 우선순위:
 *   1. 한글 음절 (U+AC00~U+D7A3) — Unicode 종성 인덱스로 정확 판별
 *   2. 숫자 (0~9)                 — 한국어 발음(일이삼…) 기준 종성 여부 적용
 *   3. 영어 알파벳 (A~Z)          — 한국어 발음 기준 (L·M·N·R만 종성 있음)
 *   4. 기타 특수문자              — 보수적 기본값 (받침 있는 형) 적용
 *
 * @param name     - 파트너 상호명
 * @param josaPair - "받침O형/받침X형" 형식 (예: "이/가", "은/는", "을/를", "과/와", "으로/로")
 * @returns 선택된 조사 문자열
 */
export function selectJosa(name: string, josaPair: string): string {
  const parts = josaPair.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return josaPair;

  const [withJongseong, withoutJongseong] = parts as [string, string];

  if (!name || name.length === 0) return withJongseong; // 방어: 빈 문자열

  const lastChar = name[name.length - 1]!;
  const code = lastChar.charCodeAt(0);

  // 1. 한글 음절 (U+AC00 ~ U+D7A3)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jongseongIndex = (code - 0xac00) % 28;
    // "으로/로" 특수 처리: ㄹ 받침(index 8)은 "로" 사용
    if (josaPair === '으로/로' && jongseongIndex === 8) {
      return withoutJongseong;
    }
    return jongseongIndex !== 0 ? withJongseong : withoutJongseong;
  }

  // 2. 숫자 (0~9)
  if (lastChar >= '0' && lastChar <= '9') {
    return (DIGIT_HAS_JONGSEONG[lastChar] ?? false) ? withJongseong : withoutJongseong;
  }

  // 3. 영어 알파벳
  const upperLast = lastChar.toUpperCase();
  if (upperLast >= 'A' && upperLast <= 'Z') {
    return (ENGLISH_HAS_JONGSEONG[upperLast] ?? false) ? withJongseong : withoutJongseong;
  }

  // 4. 기타 (특수문자 등): 받침 있는 형 보수적 기본값
  return withJongseong;
}

/** {PartnerName} 또는 {PartnerName:조사쌍} 패턴. 조사쌍 최대 20자로 ReDoS 방어. */
const INTERPOLATION_RE = /\{PartnerName(?::([^}]{1,20}))?\}/g;

/**
 * 문자열 내 {PartnerName} / {PartnerName:조사쌍} 패턴을 파트너명으로 치환한다.
 *
 * @warning 반환값을 `dangerouslySetInnerHTML`에 사용하지 마십시오. (XSS 위험)
 */
export function interpolateString(template: string, businessName: string): string {
  // fast path: 플레이스홀더가 없으면 regex 실행 생략
  if (!template.includes('{PartnerName')) return template;
  return template.replace(INTERPOLATION_RE, (_, josaPair?: string) =>
    josaPair ? businessName + selectJosa(businessName, josaPair) : businessName,
  );
}

/**
 * JSON 구조(문자열·배열·객체)를 재귀 탐색하여 모든 문자열에 인터폴레이션을 적용한다.
 * - 최대 탐색 깊이: 10 (깊은 중첩 방어)
 * - Prototype pollution 방어: __proto__ / constructor / prototype 키 건너뜀
 *
 * @warning 반환값을 `dangerouslySetInnerHTML`에 사용하지 마십시오. (XSS 위험)
 */
export function interpolateJson(
  value: Json | null | undefined,
  businessName: string,
  depth = 0,
): Json | null {
  if (value === null || value === undefined) return null;
  if (depth > 10) return value;

  if (typeof value === 'string') {
    return interpolateString(value, businessName);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      interpolateJson(item as Json, businessName, depth + 1),
    ) as Json[];
  }

  if (typeof value === 'object') {
    const result: Record<string, Json | null> = {};
    for (const key of Object.keys(value)) {
      // Prototype pollution 방어
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      result[key] = interpolateJson(
        (value as Record<string, Json | undefined>)[key] ?? null,
        businessName,
        depth + 1,
      );
    }
    return result as unknown as Json;
  }

  // number | boolean: 그대로 반환
  return value;
}
