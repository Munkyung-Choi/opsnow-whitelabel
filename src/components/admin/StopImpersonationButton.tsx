'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function StopImpersonationButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStop() {
    startTransition(async () => {
      await fetch('/api/admin/impersonate', { method: 'DELETE' })
      router.refresh()
    })
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleStop}
      disabled={isPending}
      className="shrink-0"
    >
      {isPending ? '종료 중...' : '대리 접속 종료'}
    </Button>
  )
}
