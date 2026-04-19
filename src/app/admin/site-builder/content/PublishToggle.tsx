'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { toggleSectionPublish } from './actions'
import type { EditableSectionType, PublishToggleState } from '@/lib/schemas/site-builder-content'

interface Props {
  sectionType: EditableSectionType
  isPublished: boolean
}

const initialState: PublishToggleState = {}

export default function PublishToggle({ sectionType, isPublished }: Props) {
  const [state, formAction, isPending] = useActionState(toggleSectionPublish, initialState)

  const nextValue = isPublished ? 'false' : 'true'
  const label = isPublished ? '발행 취소' : '발행'

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="section_type" value={sectionType} />
      <input type="hidden" name="is_published" value={nextValue} />
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          isPublished
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {isPublished ? '발행됨' : '미발행'}
      </span>
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={isPending}
        data-testid={`publish-toggle-${sectionType}`}
      >
        {isPending ? '처리 중...' : label}
      </Button>
      {state.error && (
        <span className="text-xs text-destructive" role="alert">{state.error}</span>
      )}
    </form>
  )
}
