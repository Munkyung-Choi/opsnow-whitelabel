import { notFound } from 'next/navigation';
import { validatePartner } from '@/services/partnerService';

export default async function PartnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const partner = await validatePartner(partnerId);

  if (!partner) notFound();

  return <>{children}</>;
}
