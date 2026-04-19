import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import {
  PARTNER_ASSET_BUCKETS,
  getExtensionFromMime,
  validatePartnerAssetFile,
  type PartnerAssetType,
} from './partner-asset.schema'

export type UploadPartnerAssetInput = {
  partnerId: string
  type: PartnerAssetType
  file: File
}

export type UploadPartnerAssetResult = {
  publicUrl: string
  path: string
  bucket: string
}

// Session-based Supabase 클라이언트 전용 — service_role 사용 금지.
// RLS가 자연 적용되어 크로스테넌트 업로드 원천 차단.
export async function uploadPartnerAsset(
  supabase: SupabaseClient<Database>,
  { partnerId, type, file }: UploadPartnerAssetInput
): Promise<UploadPartnerAssetResult> {
  const validation = validatePartnerAssetFile(type, file)
  if (!validation.ok) {
    throw new Error(validation.error)
  }

  const ext = getExtensionFromMime(file.type)
  if (!ext) {
    throw new Error(`MIME 타입 ${file.type}에 대한 확장자 매핑이 없습니다.`)
  }

  const bucket = PARTNER_ASSET_BUCKETS[type]
  const path = `${partnerId}/${type}.${ext}`

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })

  if (uploadError) {
    throw new Error(`Storage 업로드 실패: ${uploadError.message}`)
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    publicUrl: publicUrlData.publicUrl,
    path,
    bucket,
  }
}
