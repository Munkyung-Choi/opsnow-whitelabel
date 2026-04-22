import { z } from 'zod'

export const EDITABLE_SECTION_TYPES = ['hero', 'contact'] as const
export type EditableSectionType = (typeof EDITABLE_SECTION_TYPES)[number]

const HeroContentSchema = z.object({
  section_type: z.literal('hero'),
  title_ko: z.string().min(1, '한국어 제목을 입력하세요.'),
  title_en: z.string(),
  subtitle_ko: z.string(),
  subtitle_en: z.string(),
})

const ContactContentSchema = z.object({
  section_type: z.literal('contact'),
  title_ko: z.string().min(1, '한국어 제목을 입력하세요.'),
  title_en: z.string(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_address: z.string().optional(),
})

export const updateSectionContentSchema = z.discriminatedUnion('section_type', [
  HeroContentSchema,
  ContactContentSchema,
])

export type UpdateSectionContentInput = z.infer<typeof updateSectionContentSchema>

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

// ── WL-148 선언적 폼 SSOT — FieldDef + SECTION_FIELDS ────────────────────────
// UI 메타(label, placeholder, testid, previewKey)와 Zod 스키마는 별개지만
// 동일 파일에서 관리한다. Zod가 form name 계약(`title_ko`, `subtitle_ko`,
// `contact_email` 등)을 소유하고, SECTION_FIELDS는 해당 name을 생성하는
// 규칙을 선언한다. Unit test로 양측 키 일치를 강제한다.

export type FieldType = 'input' | 'textarea' | 'email'

interface BaseFieldDef {
  /**
   * i18n=true: 'title' → form name 'title_ko' / 'title_en' 자동 확장
   * i18n=false: 'contact_email' → form name 그대로
   */
  name: string
  label: string
  /** en 탭용 label. 없으면 label 재사용. */
  labelEn?: string
  type: FieldType
  placeholder?: string
  placeholderEn?: string
  /** textarea 전용. 기본 3 */
  rows?: number
  /**
   * sendPreview 호출 시 key suffix. 미지정 시 name 사용.
   * 최종 key: `${sectionType}.${previewKey ?? name}`
   */
  previewKey?: string
  /** i18n=false 필드에만 사용 — 명시적 testid */
  testid?: string
}

export type FieldDef =
  | (BaseFieldDef & { i18n: true })
  | (BaseFieldDef & { i18n: false })

export const SECTION_FIELDS: Record<EditableSectionType, FieldDef[]> = {
  hero: [
    {
      name: 'title',
      label: '제목',
      labelEn: 'Title',
      type: 'input',
      placeholder: '한국어 제목',
      placeholderEn: 'English title',
      i18n: true,
      previewKey: 'title',
    },
    {
      name: 'subtitle',
      label: '부제목',
      labelEn: 'Subtitle',
      type: 'textarea',
      placeholder: '한국어 부제목',
      placeholderEn: 'English subtitle',
      rows: 3,
      i18n: true,
      previewKey: 'subtitle',
    },
  ],
  contact: [
    {
      name: 'title',
      label: '제목',
      labelEn: 'Title',
      type: 'input',
      placeholder: '한국어 제목',
      placeholderEn: 'English title',
      i18n: true,
      previewKey: 'title',
    },
    {
      name: 'contact_email',
      label: '이메일',
      type: 'email',
      placeholder: 'contact@example.com',
      i18n: false,
      testid: 'contact-email',
    },
    {
      name: 'contact_phone',
      label: '전화번호',
      type: 'input',
      placeholder: '02-1234-5678',
      i18n: false,
    },
    {
      name: 'contact_address',
      label: '주소',
      type: 'input',
      placeholder: '서울시 강남구 ...',
      i18n: false,
    },
  ],
}

/**
 * FieldDef에서 실제 form field name을 생성한다.
 * i18n=true → ['name_ko', 'name_en'], i18n=false → [name]
 */
export function expandFieldNames(field: FieldDef): string[] {
  if (field.i18n) return [`${field.name}_ko`, `${field.name}_en`]
  return [field.name]
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
