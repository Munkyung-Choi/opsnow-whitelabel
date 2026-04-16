/**
 * src/lib/marketing/parsers.ts
 *
 * 마케팅 섹션 JSONB 데이터 파서 모음.
 * 모든 파서는 순수 함수(Pure Function) — 부수효과 없음, 테스트 용이.
 *
 * 공통 규칙:
 *   - 입력 null / 타입 불일치 → 안전한 기본값(빈 배열 또는 DEFAULT_*) 반환
 *   - 개별 항목 형식 불일치 → 해당 항목만 건너뜀 (flatMap + return [])
 *   - 절대 throw하지 않음 — 파셜 데이터에서도 화면이 렌더되어야 함
 *
 * DB 키 실측값 (2026-04-15 확인):
 *   pain_points    → meta.cards    (WL-74 완료 후 DB 시딩 필요)
 *   finops         → meta.features
 *   core_engines   → meta.engines
 *   role_based     → meta.roles
 *   features       → meta.items   (cards 아님 — 오늘 실측)
 */

import type { Json } from '@/types/supabase';

// ── Stats (contents.body_json) ────────────────────────────────────────────────

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
export const DEFAULT_STATS: StatItem[] = [
  {
    value: '30%',
    unit: '평균',
    label: '월 클라우드 비용 절감',
    detail: '고객사 전체 평균 기준 (최대 47% 달성)',
  },
  {
    value: '5분',
    unit: '이내',
    label: '초기 설정 완료',
    detail: 'API 키 입력만으로 즉시 연동 시작',
  },
  {
    value: '99.9%',
    unit: 'SLA',
    label: '서비스 가용성 보장',
    detail: '엔터프라이즈급 인프라 운영',
  },
];

export function parseStats(bodyJson: Json | null): StatItem[] {
  if (!Array.isArray(bodyJson)) return DEFAULT_STATS;

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

  return parsed.length > 0 ? parsed : DEFAULT_STATS;
}

// ── Steps / HowItWorks (contents.body_json) ───────────────────────────────────

export interface Step {
  step: number;
  title: string;
  subtitle?: string;       // 카드 대제목 (DB iconName 미입력 시 title 폴백)
  description: string;
  details?: string[];      // 카드 하단 체크리스트
  iconName?: string;       // Lucide 아이콘 이름 (IconRenderer에 전달)
}

export const DEFAULT_STEPS: Step[] = [
  {
    step: 1,
    title: 'Connect',
    subtitle: '클라우드 계정 연결',
    description: 'AWS, Azure, GCP의 읽기 전용 API 권한만으로 5분 이내에 연동을 완료합니다. 에이전트 설치나 코드 변경은 전혀 필요 없습니다.',
    details: ['읽기 전용 IAM 역할 사용', 'SOC2 Type II 인증 완료', 'VPC 내 데이터 이탈 없음'],
    iconName: 'Link',
  },
  {
    step: 2,
    title: 'Diagnose',
    subtitle: 'AI 비용 진단',
    description: '연결 즉시 AI가 전체 리소스를 스캔합니다. 유휴 인스턴스, 과도 프로비저닝, 미사용 스토리지를 자동으로 분류하고 절감 금액을 예측합니다.',
    details: ['100% 자동 리소스 스캔', '절감 가능 금액 실시간 산출', '우선순위별 권고 목록 생성'],
    iconName: 'ScanSearch',
  },
  {
    step: 3,
    title: 'Automate',
    subtitle: '자동 절감 실행',
    description: '승인된 정책에 따라 자동으로 절감 조치를 실행합니다. 모든 변경 사항은 로그에 기록되며 원클릭 롤백을 지원합니다.',
    details: ['정책 기반 자동 실행', '전체 변경 이력 감사 로그', '슬랙·이메일 실시간 알림'],
    iconName: 'Zap',
  },
];

export function parseSteps(bodyJson: Json | null): Step[] {
  if (!Array.isArray(bodyJson)) return DEFAULT_STEPS;

  const parsed = bodyJson.flatMap((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const s = item as Record<string, Json>;
    if (typeof s.title !== 'string' || typeof s.description !== 'string') return [];
    return [{
      step: typeof s.step === 'number' ? s.step : idx + 1,
      title: s.title,
      subtitle: typeof s.subtitle === 'string' ? s.subtitle : undefined,
      description: s.description,
      details: Array.isArray(s.details)
        ? s.details.flatMap((d) => (typeof d === 'string' ? [d] : []))
        : undefined,
      iconName: typeof s.iconName === 'string' ? s.iconName : undefined,
    }];
  });

  return parsed.length > 0 ? parsed : DEFAULT_STEPS;
}

// ── FinOps Automation (global_contents.meta.features) ────────────────────────

export interface FinOpsFeature {
  title: string;
  subtitle: string;
  description: string;
}

export function parseFinOpsFeatures(meta: Json | null): FinOpsFeature[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const features = (meta as Record<string, Json>)['features'];
  if (!Array.isArray(features)) return [];
  return features.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const f = item as Record<string, Json>;
    if (
      typeof f.title !== 'string' ||
      typeof f.subtitle !== 'string' ||
      typeof f.description !== 'string'
    ) return [];
    return [{ title: f.title, subtitle: f.subtitle, description: f.description }];
  });
}

// ── Core Engines (global_contents.meta.engines) ───────────────────────────────

export interface Engine {
  name: string;
  description: string;
  /** WL-95: Lucide 아이콘 이름 (IconRenderer에 전달). 없으면 정적 폴백 사용. */
  icon?: string;
}

export function parseEngines(meta: Json | null): Engine[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const engines = (meta as Record<string, Json>)['engines'];
  if (!Array.isArray(engines)) return [];
  return engines.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const e = item as Record<string, Json>;
    if (typeof e.name !== 'string' || typeof e.description !== 'string') return [];
    return [{
      name: e.name,
      description: e.description,
      icon: typeof e.icon === 'string' ? e.icon : undefined,
    }];
  });
}

// ── Role Based Value (global_contents.meta.roles) ─────────────────────────────

export interface RoleItem {
  role: string;
  title: string;
  description: string;
  metrics: string[];
}

export function parseRoles(meta: Json | null): RoleItem[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const roles = (meta as Record<string, Json>)['roles'];
  if (!Array.isArray(roles)) return [];
  return roles.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const r = item as Record<string, Json>;
    if (
      typeof r.role !== 'string' ||
      typeof r.title !== 'string' ||
      typeof r.description !== 'string'
    ) return [];
    const metrics = Array.isArray(r.metrics)
      ? r.metrics.flatMap((m) => (typeof m === 'string' ? [m] : []))
      : [];
    return [{ role: r.role, title: r.title, description: r.description, metrics }];
  });
}

// ── Pain Points (global_contents.meta.cards) ─────────────────────────────────
// DB 키: 'cards' (2026-04-15 실측 확인)
// 필드: icon, title, description (tag·pain은 DB 미포함 → 자동 생성 또는 undefined)

export interface PainPointCard {
  icon: string;
  title: string;
  description: string;
  tag: string;     // DB에 없으면 인덱스 기반 자동 생성 ("PROBLEM 01", "PROBLEM 02"...)
  pain?: string;   // 통계 각주 — DB에 있을 때만 노출
}

export const DEFAULT_PAIN_POINTS: PainPointCard[] = [
  {
    icon: 'EyeOff',
    tag: 'PROBLEM 01',
    title: '가시성 부족',
    description:
      'AWS, Azure, GCP 비용이 각기 다른 콘솔에 분산되어 있어 통합 현황을 파악하는 것 자체가 하루 업무가 됩니다. 어느 팀이 얼마를 쓰는지조차 알 수 없죠.',
    pain: '평균 3개 이상의 콘솔을 매일 오가는 팀',
  },
  {
    icon: 'Clock',
    tag: 'PROBLEM 02',
    title: '대응 지연',
    description:
      '이달 말에야 청구서를 받아보는 구조에서는 이미 낭비가 일어난 뒤입니다. 경고 알림 하나 설정하는 데도 수동 작업이 수반됩니다.',
    pain: '이상 지출 탐지까지 평균 18일 소요',
  },
  {
    icon: 'Puzzle',
    tag: 'PROBLEM 03',
    title: '최적화 난제',
    description:
      'Reserved Instance, Savings Plan, Spot Instance의 복잡한 조합은 클라우드 전문가도 최적 선택이 어렵습니다. 잘못된 선택은 오히려 비용을 늘립니다.',
    pain: 'RI/SP 활용률 평균 34%에 그치는 현실',
  },
];

export function parsePainPoints(meta: Json | null): PainPointCard[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return DEFAULT_PAIN_POINTS;
  const cards = (meta as Record<string, Json>)['cards'];
  if (!Array.isArray(cards)) return DEFAULT_PAIN_POINTS;

  const parsed = cards.flatMap((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const c = item as Record<string, Json>;
    if (typeof c.title !== 'string' || typeof c.description !== 'string') return [];
    return [{
      icon: typeof c.icon === 'string' ? c.icon : 'HelpCircle',
      title: c.title,
      description: c.description,
      // tag: DB 값 우선, 없으면 "PROBLEM 01" 형식으로 자동 생성
      tag: typeof c.tag === 'string' ? c.tag : `PROBLEM ${String(idx + 1).padStart(2, '0')}`,
      pain: typeof c.pain === 'string' ? c.pain : undefined,
    }];
  });

  return parsed.length > 0 ? parsed : DEFAULT_PAIN_POINTS;
}

// ── Hero Mini Stats (contents.body_json) ─────────────────────────────────────
// WL-94: HeroSection heroStats DB 이관
// DB 구조: contents.body_json = [{ value, label }, ...]
// 빈 배열 반환 → 호출부(HeroSection)가 dictionary heroStats로 폴백

export interface MiniStatItem {
  value: string;
  label: string;
}

export function parseMiniStats(bodyJson: Json | null): MiniStatItem[] {
  if (!Array.isArray(bodyJson)) return [];
  return bodyJson.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const s = item as Record<string, Json>;
    if (typeof s.value !== 'string' || typeof s.label !== 'string') return [];
    return [{ value: s.value, label: s.label }];
  });
}

// ── Footer Contact Info (contents.contact_info) ──────────────────────────────
// WL-81: Schema-driven JSON 확장
// contact_info JSON 구조:
// {
//   "email": "...", "phone": "...", "address": "...",  ← 기존 (Contact 컬럼)
//   "corporate_info": {                                 ← WL-81 신규
//     "company_name": "...", "representative": "...", "registration_number": "..."
//   },
//   "social_links": [{ "platform": "linkedin", "url": "..." }]  ← WL-81 신규
// }

export interface FooterCorporateInfo {
  companyName: string;
  representative?: string;
  registrationNumber?: string;
}

export interface FooterSocialLink {
  platform: string;
  url: string;
}

export interface FooterContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  corporate?: FooterCorporateInfo;
  socials?: FooterSocialLink[];
}

export function parseFooterContactInfo(contactInfo: Json | null): FooterContactInfo {
  if (!contactInfo || typeof contactInfo !== 'object' || Array.isArray(contactInfo)) return {};
  const obj = contactInfo as Record<string, Json>;

  // corporate_info 파싱
  let corporate: FooterCorporateInfo | undefined;
  const ci = obj.corporate_info;
  if (ci && typeof ci === 'object' && !Array.isArray(ci)) {
    const c = ci as Record<string, Json>;
    const companyName = typeof c.company_name === 'string' ? c.company_name : undefined;
    if (companyName) {
      corporate = {
        companyName,
        representative: typeof c.representative === 'string' ? c.representative : undefined,
        registrationNumber: typeof c.registration_number === 'string' ? c.registration_number : undefined,
      };
    }
  }

  // social_links 파싱 — url이 없는 항목 제거
  let socials: FooterSocialLink[] | undefined;
  const sl = obj.social_links;
  if (Array.isArray(sl)) {
    const parsed = sl.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const s = item as Record<string, Json>;
      if (typeof s.platform !== 'string' || typeof s.url !== 'string' || !s.url) return [];
      return [{ platform: s.platform, url: s.url }];
    });
    if (parsed.length > 0) socials = parsed;
  }

  return {
    email: typeof obj.email === 'string' ? obj.email : undefined,
    phone: typeof obj.phone === 'string' ? obj.phone : undefined,
    address: typeof obj.address === 'string' ? obj.address : undefined,
    corporate,
    socials,
  };
}

