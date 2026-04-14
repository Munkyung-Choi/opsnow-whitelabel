import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';
import ContactForm from '@/components/marketing/ContactForm';

interface Props {
  content: LocalizedContentRow | null;
  partnerId: string;
}

export default function FinalCTASection({ content, partnerId }: Props) {
  const title = content?.title ?? '지금 바로 문의하세요';
  const subtitle = content?.subtitle ?? '전문 컨설턴트가 귀사에 맞는 클라우드 최적화 방안을 안내해 드립니다.';
  const ctaText = content?.cta_text ?? '문의 신청하기';

  return (
    <ContactForm
      partnerId={partnerId}
      title={title}
      subtitle={subtitle}
      ctaText={ctaText}
    />
  );
}
