'use client'

import { signOut } from '@/app/auth/logout/actions'
import { Button } from '@/components/ui/button'

export default function LogoutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        data-testid="logout-button"
        className="w-full justify-start text-sm text-muted-foreground hover:text-foreground"
      >
        로그아웃
      </Button>
    </form>
  )
}
