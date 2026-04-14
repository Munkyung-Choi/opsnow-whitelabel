import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { validatePartner } from '@/services/partnerService';
import { themes, DEFAULT_THEME_KEY, type ThemeKey } from '@/lib/theme-presets';

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

  // theme_key가 DB에 없거나 유효하지 않으면 기본 테마로 폴백
  const themeKey = (partner.theme_key as ThemeKey | null) ?? DEFAULT_THEME_KEY;
  const themeVars = themes[themeKey] ?? themes[DEFAULT_THEME_KEY];

  return (
    <div style={themeVars as React.CSSProperties}>
      {children}
    </div>
  );
}
