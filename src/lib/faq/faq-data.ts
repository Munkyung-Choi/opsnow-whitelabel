/**
 * src/lib/faq/faq-data.ts
 *
 * FAQ 데이터 타입·기본값·파서 정의.
 * - DEFAULT_FAQ_ITEMS: WL-97 DB 구축 전 폴백 데이터
 * - parseFaqContent: global_contents.meta.items → FaqItem[] 변환
 */

import type { Json } from '@/types/supabase';
import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';

export type FaqCategory = '비용' | '리소스' | '거버넌스' | 'AutoSavings' | '세팅';

export const FAQ_CATEGORIES: FaqCategory[] = ['비용', '리소스', '거버넌스', 'AutoSavings', '세팅'];

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  /** 아코디언 미리보기 — answer의 첫 200바이트 (WL-97 명세) */
  summary: string;
}

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'pricing-model',
    category: '비용',
    question: '요금 구조는 어떻게 되나요?',
    summary: '성과 기반 요금제를 채택합니다. 초기 세팅 비용은 없으며, 실제 절감된 비용의 일정 비율만 청구합니다.',
  },
  {
    id: 'multi-cloud-support',
    category: '비용',
    question: 'AWS 외에 Azure, GCP도 동시에 지원하나요?',
    summary: 'AWS·Azure·GCP 세 플랫폼을 단일 대시보드에서 통합 관리합니다. 벤더별 비용 비교와 워크로드 재배치 시뮬레이션도 지원합니다.',
  },
  {
    id: 'cost-report',
    category: '비용',
    question: '비용 분석 리포트는 어떤 형태로 제공되나요?',
    summary: '역할별(CTO·CFO·DevOps) 맞춤 대시보드와 월간 PDF 리포트를 자동 생성합니다. 이사회 보고용 KPI 요약본도 지원합니다.',
  },
  {
    id: 'ec2-optimization',
    category: '리소스',
    question: 'EC2 인스턴스 최적화는 어떻게 진행되나요?',
    summary: 'AI가 사용 패턴을 분석해 유휴 인스턴스·과도 프로비저닝 리소스를 자동 탐지하고, 원클릭 최적화 실행 및 1분 이내 롤백을 지원합니다.',
  },
  {
    id: 'unused-resources',
    category: '리소스',
    question: '사용하지 않는 리소스는 어떻게 찾아내나요?',
    summary: '실시간 스캔으로 유휴 EC2·미사용 EBS 스냅샷·불필요한 EIP를 자동 분류합니다. 비용 영향도 순으로 우선순위를 정렬해 제공합니다.',
  },
  {
    id: 'tag-governance',
    category: '거버넌스',
    question: '태그 정책을 자동화할 수 있나요?',
    summary: '통합 태그 정책으로 팀/프로젝트/환경별 비용 배분을 자동화합니다. 태그 누락 리소스 알림과 강제 적용 정책도 설정할 수 있습니다.',
  },
  {
    id: 'auto-savings',
    category: 'AutoSavings',
    question: 'RI/Savings Plan 자동 매매는 어떻게 작동하나요?',
    summary: '실시간 사용량 분석으로 RI/SP 구매·판매 타이밍을 자동 결정합니다. 24시간 모니터링으로 100% 약정 커버리지를 유지합니다.',
  },
  {
    id: 'initial-setup',
    category: '세팅',
    question: '처음 연동하는 데 얼마나 걸리나요?',
    summary: '읽기 전용 IAM 권한 설정만으로 5분 이내 연동이 완료됩니다. 에이전트 설치나 코드 변경은 필요하지 않습니다.',
  },
];

/**
 * global_contents.meta.items 배열을 FaqItem[]으로 파싱.
 * DB 미구축(WL-97 대기) 또는 파싱 실패 시 DEFAULT_FAQ_ITEMS 반환.
 */
export function parseFaqContent(content: LocalizedGlobalContentRow | null): FaqItem[] {
  const meta = content?.meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return DEFAULT_FAQ_ITEMS;

  const items = (meta as Record<string, Json>)['items'];
  if (!Array.isArray(items)) return DEFAULT_FAQ_ITEMS;

  const parsed = items.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const f = item as Record<string, Json>;
    if (typeof f.id !== 'string' || typeof f.question !== 'string') return [];

    // WL-97 하위호환: 구 스키마는 summary, 신 스키마는 answer (첫 200자 파생)
    // answer는 deepLocalizeJson 이후 string으로 도착함
    const summary =
      typeof f.summary === 'string'
        ? f.summary
        : typeof f.answer === 'string'
        ? f.answer
            .replace(/#{1,6}\s+/g, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\[(.+?)\]\(.+?\)/g, '$1')
            .replace(/\n+/g, ' ')
            .trim()
            .slice(0, 200)
        : '';
    if (!summary) return [];

    return [{
      id: f.id,
      category: (typeof f.category === 'string' ? f.category : '비용') as FaqCategory,
      question: f.question,
      summary,
    }];
  });

  return parsed.length > 0 ? parsed : DEFAULT_FAQ_ITEMS;
}
