'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { THEME_META, type ThemeKey } from '@/lib/theme-presets'
import { validatePartnerAssetFile, type PartnerAssetType } from '@/lib/storage'
import { updatePartnerTheme } from './actions'
import type { SiteBuilderFormState } from '@/lib/schemas/site-builder'

interface Props {
  currentThemeKey: ThemeKey | null
  currentLogoUrl: string | null
  currentFaviconUrl: string | null
}

const initialState: SiteBuilderFormState = {}

export default function SiteBuilderForm({ currentThemeKey, currentLogoUrl, currentFaviconUrl }: Props) {
  const [state, formAction, isPending] = useActionState(updatePartnerTheme, initialState)
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogoUrl)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(currentFaviconUrl)
  const [clientFileErrors, setClientFileErrors] = useState<{ logo?: string; favicon?: string }>({})
  const hasClientErrors = !!(clientFileErrors.logo || clientFileErrors.favicon)

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    type: PartnerAssetType,
    setPreview: (url: string | null) => void
  ) {
    const file = e.target.files?.[0]
    if (!file) {
      setClientFileErrors(prev => ({ ...prev, [type]: undefined }))
      return
    }
    const v = validatePartnerAssetFile(type, file)
    if (!v.ok) {
      setClientFileErrors(prev => ({ ...prev, [type]: v.error }))
      return
    }
    setClientFileErrors(prev => ({ ...prev, [type]: undefined }))
    setPreview(URL.createObjectURL(file))
  }

  return (
    <form action={formAction} className="space-y-8">
      {state.error && (
        <p className="text-sm text-destructive" role="alert">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-primary" role="status">저장되었습니다.</p>
      )}

      {/* 테마 컬러 */}
      <div className="space-y-1.5">
        <Label htmlFor="theme_key">테마 컬러</Label>
        <Select name="theme_key" defaultValue={currentThemeKey ?? 'blue'}>
          <SelectTrigger id="theme_key" className="w-48">
            <SelectValue placeholder="테마 선택" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(THEME_META) as ThemeKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  {/* FIXED: 테마 미리보기 전용 스와치 — 파트너 테마 체인 외부 고정 색상 */}
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: THEME_META[key].primaryHex }}
                  />
                  {THEME_META[key].label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.theme_key && (
          <p className="text-xs text-destructive" role="alert">{state.fieldErrors.theme_key}</p>
        )}
      </div>

      {/* 로고 업로드 */}
      <div className="space-y-1.5">
        <Label htmlFor="logo">로고</Label>
        <div className="flex items-center gap-4">
          {logoPreview && (
            <Image
              src={logoPreview}
              alt="로고 미리보기"
              width={80}
              height={40}
              className="object-contain border border-border rounded bg-card"
              unoptimized
            />
          )}
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-secondary file:text-secondary-foreground hover:file:bg-accent"
            onChange={(e) => handleFileChange(e, 'logo', setLogoPreview)}
            data-testid="logo-input"
          />
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG, WebP · 최대 2MB</p>
        {(clientFileErrors.logo ?? state.fieldErrors?.logo) && (
          <p className="text-xs text-destructive" role="alert">
            {clientFileErrors.logo ?? state.fieldErrors?.logo}
          </p>
        )}
      </div>

      {/* 파비콘 업로드 */}
      <div className="space-y-1.5">
        <Label htmlFor="favicon">파비콘</Label>
        <div className="flex items-center gap-4">
          {faviconPreview && (
            <Image
              src={faviconPreview}
              alt="파비콘 미리보기"
              width={32}
              height={32}
              className="object-contain border border-border rounded bg-card"
              unoptimized
            />
          )}
          <input
            id="favicon"
            name="favicon"
            type="file"
            accept="image/x-icon,image/vnd.microsoft.icon,image/png"
            className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-secondary file:text-secondary-foreground hover:file:bg-accent"
            onChange={(e) => handleFileChange(e, 'favicon', setFaviconPreview)}
            data-testid="favicon-input"
          />
        </div>
        <p className="text-xs text-muted-foreground">ICO, PNG · 최대 512KB</p>
        {(clientFileErrors.favicon ?? state.fieldErrors?.favicon) && (
          <p className="text-xs text-destructive" role="alert">
            {clientFileErrors.favicon ?? state.fieldErrors?.favicon}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending || hasClientErrors} className="min-w-24">
        {isPending ? '저장 중...' : '저장'}
      </Button>
    </form>
  )
}
