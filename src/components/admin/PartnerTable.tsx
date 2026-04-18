import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import PartnerToggle from './PartnerToggle'
import ImpersonateButton from './ImpersonateButton'

type PartnerRow = {
  id: string
  business_name: string
  subdomain: string
  custom_domain: string | null
  custom_domain_status: string | null
  is_active: boolean | null
  theme_key: string | null
  created_at: string | null
}

interface Props {
  partners: PartnerRow[]
}

const THEME_LABELS: Record<string, string> = {
  gray: '그레이',
  blue: '블루',
  green: '그린',
  orange: '오렌지',
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default function PartnerTable({ partners }: Props) {
  if (partners.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        등록된 파트너가 없습니다.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>파트너명</TableHead>
          <TableHead>서브도메인</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>커스텀 도메인</TableHead>
          <TableHead>테마</TableHead>
          <TableHead>가입일</TableHead>
          <TableHead>액션</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {partners.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.business_name}</TableCell>
            <TableCell className="text-muted-foreground text-sm">{p.subdomain}</TableCell>
            <TableCell>
              <PartnerToggle partnerId={p.id} isActive={p.is_active ?? false} />
            </TableCell>
            <TableCell className="text-sm">
              {p.custom_domain ? (
                <span className="flex items-center gap-1.5">
                  {p.custom_domain}
                  <Badge variant="outline" className="text-xs">
                    {p.custom_domain_status ?? 'none'}
                  </Badge>
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{THEME_LABELS[p.theme_key ?? ''] ?? p.theme_key ?? '-'}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatDate(p.created_at)}</TableCell>
            <TableCell>
              <ImpersonateButton
                partnerId={p.id}
                partnerName={p.business_name}
                disabled={!p.is_active}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
