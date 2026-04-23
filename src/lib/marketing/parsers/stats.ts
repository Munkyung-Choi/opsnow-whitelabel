import type { Json } from '@/types/supabase';
import type { Locale } from '@/lib/i18n/locales';

export interface StatItem {
  value: string;
  unit?: string;
  label: string;
  detail?: string;
}

/**
 * ⚠️ 이 값을 수정하면 DB stats row가 없는 모든 파트너에 즉시 반영됩니다.
 *    파트너별 커스텀 값은 DB contents 테이블에 시드할 것.
 */
export const DEFAULT_STATS: Record<Locale, StatItem[]> = {
  ko: [
    { value: '30%',   unit: '평균', label: '월 클라우드 비용 절감', detail: '고객사 전체 평균 기준 (최대 47% 달성)' },
    { value: '5분',   unit: '이내', label: '초기 설정 완료',        detail: 'API 키 입력만으로 즉시 연동 시작' },
    { value: '99.9%', unit: 'SLA',  label: '서비스 가용성 보장',    detail: '엔터프라이즈급 인프라 운영' },
  ],
  en: [
    { value: '30%',   unit: 'avg.',     label: 'Monthly cloud cost reduction',   detail: 'Based on all-customer average (up to 47% achieved)' },
    { value: '5min',  unit: 'or less',  label: 'Initial setup completion',        detail: 'Start connecting with API key input only' },
    { value: '99.9%', unit: 'SLA',      label: 'Service availability guarantee', detail: 'Enterprise-grade infrastructure operations' },
  ],
  ja: [
    { value: '30%',   unit: '平均', label: '月間クラウドコスト削減', detail: '全顧客平均基準（最大47%達成実績あり）' },
    { value: '5分',   unit: '以内', label: '初期設定完了',           detail: 'APIキーを入力するだけで即時連携開始' },
    { value: '99.9%', unit: 'SLA',  label: 'サービス可用性保証',     detail: 'エンタープライズグレードのインフラ運用' },
  ],
  zh: [
    { value: '30%',   unit: '均值', label: '月均云成本节省', detail: '基于全客户平均值（最高可达47%）' },
    { value: '5分钟', unit: '以内', label: '完成初始配置',   detail: '仅需输入API密钥即可立即开始连接' },
    { value: '99.9%', unit: 'SLA',  label: '服务可用性保障', detail: '企业级基础设施运营' },
  ],
};

export function parseStats(bodyJson: Json | null, locale: Locale = 'ko'): StatItem[] {
  if (!Array.isArray(bodyJson)) return DEFAULT_STATS[locale];

  const parsed = bodyJson.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const s = item as Record<string, Json>;

    // 표준 포맷: { value, label, unit?, detail? }
    if (typeof s.value === 'string' && typeof s.label === 'string') {
      return [{
        value: s.value,
        unit: typeof s.unit === 'string' ? s.unit : undefined,
        label: s.label,
        detail: typeof s.detail === 'string' ? s.detail : undefined,
      }];
    }

    // 레거시 포맷: { number, label }
    if (typeof s.number === 'string' && typeof s.label === 'string') {
      return [{ value: s.number, label: s.label }];
    }

    return [];
  });

  return parsed.length > 0 ? parsed : DEFAULT_STATS[locale];
}
