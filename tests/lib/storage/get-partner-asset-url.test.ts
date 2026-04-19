import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getPartnerAssetUrl } from '@/lib/storage/get-partner-asset-url'

// WL-125 — getPartnerAssetUrl URL 조합 검증

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

describe('getPartnerAssetUrl', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  })

  afterEach(() => {
    if (ORIGINAL_URL === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL
    }
  })

  it('로고 URL을 올바르게 조합한다', () => {
    const url = getPartnerAssetUrl('abc-123', 'logo', 'png')
    expect(url).toBe(
      'https://example.supabase.co/storage/v1/object/public/partner-logos/abc-123/logo.png'
    )
  })

  it('파비콘 URL을 올바르게 조합한다', () => {
    const url = getPartnerAssetUrl('abc-123', 'favicon', 'ico')
    expect(url).toBe(
      'https://example.supabase.co/storage/v1/object/public/partner-favicons/abc-123/favicon.ico'
    )
  })

  it('trailing slash가 있는 URL도 정상 처리한다', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co/'
    const url = getPartnerAssetUrl('abc-123', 'logo', 'webp')
    expect(url).toBe(
      'https://example.supabase.co/storage/v1/object/public/partner-logos/abc-123/logo.webp'
    )
  })

  it('NEXT_PUBLIC_SUPABASE_URL 미설정 시 에러', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(() => getPartnerAssetUrl('abc-123', 'logo', 'png')).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })
})
