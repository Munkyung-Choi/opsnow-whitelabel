import { describe, it, expect } from 'vitest'
import {
  validatePartnerAssetFile,
  getAssetConstraints,
  getExtensionFromMime,
  LOGO_CONSTRAINTS,
  FAVICON_CONSTRAINTS,
} from '@/lib/storage/partner-asset.schema'

// WL-125 — partner-asset.schema 검증

describe('validatePartnerAssetFile — 로고', () => {
  it('허용 범위 파일은 통과한다 (2MB PNG)', () => {
    const result = validatePartnerAssetFile('logo', { size: 1_000_000, type: 'image/png' })
    expect(result).toEqual({ ok: true })
  })

  it('2MB 초과 시 거부한다', () => {
    const result = validatePartnerAssetFile('logo', { size: 3_000_000, type: 'image/png' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/크기/)
  })

  it('허용되지 않는 MIME은 거부한다 (svg)', () => {
    const result = validatePartnerAssetFile('logo', { size: 1000, type: 'image/svg+xml' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/파일 형식/)
  })

  it('webp는 허용한다', () => {
    const result = validatePartnerAssetFile('logo', { size: 500_000, type: 'image/webp' })
    expect(result).toEqual({ ok: true })
  })
})

describe('validatePartnerAssetFile — 파비콘', () => {
  it('512KB 이하 ico는 통과한다', () => {
    const result = validatePartnerAssetFile('favicon', { size: 500_000, type: 'image/x-icon' })
    expect(result).toEqual({ ok: true })
  })

  it('512KB 초과 시 거부한다', () => {
    const result = validatePartnerAssetFile('favicon', { size: 600_000, type: 'image/x-icon' })
    expect(result.ok).toBe(false)
  })

  it('로고 전용 MIME(webp)은 거부한다', () => {
    const result = validatePartnerAssetFile('favicon', { size: 1000, type: 'image/webp' })
    expect(result.ok).toBe(false)
  })

  it('image/vnd.microsoft.icon도 허용한다 (IANA 표준)', () => {
    const result = validatePartnerAssetFile('favicon', {
      size: 1000,
      type: 'image/vnd.microsoft.icon',
    })
    expect(result).toEqual({ ok: true })
  })
})

describe('getAssetConstraints', () => {
  it('logo → LOGO_CONSTRAINTS', () => {
    expect(getAssetConstraints('logo')).toBe(LOGO_CONSTRAINTS)
  })

  it('favicon → FAVICON_CONSTRAINTS', () => {
    expect(getAssetConstraints('favicon')).toBe(FAVICON_CONSTRAINTS)
  })
})

describe('getExtensionFromMime', () => {
  it('image/png → png', () => {
    expect(getExtensionFromMime('image/png')).toBe('png')
  })

  it('image/jpeg → jpg', () => {
    expect(getExtensionFromMime('image/jpeg')).toBe('jpg')
  })

  it('image/webp → webp', () => {
    expect(getExtensionFromMime('image/webp')).toBe('webp')
  })

  it('image/x-icon → ico', () => {
    expect(getExtensionFromMime('image/x-icon')).toBe('ico')
  })

  it('image/vnd.microsoft.icon → ico', () => {
    expect(getExtensionFromMime('image/vnd.microsoft.icon')).toBe('ico')
  })

  it('알 수 없는 MIME → null', () => {
    expect(getExtensionFromMime('image/gif')).toBeNull()
  })
})
