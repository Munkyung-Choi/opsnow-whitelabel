import { z } from 'zod'

export const EDITABLE_SECTION_TYPES = ['hero', 'about', 'contact'] as const
export type EditableSectionType = (typeof EDITABLE_SECTION_TYPES)[number]

export const updateSectionContentSchema = z.object({
  section_type: z.enum(EDITABLE_SECTION_TYPES),
  title_ko: z.string().min(1, '한국어 제목을 입력하세요.'),
  title_en: z.string(),
  subtitle_ko: z.string().optional(),
  subtitle_en: z.string().optional(),
  body_ko: z.string().optional(),
  body_en: z.string().optional(),
})

export const togglePublishSchema = z.object({
  section_type: z.enum(EDITABLE_SECTION_TYPES),
  is_published: z.enum(['true', 'false']).transform((v) => v === 'true'),
})

export interface ContentEditFormState {
  ok?: boolean
  error?: string
  fieldErrors?: {
    section_type?: string
    title_ko?: string
  }
}

export interface PublishToggleState {
  ok?: boolean
  error?: string
}

/** contents 테이블 title/subtitle/body는 JSONB 컬럼 — object 또는 JSON string 양쪽 처리 */
export function parseI18nField(raw: unknown): { ko: string; en: string } {
  if (raw === null || raw === undefined) return { ko: '', en: '' }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    return { ko: String(obj.ko ?? ''), en: String(obj.en ?? '') }
  }
  if (typeof raw === 'string') {
    if (!raw) return { ko: '', en: '' }
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return { ko: String(parsed.ko ?? ''), en: String(parsed.en ?? '') }
      }
    } catch {}
    return { ko: raw, en: '' }
  }
  return { ko: '', en: '' }
}
