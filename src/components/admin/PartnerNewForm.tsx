'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createPartner, type PartnerFormState } from '@/app/admin/partners/actions'

const THEME_OPTIONS = [
  { value: 'blue', label: '블루 (기본)' },
  { value: 'gray', label: '그레이' },
  { value: 'green', label: '그린' },
  { value: 'orange', label: '오렌지' },
] as const

const initialState: PartnerFormState = {}

export default function PartnerNewForm() {
  const [state, action, isPending] = useActionState(createPartner, initialState)

  return (
    <form action={action} className="space-y-6 max-w-md">
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="business_name">법인명</Label>
        <Input
          id="business_name"
          name="business_name"
          placeholder="예: 삼성SDS"
          aria-describedby={state.fieldErrors?.business_name ? 'business_name-error' : undefined}
        />
        {state.fieldErrors?.business_name && (
          <p id="business_name-error" className="text-xs text-destructive">
            {state.fieldErrors.business_name}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subdomain">서브도메인</Label>
        <div className="flex items-center gap-1">
          <Input
            id="subdomain"
            name="subdomain"
            placeholder="예: samsung-sds"
            className="flex-1"
            aria-describedby={state.fieldErrors?.subdomain ? 'subdomain-error' : undefined}
          />
          <span className="text-sm text-muted-foreground shrink-0">.opsnow.com</span>
        </div>
        {state.fieldErrors?.subdomain && (
          <p id="subdomain-error" className="text-xs text-destructive">
            {state.fieldErrors.subdomain}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="theme_key">테마</Label>
        <Select name="theme_key" defaultValue="blue">
          <SelectTrigger id="theme_key">
            <SelectValue placeholder="테마 선택" />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.theme_key && (
          <p className="text-xs text-destructive">{state.fieldErrors.theme_key}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? '등록 중...' : '파트너 등록'}
      </Button>
    </form>
  )
}
