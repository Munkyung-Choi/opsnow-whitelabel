import { describe, it, expect } from 'vitest'
import {
  parseI18nField,
  updateSectionContentSchema,
} from '../site-builder-content'

describe('parseI18nField', () => {
  it('JSON {ko, en} 객체 → {ko, en} 반환', () => {
    expect(parseI18nField({ ko: '안녕', en: 'Hello' })).toEqual({ ko: '안녕', en: 'Hello' })
  })

  it('JSON 문자열 {"ko","en"} → {ko, en} 반환', () => {
    expect(parseI18nField('{"ko":"안녕","en":"Hello"}')).toEqual({ ko: '안녕', en: 'Hello' })
  })

  it('plain string → {ko: string, en: ""} fallback', () => {
    expect(parseI18nField('클라우드는 혁신적입니다.')).toEqual({
      ko: '클라우드는 혁신적입니다.',
      en: '',
    })
  })

  it('null → {ko: "", en: ""}', () => {
    expect(parseI18nField(null)).toEqual({ ko: '', en: '' })
  })

  it('undefined → {ko: "", en: ""}', () => {
    expect(parseI18nField(undefined)).toEqual({ ko: '', en: '' })
  })

  it('빈 문자열 → {ko: "", en: ""}', () => {
    expect(parseI18nField('')).toEqual({ ko: '', en: '' })
  })

  it('JSON 배열 문자열 (stats body) → plain string fallback', () => {
    const arrayStr = '[{"value":"30%","label":"비용절감"}]'
    expect(parseI18nField(arrayStr)).toEqual({ ko: arrayStr, en: '' })
  })

  it('ko 없는 객체 → ko=""', () => {
    expect(parseI18nField({ en: 'Only English' })).toEqual({ ko: '', en: 'Only English' })
  })
})

describe('updateSectionContentSchema', () => {
  it('유효한 hero 데이터 통과', () => {
    const result = updateSectionContentSchema.safeParse({
      section_type: 'hero',
      title_ko: '제목',
      title_en: 'Title',
      subtitle_ko: '부제목',
      subtitle_en: 'Subtitle',
    })
    expect(result.success).toBe(true)
  })

  it('title_ko 빈 값 → fieldErrors', () => {
    const result = updateSectionContentSchema.safeParse({
      section_type: 'hero',
      title_ko: '',
      title_en: '',
      subtitle_ko: '부제목',
      subtitle_en: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title_ko).toBeDefined()
    }
  })

  it('section_type enum 외 값 → 에러', () => {
    const result = updateSectionContentSchema.safeParse({
      section_type: 'stats',
      title_ko: '제목',
      title_en: '',
    })
    expect(result.success).toBe(false)
  })

  it('contact section_type — contact 필드 포함 시 통과', () => {
    const result = updateSectionContentSchema.safeParse({
      section_type: 'contact',
      title_ko: '문의',
      title_en: 'Contact',
      contact_email: 'hello@example.com',
      contact_phone: '02-1234-5678',
      contact_address: '서울시',
    })
    expect(result.success).toBe(true)
  })

  it('contact section_type — contact 필드 없어도 통과 (optional)', () => {
    const result = updateSectionContentSchema.safeParse({
      section_type: 'contact',
      title_ko: '문의',
      title_en: '',
    })
    expect(result.success).toBe(true)
  })

  it('hero 파싱 결과에 subtitle_ko/en 존재, body_ko 미존재', () => {
    const result = updateSectionContentSchema.safeParse({
      section_type: 'hero',
      title_ko: '제목',
      title_en: '',
      subtitle_ko: '부제목',
      subtitle_en: '',
      body_ko: '무시되어야 함',
    })
    expect(result.success).toBe(true)
    if (result.success && result.data.section_type === 'hero') {
      expect(result.data.subtitle_ko).toBe('부제목')
      expect('body_ko' in result.data).toBe(false)
    }
  })

})
