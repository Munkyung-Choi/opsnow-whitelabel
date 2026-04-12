import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { validatePartner } from '@/services/partnerService';
import { getContrastColor } from '@/lib/utils';

// 어드민에서 섹션 설정 변경 시 즉시 반영 보장 (WL-42 완료 후 revalidatePath() 기반으로 전환)
export const dynamic = 'force-dynamic';

interface PartnerLayoutProps {
  children: React.ReactNode;
  params: Promise<{ partnerId: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}): Promise<Metadata> {
  const { partnerId } = await params;
  const partner = await validatePartner(partnerId);
  if (!partner) return {};

  return {
    title: {
      default: partner.business_name,
      template: `%s | ${partner.business_name}`,
    },
    icons: {
      icon: partner.favicon_url || '/favicon.ico',
      apple: partner.favicon_url || '/apple-touch-icon.png',
      shortcut: partner.favicon_url || '/favicon.ico',
    },
  };
}

export default async function PartnerLayout({ children, params }: PartnerLayoutProps) {
  const { partnerId } = await params;
  const partner = await validatePartner(partnerId);

  if (!partner) notFound();

  const primaryColor = partner.primary_color ?? '#0000FF';
  const secondaryColor = partner.secondary_color ?? '#F3F4F6';
  const primaryFg = getContrastColor(primaryColor);
  const secondaryFg = getContrastColor(secondaryColor);

  return (
    <div
      style={
        {
          '--primary': primaryColor,
          '--primary-foreground': primaryFg,
          '--secondary': secondaryColor,
          '--secondary-foreground': secondaryFg,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
