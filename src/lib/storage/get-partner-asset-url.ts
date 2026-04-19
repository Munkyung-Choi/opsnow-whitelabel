import { PARTNER_ASSET_BUCKETS, type PartnerAssetType } from './partner-asset.schema'

export function getPartnerAssetUrl(
  partnerId: string,
  type: PartnerAssetType,
  ext: string
): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되어 있지 않습니다.')
  }

  const bucket = PARTNER_ASSET_BUCKETS[type]
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${partnerId}/${type}.${ext}`
}
