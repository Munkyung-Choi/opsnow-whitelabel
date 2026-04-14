import {
  AlertCircle,
  BarChart3,
  Brain,
  Cloud,
  Cpu,
  Puzzle,
  Settings,
  Shield,
  Table2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * DB 저장 문자열 → Lucide 아이콘 컴포넌트 별칭 매핑.
 *
 * 존재 이유: 기존 DB에는 lowercase/케밥케이스 식별자(cloud, trending-down 등)가 저장되어 있어
 * Lucide PascalCase 이름과 1:1 대응이 불가한 항목을 명시적으로 등록한다.
 *
 * 신규 아이콘: DB에 Lucide PascalCase 이름("Check", "ArrowRight" 등)을 직접 저장하면
 * 이 맵 수정 없이 IconRenderer가 자동 조회한다.
 */
export const ICON_ALIASES: Record<string, LucideIcon> = {
  // FeaturesSection 별칭
  cloud: Cloud,
  brain: Brain,
  'trending-down': TrendingDown,
  shield: Shield,

  // PainPoints 별칭 (Lucide 이름과 다른 항목)
  table: Table2,       // "table" → Table2
  alert: AlertCircle,  // "alert" → AlertCircle
  puzzle: Puzzle,

  // RoleBasedValue 역할명 별칭
  CFO: TrendingUp,
  DevOps: Settings,
  FinOps: BarChart3,

  // CoreEngines 인덱스 fallback용
  cpu: Cpu,
};
