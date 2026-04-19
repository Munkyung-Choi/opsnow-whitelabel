'use server'

import { withAdminAction } from '@/lib/auth/with-admin-action'
import { FEATURE_KEYS, type FeatureKey } from '@/lib/features/features-schema'

export interface UpdateFeaturesState {
  error?: string
  ok?: true
}

export async function updatePartnerFeatures(
  partnerId: string,
  featureKey: FeatureKey,
  enabled: boolean
): Promise<UpdateFeaturesState> {
  if (!(FEATURE_KEYS as readonly string[]).includes(featureKey)) {
    return { error: '알 수 없는 feature key입니다.' }
  }

  return withAdminAction<UpdateFeaturesState, 'master_admin'>(
    {
      requiredRole: 'master_admin',
      auditAction: 'partner.update_features',
      revalidate: `/admin/partners/${partnerId}`,
    },
    async (_user, db) => {
      // R2 대응: DB 레이어 원자적 JSONB 병합 (update_partner_feature RPC)
      // features = features || jsonb_build_object(key, val) — 단일 SQL UPDATE
      const { error: rpcError } = await db.rpc('update_partner_feature', {
        p_partner_id: partnerId,
        p_feature_key: featureKey,
        p_enabled: enabled,
      })

      if (rpcError) {
        return { result: { error: 'Feature 업데이트에 실패했습니다.' } }
      }

      return {
        result: { ok: true as const },
        auditDetails: {
          target_table: 'partners',
          target_id: partnerId,
          partner_id: partnerId,
          diff: {
            before: { [featureKey]: !enabled },
            after: { [featureKey]: enabled },
          },
        },
      }
    }
  )
}
