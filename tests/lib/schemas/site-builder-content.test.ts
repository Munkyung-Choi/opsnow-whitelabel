import { describe, it, expect } from 'vitest'
import {
  SECTION_FIELDS,
  EDITABLE_SECTION_TYPES,
  expandFieldNames,
  updateSectionContentSchema,
  type EditableSectionType,
  type FieldDef,
} from '@/lib/schemas/site-builder-content'

// WL-148 — SECTION_FIELDS vs Zod 스키마 키 일치 검증.
// 이 테스트가 깨지면 Server Action의 Zod parse가 form 입력을 받지 못해 런타임 500 유발.

/** Zod discriminatedUnion에서 주어진 section_type의 option 키들을 추출 */
function getZodKeysFor(sectionType: EditableSectionType): string[] {
  const options = updateSectionContentSchema.options
  const option = options.find((opt) => {
    const shape = opt.shape as Record<string, { value?: string }>
    return shape.section_type?.value === sectionType
  })
  if (!option) throw new Error(`Zod schema missing for ${sectionType}`)
  return Object.keys(option.shape).filter((k) => k !== 'section_type')
}

/** FieldDef[] → expandFieldNames 전체 집합 */
function expandAll(fields: FieldDef[]): string[] {
  return fields.flatMap(expandFieldNames)
}

describe('SECTION_FIELDS — WL-148 선언적 폼 SSOT', () => {
  it.each(EDITABLE_SECTION_TYPES)(
    '[%s] SECTION_FIELDS 정의 존재',
    (sectionType) => {
      expect(SECTION_FIELDS[sectionType]).toBeDefined()
      expect(SECTION_FIELDS[sectionType].length).toBeGreaterThan(0)
    }
  )

  it.each(EDITABLE_SECTION_TYPES)(
    '[%s] 모든 필드는 name·label·type을 가진다',
    (sectionType) => {
      for (const field of SECTION_FIELDS[sectionType]) {
        expect(field.name).toBeTruthy()
        expect(field.label).toBeTruthy()
        expect(['input', 'textarea', 'email']).toContain(field.type)
      }
    }
  )

  it.each(EDITABLE_SECTION_TYPES)(
    '[%s] i18n=true 필드는 previewKey를 명시한다 (프리뷰 key 충돌 방지)',
    (sectionType) => {
      for (const field of SECTION_FIELDS[sectionType]) {
        if (field.i18n) {
          expect(field.previewKey).toBeDefined()
        }
      }
    }
  )
})

describe('expandFieldNames() — FieldDef → form field name 생성', () => {
  it('i18n=true 필드는 name_ko + name_en 2개로 확장', () => {
    const field: FieldDef = {
      name: 'title',
      label: '제목',
      type: 'input',
      i18n: true,
    }
    expect(expandFieldNames(field)).toEqual(['title_ko', 'title_en'])
  })

  it('i18n=false 필드는 name 그대로 유지', () => {
    const field: FieldDef = {
      name: 'contact_email',
      label: '이메일',
      type: 'email',
      i18n: false,
    }
    expect(expandFieldNames(field)).toEqual(['contact_email'])
  })
})

describe('SECTION_FIELDS ↔ updateSectionContentSchema 키 일치 (SSOT 무결성)', () => {
  it.each(EDITABLE_SECTION_TYPES)(
    '[%s] SECTION_FIELDS 확장 form names이 Zod schema keys와 완전 일치',
    (sectionType) => {
      const fieldFormNames = new Set(expandAll(SECTION_FIELDS[sectionType]))
      const zodKeys = new Set(getZodKeysFor(sectionType))

      // FieldDef가 만드는 form name은 모두 Zod에 존재해야 한다 (parse 실패 방지)
      for (const name of fieldFormNames) {
        expect(
          zodKeys.has(name),
          `Zod schema for ${sectionType} is missing key: ${name}`
        ).toBe(true)
      }

      // Zod가 기대하는 모든 key가 FieldDef로 렌더되어야 한다 (필드 미렌더 방지)
      for (const key of zodKeys) {
        expect(
          fieldFormNames.has(key),
          `SECTION_FIELDS[${sectionType}] is missing field for Zod key: ${key}`
        ).toBe(true)
      }
    }
  )
})
