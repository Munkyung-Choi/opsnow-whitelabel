/**
 * [WL-57] 섹션 오케스트레이션 레지스트리
 *
 * DB(partner_sections.section_type)에서 오는 문자열을 React 컴포넌트에 1:1 매핑합니다.
 * 화이트리스트(Enum) 방식으로 동적 import 경로 오염을 원천 차단합니다.
 *
 * 보안: sectionType은 Registry 키 조회에만 사용됩니다.
 *       동적 import 경로는 모두 컴파일 타임 리터럴로 고정되어 있습니다.
 */

import dynamic from 'next/dynamic';
import type React from 'react';
import type { PartnerPageData } from './get-partner-page-data';
import type { MarketingSectionType } from '@/types/section-type';

/** 모든 섹션 컴포넌트가 준수해야 하는 기본 인터페이스 */
export interface SectionProps {
  data: unknown;
  metadata?: Record<string, unknown>;
}

// ── Module-level dynamic imports (ssr:true — SEO 보장, 번들 청크 분리) ─────────────
// 모듈 레벨에 선언하여 렌더링 사이클마다 재생성되지 않도록 보장합니다.
// App Router에서 next/dynamic + ssr:true는 서버에서 렌더링되며,
// 클라이언트 탐색 시 해당 청크만 지연 로드됩니다.

const DynamicPainPoints = dynamic(
  () => import('@/components/marketing/PainPoints'),
  { ssr: true }
);
const DynamicStatsSection = dynamic(
  () => import('@/components/marketing/StatsSection'),
  { ssr: true }
);
const DynamicHowItWorks = dynamic(
  () => import('@/components/marketing/HowItWorks'),
  { ssr: true }
);
const DynamicFinOpsAutomation = dynamic(
  () => import('@/components/marketing/FinOpsAutomation'),
  { ssr: true }
);
const DynamicCoreEngines = dynamic(
  () => import('@/components/marketing/CoreEngines'),
  { ssr: true }
);
const DynamicRoleBasedValue = dynamic(
  () => import('@/components/marketing/RoleBasedValue'),
  { ssr: true }
);
const DynamicFaqSection = dynamic(
  () => import('@/components/marketing/FaqSection'),
  { ssr: true }
);
const DynamicFinalCTASection = dynamic(
  () => import('@/components/marketing/FinalCTASection'),
  { ssr: true }
);
// ── SectionRegistry ───────────────────────────────────────────────────────────────

type SectionRenderFn = (data: PartnerPageData) => React.ReactNode;

/**
 * section_type → 렌더 함수 매핑 테이블.
 * `as const` + `Readonly`로 런타임 변조를 방지합니다.
 */
const SECTION_REGISTRY: Readonly<Record<MarketingSectionType, SectionRenderFn>> = {
  pain_points: (data) => (
    <DynamicPainPoints
      content={data.globalContents.get('pain_points') ?? null}
      locale={data.locale}
    />
  ),
  stats: (data) => (
    <DynamicStatsSection
      content={data.contents.get('stats') ?? null}
      locale={data.locale}
    />
  ),
  how_it_works: (data) => (
    <DynamicHowItWorks
      content={data.contents.get('how_it_works') ?? null}
      locale={data.locale}
    />
  ),
  finops_automation: (data) => (
    <DynamicFinOpsAutomation
      content={data.globalContents.get('finops_automation') ?? null}
      locale={data.locale}
    />
  ),
  core_engines: (data) => (
    <DynamicCoreEngines
      content={data.globalContents.get('core_engines') ?? null}
      partnerName={data.partner.business_name}
      locale={data.locale}
    />
  ),
  role_based_value: (data) => (
    <DynamicRoleBasedValue
      content={data.globalContents.get('role_based_value') ?? null}
      partnerName={data.partner.business_name}
      locale={data.locale}
    />
  ),
  faq: (data) => (
    <DynamicFaqSection content={data.globalContents.get('faq') ?? null} />
  ),
  final_cta: (data) => (
    <DynamicFinalCTASection
      content={data.contents.get('final_cta') ?? null}
      locale={data.locale}
    />
  ),
} as const;

/**
 * SectionRegistry를 통해 section_type에 해당하는 컴포넌트를 렌더링합니다.
 *
 * - 등록된 section_type: 해당 컴포넌트를 반환합니다.
 * - 미등록 section_type: null을 반환하고 서버 로그에 경고를 남깁니다.
 *   (console.warn은 서버사이드에서 실행되므로 브라우저 콘솔에 노출되지 않습니다.)
 */
export function renderSection(
  sectionType: string,
  data: PartnerPageData,
): React.ReactNode {
  const renderFn = SECTION_REGISTRY[sectionType as keyof typeof SECTION_REGISTRY];
  if (!renderFn) {
    console.warn(
      `[SectionRegistry] Unknown section_type: "${sectionType}" — skipping render. ` +
        `Registered types: ${Object.keys(SECTION_REGISTRY).join(', ')}`
    );
    return null;
  }
  return renderFn(data);
}
