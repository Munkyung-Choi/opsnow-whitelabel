'use client'

import { useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { togglePartnerActive } from '@/app/admin/partners/actions'

interface Props {
  partnerId: string
  isActive: boolean
}

export default function PartnerToggle({ partnerId, isActive }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await togglePartnerActive(partnerId, isActive)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="cursor-pointer disabled:opacity-50"
      aria-label={isActive ? '비활성화' : '활성화'}
    >
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isPending ? '처리 중...' : isActive ? '활성' : '비활성'}
      </Badge>
    </button>
  )
}
