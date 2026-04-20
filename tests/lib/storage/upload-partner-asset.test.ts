import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { uploadPartnerAsset } from '@/lib/storage/upload-partner-asset'

// WL-125 — uploadPartnerAsset 헬퍼 검증
//
// Mock 전략: supabase.storage.from().upload() + getPublicUrl() 체인을 vi.fn()으로 구성

type StorageMock = {
  uploadFn: ReturnType<typeof vi.fn>
  getPublicUrlFn: ReturnType<typeof vi.fn>
  fromFn: ReturnType<typeof vi.fn>
  client: SupabaseClient<Database>
}

function createStorageMock(overrides?: {
  uploadResult?: { data: unknown; error: { message: string } | null }
  publicUrl?: string
}): StorageMock {
  const uploadFn = vi.fn().mockResolvedValue(
    overrides?.uploadResult ?? { data: { path: '' }, error: null }
  )
  const getPublicUrlFn = vi.fn().mockReturnValue({
    data: { publicUrl: overrides?.publicUrl ?? 'https://example.supabase.co/public/fake' },
  })
  const fromFn = vi.fn().mockReturnValue({
    upload: uploadFn,
    getPublicUrl: getPublicUrlFn,
  })
  const client = {
    storage: { from: fromFn },
  } as unknown as SupabaseClient<Database>

  return { uploadFn, getPublicUrlFn, fromFn, client }
}

function createFile(size: number, mimeType: string): File {
  return { size, type: mimeType } as File
}

describe('uploadPartnerAsset — 검증 실패', () => {
  it('파일 크기 초과 시 FILE_TOO_LARGE 반환', async () => {
    const { client } = createStorageMock()
    const file = createFile(3_000_000, 'image/png')
    const result = await uploadPartnerAsset(client, { partnerId: 'abc-123', type: 'logo', file })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('FILE_TOO_LARGE')
    }
  })

  it('허용되지 않는 MIME → INVALID_TYPE 반환', async () => {
    const { client } = createStorageMock()
    const file = createFile(1000, 'image/svg+xml')
    const result = await uploadPartnerAsset(client, { partnerId: 'abc-123', type: 'logo', file })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INVALID_TYPE')
    }
  })
})

describe('uploadPartnerAsset — 정상 업로드', () => {
  it('로고는 partner-logos 버킷에 업로드', async () => {
    const mock = createStorageMock({ publicUrl: 'https://cdn/logo.png' })
    const file = createFile(500_000, 'image/png')

    const result = await uploadPartnerAsset(mock.client, {
      partnerId: 'abc-123',
      type: 'logo',
      file,
    })

    expect(mock.fromFn).toHaveBeenCalledWith('partner-logos')
    expect(mock.uploadFn).toHaveBeenCalledWith('abc-123/logo.png', file, {
      upsert: true,
      contentType: 'image/png',
    })
    expect(result).toEqual({
      ok: true,
      publicUrl: 'https://cdn/logo.png',
      path: 'abc-123/logo.png',
      bucket: 'partner-logos',
    })
  })

  it('파비콘은 partner-favicons 버킷에 업로드', async () => {
    const mock = createStorageMock()
    const file = createFile(1000, 'image/x-icon')

    const result = await uploadPartnerAsset(mock.client, {
      partnerId: 'abc-123',
      type: 'favicon',
      file,
    })

    expect(mock.fromFn).toHaveBeenCalledWith('partner-favicons')
    expect(mock.uploadFn).toHaveBeenCalledWith('abc-123/favicon.ico', file, {
      upsert: true,
      contentType: 'image/x-icon',
    })
    expect(result.path).toBe('abc-123/favicon.ico')
    expect(result.bucket).toBe('partner-favicons')
  })

  it('jpeg → jpg 확장자 매핑', async () => {
    const mock = createStorageMock()
    const file = createFile(500_000, 'image/jpeg')

    await uploadPartnerAsset(mock.client, {
      partnerId: 'abc-123',
      type: 'logo',
      file,
    })

    expect(mock.uploadFn).toHaveBeenCalledWith(
      'abc-123/logo.jpg',
      file,
      expect.objectContaining({ contentType: 'image/jpeg' })
    )
  })
})

describe('uploadPartnerAsset — 업로드 실패', () => {
  it('Supabase 업로드 에러 → UPLOAD_FAILED 반환', async () => {
    const { client } = createStorageMock({
      uploadResult: { data: null, error: { message: 'RLS 위반' } },
    })
    const file = createFile(500_000, 'image/png')

    const result = await uploadPartnerAsset(client, { partnerId: 'abc-123', type: 'logo', file })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UPLOAD_FAILED')
      expect(result.error).toMatch(/RLS 위반/)
    }
  })
})
