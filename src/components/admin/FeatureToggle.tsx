'use client'

import { useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { type FeatureKey } from '@/lib/features/features-schema'
import { updatePartnerFeatures } from '@/app/admin/partners/[id]/actions'

interface Props {
  partnerId: string
  featureKey: FeatureKey
  enabled: boolean
  label: string
}

export default function FeatureToggle({ partnerId, featureKey, enabled, label }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await updatePartnerFeatures(partnerId, featureKey, !enabled)
    })
  }

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className="cursor-pointer disabled:opacity-50"
        aria-label={`${label} ${enabled ? '비활성화' : '활성화'}`}
        data-testid={`feature-toggle-${featureKey}`}
      >
        <Badge variant={enabled ? 'default' : 'secondary'}>
          {isPending ? '처리 중...' : enabled ? 'ON' : 'OFF'}
        </Badge>
      </button>
    </div>
  )
}
