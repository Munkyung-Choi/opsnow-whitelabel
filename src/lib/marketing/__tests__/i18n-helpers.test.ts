import { describe, it, expect, vi } from 'vitest';

// get-partner-page-data가 모듈 레벨에서 supabase 클라이언트를 초기화하므로 mock 필요
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }));
vi.mock('@/services/partnerService', () => ({ validatePartner: vi.fn() }));

import { extractI18n, deepLocalizeJson } from '../get-partner-page-data';

// ─────────────────────────────────────────────────────────────────────────────
// extractI18n — extractFromObj 폴백 체인 포함
// ─────────────────────────────────────────────────────────────────────────────
describe('extractI18n', () => {
  describe('null / undefined 입력', () => {
    it('null → null', () => {
      expect(extractI18n(null, 'ko')).toBeNull();
    });
    it('undefined → null', () => {
      expect(extractI18n(undefined, 'ko')).toBeNull();
    });
  });

  describe('plain string 입력', () => {
    it('일반 문자열 → 그대로 반환', () => {
      expect(extractI18n('hello', 'ko')).toBe('hello');
    });
    it('빈 문자열 → 빈 문자열 그대로 반환', () => {
      expect(extractI18n('', 'ko')).toBe('');
    });
    it('{ 로 시작하지 않는 문자열 → JSON 파싱 시도 안 함', () => {
      expect(extractI18n('not json', 'ko')).toBe('not json');
    });
    it('malformed JSON 문자열({ 로 시작) → 파싱 실패 시 plain string 반환', () => {
      expect(extractI18n('{invalid json}', 'ko')).toBe('{invalid json}');
    });
  });

  describe('JSON-shaped 문자열 (DB TEXT 컬럼)', () => {
    it('JSON 문자열 i18n 객체 → locale 값 추출', () => {
      expect(extractI18n('{"ko":"한국어","en":"english"}', 'ko')).toBe('한국어');
    });
    it('JSON 문자열 — locale 키 빈 문자열 → en 폴백', () => {
      expect(extractI18n('{"ko":"","en":"hello"}', 'ko')).toBe('hello');
    });
    it('JSON 문자열 — ko/en 모두 빈 문자열 → 원본 JSON 문자열 반환 (extractFromObj null → ?? value fallback)', () => {
      // 모든 locale 값이 빈 문자열이면 extractFromObj가 null을 반환하고,
      // extractI18n의 `?? value` fallback이 원본 문자열을 그대로 반환한다.
      expect(extractI18n('{"ko":"","en":""}', 'ko')).toBe('{"ko":"","en":""}');
    });
  });

  describe('객체 입력 — extractFromObj 폴백 체인', () => {
    it('locale 키 존재 → 해당 값 반환', () => {
      expect(extractI18n({ ko: '한국어', en: 'english' }, 'en')).toBe('english');
    });
    it('locale 키 빈 문자열 → ko 폴백', () => {
      expect(extractI18n({ ko: '한국어', en: '' }, 'en')).toBe('한국어');
    });
    it('locale 키 없음 → ko 폴백', () => {
      expect(extractI18n({ ko: '한국어' }, 'ja')).toBe('한국어');
    });
    it('locale·ko 없음 → en 폴백', () => {
      expect(extractI18n({ en: 'english' }, 'ja')).toBe('english');
    });
    it('locale·ko·en 없음 → 첫 번째 string 값 반환', () => {
      expect(extractI18n({ ja: '日本語', zh: '中文' }, 'ko')).toBe('日本語');
    });
    it('모든 locale 키가 빈 문자열 → null', () => {
      expect(extractI18n({ ko: '', en: '', ja: '' }, 'ko')).toBeNull();
    });
    it('배열 입력 → null', () => {
      expect(extractI18n(['ko', 'en'] as unknown as null, 'ko')).toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deepLocalizeJson — 재귀 순회 + i18n 탐지
// ─────────────────────────────────────────────────────────────────────────────
describe('deepLocalizeJson', () => {
  describe('스칼라 통과', () => {
    it('string → 그대로', () => {
      expect(deepLocalizeJson('hello', 'ko')).toBe('hello');
    });
    it('number → 그대로', () => {
      expect(deepLocalizeJson(42, 'ko')).toBe(42);
    });
    it('null → null', () => {
      expect(deepLocalizeJson(null, 'ko')).toBeNull();
    });
    it('boolean → 그대로', () => {
      expect(deepLocalizeJson(true, 'ko')).toBe(true);
    });
  });

  describe('i18n 객체 탐지 및 추출', () => {
    it('ko locale → ko 값 반환', () => {
      expect(deepLocalizeJson({ ko: '한국어', en: 'english' }, 'ko')).toBe('한국어');
    });
    it('en locale → en 값 반환', () => {
      expect(deepLocalizeJson({ ko: '한국어', en: 'english' }, 'en')).toBe('english');
    });
    it('locale 키 빈 문자열 → en 폴백', () => {
      expect(deepLocalizeJson({ ko: '', en: 'hello' }, 'ko')).toBe('hello');
    });
    it('locale·ko 없음 → en 폴백', () => {
      expect(deepLocalizeJson({ en: 'english' }, 'ja')).toBe('english');
    });
  });

  describe('배열 순회', () => {
    it('i18n 객체 배열 → 각 항목 추출', () => {
      const input = [
        { ko: '첫 번째', en: 'first' },
        { ko: '두 번째', en: 'second' },
      ];
      expect(deepLocalizeJson(input, 'ko')).toEqual(['첫 번째', '두 번째']);
    });
    it('mixed 배열 (스칼라 + i18n 객체) → 각각 처리', () => {
      const input = ['plain', { ko: '한국어', en: 'english' }, 42];
      expect(deepLocalizeJson(input, 'ko')).toEqual(['plain', '한국어', 42]);
    });
    it('빈 배열 → 빈 배열', () => {
      expect(deepLocalizeJson([], 'ko')).toEqual([]);
    });
  });

  describe('중첩 객체 재귀 처리', () => {
    it('1레벨 중첩 i18n — 각 필드 추출', () => {
      const input = {
        title: { ko: '제목', en: 'title' },
        label: { ko: '라벨', en: 'label' },
      };
      expect(deepLocalizeJson(input, 'ko')).toEqual({ title: '제목', label: '라벨' });
    });
    it('2레벨 중첩 i18n — 재귀 추출', () => {
      const input = {
        title: { ko: '제목', en: 'title' },
        nested: {
          inner: { ko: '내부', en: 'inner' },
        },
      };
      expect(deepLocalizeJson(input, 'ko')).toEqual({
        title: '제목',
        nested: { inner: '내부' },
      });
    });
    it('일반 객체(i18n 아님) + i18n 혼합 — 일반 객체 순회, i18n 추출', () => {
      const input = {
        id: 'item-1',
        name: { ko: '이름', en: 'name' },
        count: 5,
      };
      expect(deepLocalizeJson(input, 'en')).toEqual({ id: 'item-1', name: 'name', count: 5 });
    });
    it('중첩 배열 내 i18n 객체 — 재귀 추출', () => {
      const input = {
        items: [
          { label: { ko: '라벨1', en: 'label1' } },
          { label: { ko: '라벨2', en: 'label2' } },
        ],
      };
      expect(deepLocalizeJson(input, 'ko')).toEqual({
        items: [{ label: '라벨1' }, { label: '라벨2' }],
      });
    });
  });

  describe('depth 제한 (> 10)', () => {
    it('depth 10 초과 시 원본 반환', () => {
      // depth를 직접 11로 전달하면 재귀 없이 value를 그대로 반환
      const input = { ko: '한국어', en: 'english' };
      expect(deepLocalizeJson(input, 'ko', 11)).toBe(input);
    });
  });
});
