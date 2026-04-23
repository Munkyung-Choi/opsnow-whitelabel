import type { Json } from '@/types/supabase';
import type { Locale } from '@/lib/i18n/locales';

// DB 키: 'cards' (2026-04-15 실측 확인)
// 필드: icon, title, description (tag·pain은 DB 미포함 → 자동 생성 또는 undefined)

export interface PainPointCard {
  icon: string;
  title: string;
  description: string;
  tag: string;     // DB에 없으면 인덱스 기반 자동 생성 ("PROBLEM 01", "PROBLEM 02"...)
  pain?: string;   // 통계 각주 — DB에 있을 때만 노출
}

export const DEFAULT_PAIN_POINTS: Record<Locale, PainPointCard[]> = {
  ko: [
    {
      icon: 'EyeOff', tag: 'PROBLEM 01', title: '가시성 부족',
      description: 'AWS, Azure, GCP 비용이 각기 다른 콘솔에 분산되어 있어 통합 현황을 파악하는 것 자체가 하루 업무가 됩니다. 어느 팀이 얼마를 쓰는지조차 알 수 없죠.',
      pain: '평균 3개 이상의 콘솔을 매일 오가는 팀',
    },
    {
      icon: 'Clock', tag: 'PROBLEM 02', title: '대응 지연',
      description: '이달 말에야 청구서를 받아보는 구조에서는 이미 낭비가 일어난 뒤입니다. 경고 알림 하나 설정하는 데도 수동 작업이 수반됩니다.',
      pain: '이상 지출 탐지까지 평균 18일 소요',
    },
    {
      icon: 'Puzzle', tag: 'PROBLEM 03', title: '최적화 난제',
      description: 'Reserved Instance, Savings Plan, Spot Instance의 복잡한 조합은 클라우드 전문가도 최적 선택이 어렵습니다. 잘못된 선택은 오히려 비용을 늘립니다.',
      pain: 'RI/SP 활용률 평균 34%에 그치는 현실',
    },
  ],
  en: [
    {
      icon: 'EyeOff', tag: 'PROBLEM 01', title: 'Lack of Visibility',
      description: "AWS, Azure, and GCP costs are scattered across separate consoles, making it a full day's work just to understand the overall picture. You can't even tell which team is spending what.",
      pain: 'Teams navigating 3+ consoles daily',
    },
    {
      icon: 'Clock', tag: 'PROBLEM 02', title: 'Delayed Response',
      description: 'In a system where you only receive invoices at month end, waste has already occurred. Even setting up a single alert requires manual effort.',
      pain: 'Average 18 days to detect anomalous spend',
    },
    {
      icon: 'Puzzle', tag: 'PROBLEM 03', title: 'Optimization Complexity',
      description: 'The complex combinations of Reserved Instances, Savings Plans, and Spot Instances are difficult to optimize even for cloud experts. Wrong choices can actually increase costs.',
      pain: 'RI/SP utilization averaging only 34%',
    },
  ],
  ja: [
    {
      icon: 'EyeOff', tag: 'PROBLEM 01', title: '可視性の欠如',
      description: 'AWS、Azure、GCPのコストが別々のコンソールに散在しており、全体像を把握するだけで丸一日かかります。どのチームがいくら使っているかさえわかりません。',
      pain: '毎日3つ以上のコンソールを行き来するチーム',
    },
    {
      icon: 'Clock', tag: 'PROBLEM 02', title: '対応遅延',
      description: '月末になってようやく請求書を受け取る仕組みでは、すでに無駄が発生しています。アラートの設定一つにも手作業が伴います。',
      pain: '異常な支出の検出まで平均18日',
    },
    {
      icon: 'Puzzle', tag: 'PROBLEM 03', title: '最適化の難題',
      description: 'Reserved Instance、Savings Plan、Spot Instanceの複雑な組み合わせは、クラウドの専門家でも最適な選択が難しいです。間違った選択はコストを増加させます。',
      pain: 'RI/SP活用率が平均34%にとどまる現実',
    },
  ],
  zh: [
    {
      icon: 'EyeOff', tag: 'PROBLEM 01', title: '可见性不足',
      description: 'AWS、Azure和GCP的费用分散在不同的控制台中，仅了解整体情况就需要花费一整天。您甚至无法知道哪个团队花了多少钱。',
      pain: '每天切换3个以上控制台的团队',
    },
    {
      icon: 'Clock', tag: 'PROBLEM 02', title: '响应滞后',
      description: '在月底才收到账单的体系下，浪费早已发生。即使设置一个警报也需要手动操作。',
      pain: '平均需要18天才能检测到异常支出',
    },
    {
      icon: 'Puzzle', tag: 'PROBLEM 03', title: '优化难题',
      description: '预留实例、储蓄计划和竞价实例的复杂组合即使对云专家也难以优化。错误的选择反而会增加成本。',
      pain: 'RI/SP利用率平均仅34%的现实',
    },
  ],
};

export function parsePainPoints(meta: Json | null, locale: Locale = 'ko'): PainPointCard[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return DEFAULT_PAIN_POINTS[locale];
  const cards = (meta as Record<string, Json>)['cards'];
  if (!Array.isArray(cards)) return DEFAULT_PAIN_POINTS[locale];

  const parsed = cards.flatMap((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const c = item as Record<string, Json>;
    if (typeof c.title !== 'string' || typeof c.description !== 'string') return [];
    return [{
      icon: typeof c.icon === 'string' ? c.icon : 'HelpCircle',
      title: c.title,
      description: c.description,
      tag: typeof c.tag === 'string' ? c.tag : `PROBLEM ${String(idx + 1).padStart(2, '0')}`,
      pain: typeof c.pain === 'string' ? c.pain : undefined,
    }];
  });

  return parsed.length > 0 ? parsed : DEFAULT_PAIN_POINTS[locale];
}
