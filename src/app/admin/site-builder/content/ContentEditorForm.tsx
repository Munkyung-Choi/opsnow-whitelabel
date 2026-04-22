'use client'

import { useActionState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { updatePartnerContent } from './actions'
import { usePreviewBridge } from './_hooks/use-preview-bridge'
import { useFormDirty } from './_hooks/use-form-dirty'
import SectionFormRenderer from './_components/SectionFormRenderer'
import {
  SECTION_FIELDS,
  type ContentEditFormState,
  type EditableSectionType,
} from '@/lib/schemas/site-builder-content'

interface SectionData {
  section_type: EditableSectionType
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
  sections: SectionData[]
  subdomain: string
  defaultLocale: string
}

const SECTION_LABELS: Record<EditableSectionType, string> = {
  hero: '히어로',
  contact: '문의',
}

const SECTION_ORDER: EditableSectionType[] = ['hero', 'contact']

const initialState: ContentEditFormState = {}

export default function ContentEditorForm({ sections, subdomain, defaultLocale }: Props) {
  const { iframeRef, previewUrl, sendPreview } = usePreviewBridge(subdomain, defaultLocale)
  const [heroState, heroAction, heroIsPending] = useActionState(updatePartnerContent, initialState)
  const [contactState, contactAction, contactIsPending] = useActionState(updatePartnerContent, initialState)

  const heroDirty = useFormDirty()
  const contactDirty = useFormDirty()

  const sectionData: Record<EditableSectionType, SectionData | undefined> = {
    hero: sections.find((s) => s.section_type === 'hero'),
    contact: sections.find((s) => s.section_type === 'contact'),
  }

  const sectionRuntime: Record<
    EditableSectionType,
    {
      action: typeof heroAction
      isPending: boolean
      state: ContentEditFormState
      dirty: ReturnType<typeof useFormDirty>
    }
  > = {
    hero: { action: heroAction, isPending: heroIsPending, state: heroState, dirty: heroDirty },
    contact: {
      action: contactAction,
      isPending: contactIsPending,
      state: contactState,
      dirty: contactDirty,
    },
  }

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* 좌: 섹션 편집 */}
      <div className="w-[480px] shrink-0 overflow-y-auto">
        <Tabs defaultValue="hero">
          <TabsList className="mb-6">
            {SECTION_ORDER.map((type) => (
              <TabsTrigger key={type} value={type} data-testid={`section-tab-${type}`}>
                <span className="inline-flex items-center gap-1.5">
                  {SECTION_LABELS[type]}
                  {sectionRuntime[type].dirty.dirty && (
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full bg-primary"
                      aria-label="수정 중"
                      data-testid={`section-dirty-${type}`}
                    />
                  )}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {SECTION_ORDER.map((type) => {
            const runtime = sectionRuntime[type]
            return (
              <TabsContent key={type} value={type}>
                <SectionFormRenderer
                  sectionType={type}
                  section={sectionData[type]}
                  fields={SECTION_FIELDS[type]}
                  action={runtime.action}
                  isPending={runtime.isPending}
                  state={runtime.state}
                  sendPreview={sendPreview}
                  onFieldChange={runtime.dirty.markDirty}
                  onSaveSuccess={runtime.dirty.markClean}
                />
              </TabsContent>
            )
          })}
        </Tabs>
      </div>

      {/* 우: iframe 미리보기 */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <p className="text-xs text-muted-foreground shrink-0">미리보기</p>
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="flex-1 w-full rounded border border-border bg-background"
          title="마케팅 사이트 미리보기"
          data-testid="preview-iframe"
        />
      </div>
    </div>
  )
}
