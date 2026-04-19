'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  type SupportedLocale,
} from '@/lib/schemas/partner'
import { createPartner, type PartnerFormState } from '@/app/admin/partners/actions'
import { useState } from 'react'

const THEME_OPTIONS = [
  { value: 'blue', label: '블루 (기본)' },
  { value: 'gray', label: '그레이' },
  { value: 'green', label: '그린' },
  { value: 'orange', label: '오렌지' },
] as const

const initialState: PartnerFormState = {}

export default function PartnerNewForm() {
  const [state, action, isPending] = useActionState(createPartner, initialState)
  const [defaultLocale, setDefaultLocale] = useState<SupportedLocale>('ko')
  const [publishedLocales, setPublishedLocales] = useState<SupportedLocale[]>(['ko'])

  function handleLocaleCheck(locale: SupportedLocale, checked: boolean) {
    if (!checked && locale === defaultLocale) return // default_locale은 항상 포함
    setPublishedLocales((prev) =>
      checked ? [...prev, locale] : prev.filter((l) => l !== locale)
    )
  }

  function handleDefaultLocaleChange(value: string) {
    const locale = value as SupportedLocale
    setDefaultLocale(locale)
    // default_locale은 published_locales에 반드시 포함
    setPublishedLocales((prev) => (prev.includes(locale) ? prev : [...prev, locale]))
  }

  return (
    <form action={action} className="space-y-6 max-w-md">
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      {/* 법인명 */}
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

      {/* 서브도메인 */}
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

      {/* 테마 */}
      <div className="space-y-1.5">
        <Label htmlFor="theme_key">테마</Label>
        <Select name="theme_key" defaultValue="blue" data-testid="theme-select">
          <SelectTrigger id="theme_key">
            <SelectValue placeholder="테마 선택" />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((t) => (
              <SelectItem
                key={t.value}
                value={t.value}
                data-testid={`theme-option-${t.value}`}
              >
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.theme_key && (
          <p className="text-xs text-destructive">{state.fieldErrors.theme_key}</p>
        )}
      </div>

      {/* 기본 언어 */}
      <div className="space-y-1.5">
        <Label htmlFor="default_locale">기본 언어</Label>
        <Select
          name="default_locale"
          value={defaultLocale}
          onValueChange={handleDefaultLocaleChange}
          data-testid="locale-select"
        >
          <SelectTrigger id="default_locale">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LOCALES.map((locale) => (
              <SelectItem
                key={locale}
                value={locale}
                data-testid={`locale-option-${locale}`}
              >
                {LOCALE_LABELS[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.default_locale && (
          <p className="text-xs text-destructive">{state.fieldErrors.default_locale}</p>
        )}
      </div>

      {/* 게시 언어 */}
      <div className="space-y-2">
        <Label>게시 언어</Label>
        <p className="text-xs text-muted-foreground">기본 언어는 항상 포함됩니다.</p>
        <div className="flex flex-wrap gap-4">
          {SUPPORTED_LOCALES.map((locale) => {
            const isChecked = publishedLocales.includes(locale)
            const isRequired = locale === defaultLocale
            return (
              <div key={locale} className="flex items-center gap-2">
                <Checkbox
                  id={`locale-${locale}`}
                  checked={isChecked}
                  disabled={isRequired}
                  onCheckedChange={(checked) =>
                    handleLocaleCheck(locale, checked as boolean)
                  }
                />
                <label htmlFor={`locale-${locale}`} className="text-sm">
                  {LOCALE_LABELS[locale]}
                  {isRequired && (
                    <span className="text-xs text-muted-foreground ml-1">(기본)</span>
                  )}
                </label>
                {/* FormData 전달용 hidden input */}
                {isChecked && (
                  <input type="hidden" name="published_locales" value={locale} />
                )}
              </div>
            )
          })}
        </div>
        {state.fieldErrors?.published_locales && (
          <p className="text-xs text-destructive">{state.fieldErrors.published_locales}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? '등록 중...' : '파트너 등록'}
      </Button>
    </form>
  )
}
