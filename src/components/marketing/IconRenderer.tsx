import * as Icons from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { HelpCircle } from 'lucide-react';
import { ICON_ALIASES } from '@/lib/marketing/icon-aliases';

interface Props extends LucideProps {
  /** DB에서 내려오는 아이콘 식별자.
   *  1순위: ICON_ALIASES 별칭 (기존 lowercase/역할명 등)
   *  2순위: Lucide PascalCase 직접 조회 (신규 DB 값)
   *  3순위: HelpCircle fallback
   */
  name: string;
}

/**
 * DB 문자열 → Lucide 아이콘 컴포넌트 렌더러.
 * RSC 전용 — 서버에서만 실행되므로 클라이언트 번들에 영향 없음.
 */
export default function IconRenderer({ name, ...props }: Props) {
  // lucide-react v1.x 내부 타입(IconComponentProps)이 LucideIcon과 달라
  // 직접 캐스팅이 불가하므로 unknown 경유 단계적 캐스팅 사용
  const Icon: LucideIcon =
    ICON_ALIASES[name] ??
    (Icons as unknown as Record<string, LucideIcon | undefined>)[name] ??
    HelpCircle;
  return <Icon {...props} />;
}
