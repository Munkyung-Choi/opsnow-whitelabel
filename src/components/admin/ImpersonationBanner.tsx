import { getImpersonationContext } from '@/lib/auth/impersonation'
import { supabaseAdmin } from '@/lib/supabase/server'
import StopImpersonationButton from './StopImpersonationButton'

// WL-51 — Impersonation 경고 배너 (Server Component).
//
// admin/layout.tsx 최상단에 렌더되어 대리 접속 중일 때만 노출.
// z-50 + sticky top-0 — 어떤 화면에서도 숨길 수 없음 (DoD#2).
//
// AP 아키텍트 UX 권장: 로고 옆 파트너명 병기 ("맥락 오버레이") — 배너에 파트너명 표시로 구현.
export default async function ImpersonationBanner() {
  const ctx = await getImpersonationContext()
  if (!ctx.isImpersonating) return null

  // 파트너명 조회 (service_role: 비활성 파트너라도 배너 표시 필요 — 삭제된 경우 null 허용)
  const { data: partner } = await supabaseAdmin
    .from('partners')
    .select('business_name')
    .eq('id', ctx.context.target_partner_id)
    .maybeSingle()

  const partnerName = partner?.business_name ?? '(알 수 없는 파트너)'

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 bg-destructive text-destructive-foreground shadow-md"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <span aria-hidden className="font-bold">⚠️</span>
          <span>
            현재 <strong className="font-semibold">{partnerName}</strong> 계정으로 대리 접속 중입니다.
          </span>
        </div>
        <StopImpersonationButton />
      </div>
    </div>
  )
}
