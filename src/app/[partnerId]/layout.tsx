import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { validatePartner } from '@/services/partnerService';
import { themes, DEFAULT_THEME_KEY, type ThemeKey } from '@/lib/theme-presets';

// [WL-68] ISR 300초 갱신 — 어드민 즉시 반영은 WL-42(revalidatePath) 완료 후 대응
// Zombie Partner 리스크(최대 5분 노출) 수용 결정 (2026-04-14 문경 님 승인)
export const revalidate = 300;

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
