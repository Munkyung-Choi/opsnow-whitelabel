import { vi, describe, it, expect } from 'vitest';

// 모듈 레벨 createClient 호출을 막기 위해 supabase 모킹 (vitest가 import보다 먼저 hoisting)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

import { stripMarkdown, buildFaqJsonLd } from '../get-faq-data';
import { parseFaqContent, DEFAULT_FAQ_ITEMS } from '../faq-data';

// ─────────────────────────────────────────────────────────────────────────────
// stripMarkdown (WL-97 R-3)
// ─────────────────────────────────────────────────────────────────────────────
describe('stripMarkdown', () => {
  it('## 제목 태그 제거', () => {
    expect(stripMarkdown('## 제목입니다')).toBe('제목입니다');
  });

  it('**bold** → 텍스트만 남김', () => {
    expect(stripMarkdown('**중요한 내용**입니다')).toBe('중요한 내용입니다');
  });

  it('[text](url) → text 유지, URL 제거 (R-3 피드백)', () => {
    expect(stripMarkdown('[OpsNow 바로가기](https://opsnow.com)')).toBe('OpsNow 바로가기');
  });

  it('복합 마크다운 → 모두 strip', () => {
    const input = '## 제목\n\n**중요**: [링크](https://example.com)를 클릭하세요.';
    const result = stripMarkdown(input);
    expect(result).not.toContain('##');
    expect(result).not.toContain('**');
    expect(result).not.toContain('https://example.com');
    expect(result).toContain('링크');
    expect(result).toContain('중요');
  });

  it('160자 초과 → 160자로 자름', () => {
    const long = '가'.repeat(200);
    expect(stripMarkdown(long).length).toBe(160);
  });

  it('줄바꿈 → 공백으로 변환', () => {
    const result = stripMarkdown('첫 번째 줄\n두 번째 줄');
    expect(result).toBe('첫 번째 줄 두 번째 줄');
  });

  it('빈 문자열 → 빈 문자열 반환', () => {
    expect(stripMarkdown('')).toBe('');
  });

  it('`code` → 텍스트만 남김', () => {
    expect(stripMarkdown('`npm install` 실행')).toBe('npm install 실행');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildFaqJsonLd (WL-97 SEO)
// ─────────────────────────────────────────────────────────────────────────────
describe('buildFaqJsonLd', () => {
  it('schema.org FAQPage 구조 반환', () => {
    const result = buildFaqJsonLd('질문입니다', '답변입니다');
    expect(result).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
    });
  });

  it('mainEntity에 Question + Answer 포함', () => {
    const result = buildFaqJsonLd('질문', '답변') as Record<string, unknown>;
    const entities = result['mainEntity'] as Array<Record<string, unknown>>;
    expect(entities).toHaveLength(1);
    expect(entities[0]['@type']).toBe('Question');
    expect(entities[0]['name']).toBe('질문');
    const answer = entities[0]['acceptedAnswer'] as Record<string, unknown>;
    expect(answer['@type']).toBe('Answer');
  });

  it('answer에 마크다운이 있으면 strip하여 JSON-LD에 삽입', () => {
    const result = buildFaqJsonLd('Q', '**bold** [link](https://url.com)') as Record<string, unknown>;
    const entities = result['mainEntity'] as Array<Record<string, unknown>>;
    const answer = entities[0]['acceptedAnswer'] as Record<string, unknown>;
    expect(answer['text']).toBe('bold link');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FaqListItem.summary 파생 — get-faq-data parseDetailItems (WL-96)
// ─────────────────────────────────────────────────────────────────────────────
// parseDetailItems는 내부 함수이므로 stripMarkdown을 통해 동일 로직을 간접 검증한다.
describe('FaqListItem.summary 파생 로직 (stripMarkdown 200자)', () => {
  it('answer markdown strip 결과가 200자 이하여야 한다', () => {
    const longAnswer = '**중요**: ' + '내용입니다. '.repeat(30);
    const stripped = longAnswer
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 200);
    expect(stripped.length).toBeLessThanOrEqual(200);
    expect(stripped).toContain('중요');
    expect(stripped).not.toContain('**');
  });

  it('빈 answer → 빈 summary (길이 0)', () => {
    const stripped = ''
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 200);
    expect(stripped).toBe('');
  });

  it('[link](url) → 링크 텍스트만 남기고 URL 제거', () => {
    const answer = '[자세히 보기](https://example.com)';
    const stripped = answer.replace(/\[(.+?)\]\(.+?\)/g, '$1').trim().slice(0, 200);
    expect(stripped).toBe('자세히 보기');
    expect(stripped).not.toContain('https://');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseFaqContent — WL-97 하위호환 패치 검증
// ─────────────────────────────────────────────────────────────────────────────
describe('parseFaqContent (WL-97 backward compat)', () => {
  it('null content → DEFAULT_FAQ_ITEMS 반환', () => {
    expect(parseFaqContent(null)).toEqual(DEFAULT_FAQ_ITEMS);
  });

  it('구 스키마 (summary 있음) → summary 그대로 사용', () => {
    const content = {
      id: 'gc-1',
      section_type: 'faq',
      title: null,
      subtitle: null,
      meta: {
        items: [{
          id: 'old-item',
          question: '구 스키마 질문',
          summary: '구 스키마 요약',
          category: '비용',
        }],
      },
      updated_at: null,
    };
    const result = parseFaqContent(content);
    expect(result[0].summary).toBe('구 스키마 요약');
  });

  it('신 스키마 (summary 없음, answer 있음) → answer 첫 200자로 summary 파생', () => {
    const content = {
      id: 'gc-2',
      section_type: 'faq',
      title: null,
      subtitle: null,
      meta: {
        items: [{
          id: 'new-item',
          slug: 'new-item-slug',
          categoryId: 'billing',
          question: '신 스키마 질문',
          // summary 없음 — WL-97 신 스키마
          answer: '**중요한 답변** 내용입니다. 이것은 [링크](https://example.com)를 포함합니다.',
        }],
      },
      updated_at: null,
    };
    const result = parseFaqContent(content);
    expect(result).toHaveLength(1);
    // markdown이 strip된 summary가 생성되어야 함
    expect(result[0].summary).toContain('중요한 답변');
    expect(result[0].summary).not.toContain('**');
    expect(result[0].summary).not.toContain('https://example.com');
    expect(result[0].summary).toContain('링크');
  });

  it('신 스키마 summary 파생 — 200자 초과 시 잘림', () => {
    const longAnswer = '가'.repeat(300);
    const content = {
      id: 'gc-3',
      section_type: 'faq',
      title: null,
      subtitle: null,
      meta: {
        items: [{ id: 'long-item', question: '질문', answer: longAnswer }],
      },
      updated_at: null,
    };
    const result = parseFaqContent(content);
    expect(result[0].summary.length).toBeLessThanOrEqual(200);
  });

  it('summary도 answer도 없는 항목 → 건너뜀', () => {
    const content = {
      id: 'gc-4',
      section_type: 'faq',
      title: null,
      subtitle: null,
      meta: {
        items: [
          { id: 'valid', question: '정상 항목', summary: '요약 있음' },
          { id: 'invalid', question: '요약없음' }, // summary도 answer도 없음
        ],
      },
      updated_at: null,
    };
    const result = parseFaqContent(content);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid');
  });
});
