'use client'

import { useActionState, useRef, useCallback, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { updatePartnerContent } from './actions'
import PublishToggle from './PublishToggle'
import type {
  ContentEditFormState,
  EditableSectionType,
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
  about: '회사 소개',
  contact: '문의',
}

const initialState: ContentEditFormState = {}

function buildPreviewUrl(subdomain: string, locale: string): string {
  if (typeof window === 'undefined') return ''
  const { hostname, port } = window.location
  if (hostname.includes('localhost')) {
    return `http://${subdomain}.localhost:${port || 3000}/${locale}`
  }
  return `${window.location.protocol}//${window.location.hostname}/?partner=${subdomain}`
}

export default function ContentEditorForm({ sections, subdomain, defaultLocale }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [heroState, heroAction, heroIsPending] = useActionState(updatePartnerContent, initialState)
  const [aboutState, aboutAction, aboutIsPending] = useActionState(updatePartnerContent, initialState)
  const [contactState, contactAction, contactIsPending] = useActionState(updatePartnerContent, initialState)

  const hero = sections.find((s) => s.section_type === 'hero')
  const about = sections.find((s) => s.section_type === 'about')
  const contact = sections.find((s) => s.section_type === 'contact')

  // 언마운트 시 pending timer 정리
  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }, [])

  const sendPreview = useCallback((section: string, fields: Record<string, string>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) return
      iframe.contentWindow.postMessage(
        { type: 'WL_PREVIEW_UPDATE', section, fields },
        '*'  // 마케팅 사이트는 origin 검증을 수행; 어드민은 자체 iframe이므로 * 허용
      )
    }, 150)
  }, [])

  const previewUrl = buildPreviewUrl(subdomain, defaultLocale)

  function sectionForm(
    section: SectionData | undefined,
    sectionType: EditableSectionType,
    action: typeof heroAction,
    isPending: boolean,
    state: ContentEditFormState
  ) {
    if (!section) {
      return (
        <div className="py-8 text-sm text-muted-foreground">
          이 섹션의 콘텐츠가 없습니다. DB 트리거로 자동 초기화되지 않은 경우 관리자에게 문의하세요.
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

        {/* 언어 탭 */}
        <Tabs defaultValue="ko">
          <TabsList>
            <TabsTrigger value="ko">한국어</TabsTrigger>
            <TabsTrigger value="en">English</TabsTrigger>
          </TabsList>

          <TabsContent value="ko" forceMount className="space-y-4 pt-4 data-[state=inactive]:hidden">
            <div className="space-y-1.5">
              <Label htmlFor={`${sectionType}-title-ko`}>제목</Label>
              <Input
                id={`${sectionType}-title-ko`}
                name="title_ko"
                defaultValue={section.title_ko}
                placeholder="한국어 제목"
                onChange={(e) =>
                  sendPreview(sectionType, { [`${sectionType}.title`]: e.target.value })
                }
                data-testid={`${sectionType}-title-ko`}
              />
              {state.fieldErrors?.title_ko && (
                <p className="text-xs text-destructive" role="alert">
                  {state.fieldErrors.title_ko}
                </p>
              )}
            </div>

            {sectionType === 'hero' && (
              <div className="space-y-1.5">
                <Label htmlFor={`${sectionType}-subtitle-ko`}>부제목</Label>
                <Textarea
                  id={`${sectionType}-subtitle-ko`}
                  name="subtitle_ko"
                  defaultValue={section.subtitle_ko}
                  placeholder="한국어 부제목"
                  rows={3}
                  onChange={(e) =>
                    sendPreview(sectionType, { [`${sectionType}.subtitle`]: e.target.value })
                  }
                />
              </div>
            )}

            {sectionType === 'about' && (
              <div className="space-y-1.5">
                <Label htmlFor="about-body-ko">본문</Label>
                <Textarea
                  id="about-body-ko"
                  name="body_ko"
                  defaultValue={section.body_ko}
                  placeholder="한국어 본문"
                  rows={5}
                  onChange={(e) =>
                    sendPreview(sectionType, { [`${sectionType}.body`]: e.target.value })
                  }
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="en" forceMount className="space-y-4 pt-4 data-[state=inactive]:hidden">
            <div className="space-y-1.5">
              <Label htmlFor={`${sectionType}-title-en`}>Title</Label>
              <Input
                id={`${sectionType}-title-en`}
                name="title_en"
                defaultValue={section.title_en}
                placeholder="English title"
                onChange={(e) =>
                  sendPreview(sectionType, { [`${sectionType}.title`]: e.target.value })
                }
                data-testid={`${sectionType}-title-en`}
              />
            </div>

            {sectionType === 'hero' && (
              <div className="space-y-1.5">
                <Label htmlFor={`${sectionType}-subtitle-en`}>Subtitle</Label>
                <Textarea
                  id={`${sectionType}-subtitle-en`}
                  name="subtitle_en"
                  defaultValue={section.subtitle_en}
                  placeholder="English subtitle"
                  rows={3}
                  onChange={(e) =>
                    sendPreview(sectionType, { [`${sectionType}.subtitle`]: e.target.value })
                  }
                />
              </div>
            )}

            {sectionType === 'about' && (
              <div className="space-y-1.5">
                <Label htmlFor="about-body-en">Body</Label>
                <Textarea
                  id="about-body-en"
                  name="body_en"
                  defaultValue={section.body_en}
                  placeholder="English body"
                  rows={5}
                  onChange={(e) =>
                    sendPreview(sectionType, { [`${sectionType}.body`]: e.target.value })
                  }
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* contact_info 필드 (언어 독립) */}
        {sectionType === 'contact' && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">이메일</Label>
              <Input
                id="contact-email"
                name="contact_email"
                type="email"
                defaultValue={section.contact_email}
                placeholder="contact@example.com"
                data-testid="contact-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">전화번호</Label>
              <Input
                id="contact-phone"
                name="contact_phone"
                defaultValue={section.contact_phone}
                placeholder="02-1234-5678"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-address">주소</Label>
              <Input
                id="contact-address"
                name="contact_address"
                defaultValue={section.contact_address}
                placeholder="서울시 강남구 ..."
              />
            </div>
          </div>
        )}

        {/* 피드백 메시지 */}
        {state.error && (
          <p className="text-sm text-destructive" role="alert">{state.error}</p>
        )}
        {state.ok && (
          <p className="text-sm text-primary" role="status">저장되었습니다.</p>
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

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* 좌: 섹션 편집 */}
      <div className="w-[480px] shrink-0 overflow-y-auto">
        <Tabs defaultValue="hero">
          <TabsList className="mb-6">
            {(['hero', 'about', 'contact'] as EditableSectionType[]).map((type) => (
              <TabsTrigger key={type} value={type}>
                {SECTION_LABELS[type]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="hero">
            {sectionForm(hero, 'hero', heroAction, heroIsPending, heroState)}
          </TabsContent>
          <TabsContent value="about">
            {sectionForm(about, 'about', aboutAction, aboutIsPending, aboutState)}
          </TabsContent>
          <TabsContent value="contact">
            {sectionForm(contact, 'contact', contactAction, contactIsPending, contactState)}
          </TabsContent>
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
