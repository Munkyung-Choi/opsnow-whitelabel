import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import { createSessionClient } from '@/lib/supabase/create-server-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import FeatureToggle from '@/components/admin/FeatureToggle'
import { hasFeature } from '@/lib/features/has-feature'
import type { FeatureKey } from '@/lib/features/features-schema'

export const metadata = { title: '파트너 상세 — OpsNow Admin' }

const FEATURE_LABELS: Record<FeatureKey, string> = {
  custom_domain: '커스텀 도메인',
  analytics: '애널리틱스',
  multi_locale: '다국어 지원',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function PartnerDetailPage({ params }: Props) {
  await requireRole('master_admin')

  const { id } = await params
  const supabase = await createSessionClient()

  const { data: partner } = await supabase
    .from('partners')
    .select('id, business_name, subdomain, custom_domain, custom_domain_status, is_active, theme_key, default_locale, features, created_at')
    .eq('id', id)
    .single()

  if (!partner) notFound()

  const featureKeys = Object.keys(FEATURE_LABELS) as FeatureKey[]

  return (
    <main className="p-8 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 -ml-2 text-muted-foreground">
          <Link href="/admin/partners">← 파트너 목록</Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{partner.business_name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{partner.subdomain}.opsnow.com</p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          기본 정보
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">상태</span>
            <Badge variant={partner.is_active ? 'default' : 'secondary'}>
              {partner.is_active ? '활성' : '비활성'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">기본 언어</span>
            <span>{partner.default_locale}</span>
          </div>
          {partner.custom_domain && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">커스텀 도메인</span>
              <span className="flex items-center gap-1.5">
                {partner.custom_domain}
                <Badge variant="outline" className="text-xs">
                  {partner.custom_domain_status ?? 'none'}
                </Badge>
              </span>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Feature Flags <span className="text-xs font-normal">(master_admin 전용)</span>
        </h2>
        <div className="border rounded-md px-4">
          {featureKeys.map((key) => (
            <FeatureToggle
              key={key}
              partnerId={partner.id}
              featureKey={key}
              enabled={hasFeature(partner, key)}
              label={FEATURE_LABELS[key]}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
