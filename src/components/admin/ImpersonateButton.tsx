'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  partnerId: string
  partnerName: string
  disabled?: boolean
}

export default function ImpersonateButton({ partnerId, partnerName, disabled }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`${partnerName}(으)로 대리 접속하시겠습니까?\n모든 행위는 감사 로그에 기록됩니다.`)) {
      return
    }
    startTransition(async () => {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        alert(`대리 접속 실패: ${data.error ?? res.statusText}`)
        return
      }
      router.refresh()
    })
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={disabled || isPending}
    >
      {isPending ? '시작 중...' : '대리 접속'}
    </Button>
  )
}
