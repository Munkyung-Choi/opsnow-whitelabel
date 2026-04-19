import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import {
  PARTNER_ASSET_BUCKETS,
  getAssetConstraints,
  type PartnerAssetType,
} from './partner-asset.schema'

// 확장자가 사전에 알려지지 않으므로 허용된 모든 확장자 path를 일괄 삭제 시도.
// Supabase remove는 존재하지 않는 path를 silent 처리 (에러 아님).
export async function deletePartnerAsset(
  supabase: SupabaseClient<Database>,
  partnerId: string,
  type: PartnerAssetType
): Promise<void> {
  const bucket = PARTNER_ASSET_BUCKETS[type]
  const constraints = getAssetConstraints(type)
  const paths = constraints.extensions.map((ext) => `${partnerId}/${type}.${ext}`)

  const { error } = await supabase.storage.from(bucket).remove(paths)

  if (error) {
    throw new Error(`Storage 삭제 실패: ${error.message}`)
  }
}
