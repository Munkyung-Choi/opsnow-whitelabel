import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { deletePartnerAsset } from '@/lib/storage/delete-partner-asset'

// WL-125 — deletePartnerAsset 헬퍼 검증

function createStorageMock(error: { message: string } | null = null) {
  const removeFn = vi.fn().mockResolvedValue({ data: [], error })
  const fromFn = vi.fn().mockReturnValue({ remove: removeFn })
  const client = {
    storage: { from: fromFn },
  } as unknown as SupabaseClient<Database>
  return { removeFn, fromFn, client }
}

describe('deletePartnerAsset', () => {
  it('로고 삭제 시 partner-logos 버킷에서 모든 확장자 path 제거 시도', async () => {
    const mock = createStorageMock()

    await deletePartnerAsset(mock.client, 'abc-123', 'logo')

    expect(mock.fromFn).toHaveBeenCalledWith('partner-logos')
    expect(mock.removeFn).toHaveBeenCalledWith([
      'abc-123/logo.png',
      'abc-123/logo.jpg',
      'abc-123/logo.jpeg',
      'abc-123/logo.webp',
    ])
  })

  it('파비콘 삭제 시 partner-favicons 버킷에서 ico·png 경로 제거 시도', async () => {
    const mock = createStorageMock()

    await deletePartnerAsset(mock.client, 'abc-123', 'favicon')

    expect(mock.fromFn).toHaveBeenCalledWith('partner-favicons')
    expect(mock.removeFn).toHaveBeenCalledWith(['abc-123/favicon.ico', 'abc-123/favicon.png'])
  })

  it('Supabase remove 에러는 전파한다', async () => {
    const { client } = createStorageMock({ message: '권한 없음' })

    await expect(deletePartnerAsset(client, 'abc-123', 'logo')).rejects.toThrow(
      /Storage 삭제 실패.*권한 없음/
    )
  })
})
