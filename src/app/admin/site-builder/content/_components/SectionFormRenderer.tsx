'use client'

import { useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import PublishToggle from '../PublishToggle'
import type {
  ContentEditFormState,
  EditableSectionType,
  FieldDef,
} from '@/lib/schemas/site-builder-content'

// WL-148 — 선언적 섹션 폼 렌더러.
// FieldDef[] 배열을 순회하며 i18n 필드(ko/en 탭)와 plain 필드(탭 바깥)를 자동 분리 렌더.
// `if (sectionType === 'hero')` 같은 조건 분기 0.

interface SectionData {
  title_ko: string
  title_en: string
  subtitle_ko: string
  subtitle_en: string
  body_ko: string
  body_en: string
  contact_email: string
  contact_phone: string
  contact_address: string
  is_published: boolean
}

interface Props {
  sectionType: EditableSectionType
  section: SectionData | undefined
  fields: FieldDef[]
  action: (payload: FormData) => void
  isPending: boolean
  state: ContentEditFormState
  sendPreview: (section: string, fields: Record<string, string>) => void
  onFieldChange?: () => void
  onSaveSuccess?: () => void
}

const DEFAULT_TEXTAREA_ROWS = 3

/** i18n 필드 + locale → form field key (예: title + ko → title_ko) */
function i18nFieldKey(name: string, locale: 'ko' | 'en'): string {
  return `${name}_${locale}`
}

export default function SectionFormRenderer({
  sectionType,
  section,
  fields,
  action,
  isPending,
  state,
  sendPreview,
  onFieldChange,
  onSaveSuccess,
}: Props) {
  // state.ok가 true로 전이되면 저장 성공 콜백 트리거 (dirty dot 해제용)
  useEffect(() => {
    if (state.ok && onSaveSuccess) onSaveSuccess()
  }, [state.ok, onSaveSuccess])

  if (!section) {
    return (
      <div className="py-8 text-sm text-muted-foreground">
        이 섹션의 콘텐츠가 없습니다. DB 트리거로 자동 초기화되지 않은 경우 관리자에게 문의하세요.
      </div>
    )
  }

  const i18nFields = fields.filter((f): f is FieldDef & { i18n: true } => f.i18n)
  const plainFields = fields.filter((f): f is FieldDef & { i18n: false } => !f.i18n)

  /** sendPreview 호출 시 `${sectionType}.${previewKey ?? name}` prefix 자동 부착 */
  function emitPreview(field: FieldDef, value: string) {
    const key = `${sectionType}.${field.previewKey ?? field.name}`
    sendPreview(sectionType, { [key]: value })
  }

  function handleChange(field: FieldDef, value: string) {
    emitPreview(field, value)
    onFieldChange?.()
  }

  function renderI18nField(field: FieldDef & { i18n: true }, locale: 'ko' | 'en') {
    const fieldKey = i18nFieldKey(field.name, locale)
    const defaultValue = section![fieldKey as keyof SectionData] as string
    const label = locale === 'en' ? field.labelEn ?? field.label : field.label
    const placeholder = locale === 'en' ? field.placeholderEn : field.placeholder
    const testid = `${sectionType}-${field.name}-${locale}`
    const id = `${sectionType}-${field.name}-${locale}`

    return (
      <div key={fieldKey} className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        {field.type === 'textarea' ? (
          <Textarea
            id={id}
            name={fieldKey}
            defaultValue={defaultValue}
            placeholder={placeholder}
            rows={field.rows ?? DEFAULT_TEXTAREA_ROWS}
            onChange={(e) => handleChange(field, e.target.value)}
            data-testid={testid}
          />
        ) : (
          <Input
            id={id}
            name={fieldKey}
            type={field.type === 'email' ? 'email' : 'text'}
            defaultValue={defaultValue}
            placeholder={placeholder}
            onChange={(e) => handleChange(field, e.target.value)}
            data-testid={testid}
          />
        )}
        {/* title_ko 필드에만 Zod 에러 메시지 바인딩 — 현재 스키마상 유일한 required 필드 */}
        {fieldKey === 'title_ko' && state.fieldErrors?.title_ko && (
          <p className="text-xs text-destructive" role="alert">
            {state.fieldErrors.title_ko}
          </p>
        )}
      </div>
    )
  }

  function renderPlainField(field: FieldDef & { i18n: false }) {
    const defaultValue = section![field.name as keyof SectionData] as string
    const id = `${sectionType}-${field.name}`
    const commonProps = {
      id,
      name: field.name,
      defaultValue,
      placeholder: field.placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleChange(field, e.target.value),
      ...(field.testid ? { 'data-testid': field.testid } : {}),
    }

    return (
      <div key={field.name} className="space-y-1.5">
        <Label htmlFor={id}>{field.label}</Label>
        {field.type === 'textarea' ? (
          <Textarea {...commonProps} rows={field.rows ?? DEFAULT_TEXTAREA_ROWS} />
        ) : (
          <Input {...commonProps} type={field.type === 'email' ? 'email' : 'text'} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 발행 상태 — 별도 form (PublishToggle 자체 form과 중첩 방지) */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <span className="text-sm font-medium text-foreground">발행 상태</span>
        <PublishToggle sectionType={sectionType} isPublished={section.is_published} />
      </div>

      {/* 콘텐츠 편집 form */}
      <form action={action} className="space-y-6">
        <input type="hidden" name="section_type" value={sectionType} />

        {/* i18n 필드 — ko/en 탭 */}
        {i18nFields.length > 0 && (
          <Tabs defaultValue="ko">
            <TabsList>
              <TabsTrigger value="ko">한국어</TabsTrigger>
              <TabsTrigger value="en">English</TabsTrigger>
            </TabsList>

            <TabsContent
              value="ko"
              forceMount
              className="space-y-4 pt-4 data-[state=inactive]:hidden"
            >
              {i18nFields.map((f) => renderI18nField(f, 'ko'))}
            </TabsContent>
            <TabsContent
              value="en"
              forceMount
              className="space-y-4 pt-4 data-[state=inactive]:hidden"
            >
              {i18nFields.map((f) => renderI18nField(f, 'en'))}
            </TabsContent>
          </Tabs>
        )}

        {/* plain 필드 — 탭 바깥 공통 영역 */}
        {plainFields.length > 0 && (
          <div className="space-y-4 pt-2">{plainFields.map((f) => renderPlainField(f))}</div>
        )}

        {/* 피드백 메시지 */}
        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="text-sm text-primary" role="status">
            저장되었습니다.
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="min-w-24"
          data-testid={`save-${sectionType}`}
        >
          {isPending ? '저장 중...' : '저장'}
        </Button>
      </form>
    </div>
  )
}
