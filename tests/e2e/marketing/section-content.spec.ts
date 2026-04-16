import { test, expect } from '@playwright/test';
import { MarketingPage } from '../../pages/MarketingPage';

/**
 * WL-98: 마케팅 5개 섹션(WL-75~79) 콘텐츠 검증 E2E
 *
 * 각 섹션의 주요 콘텐츠(제목·카드·지표·토큰 보간)가 DOM에 올바르게 렌더링되는지 검증한다.
 * 인터랙션(탭 전환·아코디언 토글·필터)은 `faq-interaction.spec.ts`에서 다룬다.
 *
 * 대상 파트너: partner-a (기본 시드 파트너 — is_active=true)
 * 실행 전제: Acrylic DNS Proxy 설정 + `npm run dev` (CLAUDE.md §10.1 참조)
 */

// ── WL-75: HowItWorks ────────────────────────────────────────────────────────
test.describe('WL-75 HowItWorks — 3단계 스텝 렌더링', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('T-75-1: #how-it-works 섹션이 DOM에 렌더링된다', async () => {
    await expect(mp.howItWorksSection).toBeVisible();
  });

  test('T-75-2: 섹션 h2 타이틀이 노출된다', async () => {
    await expect(mp.howItWorksSection.locator('h2')).toBeVisible();
  });

  test('T-75-3: 스텝 카드 3개가 렌더링된다 (데스크톱 기준)', async () => {
    // HowItWorks는 데스크톱(md+)·모바일 레이아웃이 모두 DOM에 존재한다.
    // howItWorksCards 로케이터는 :visible로 현재 뷰포트의 h3만 집계.
    await expect(mp.howItWorksCards).toHaveCount(3);
  });

  test('T-75-4: 스텝 1 "Connect" 제목이 노출된다', async () => {
    await expect(
      mp.howItWorksSection.getByText('Connect', { exact: true }).first(),
    ).toBeVisible();
  });

  test('T-75-5: 스텝 2 "Diagnose" 제목이 노출된다', async () => {
    await expect(
      mp.howItWorksSection.getByText('Diagnose', { exact: true }).first(),
    ).toBeVisible();
  });

  test('T-75-6: 스텝 3 "Automate" 제목이 노출된다', async () => {
    await expect(
      mp.howItWorksSection.getByText('Automate', { exact: true }).first(),
    ).toBeVisible();
  });

  test('T-75-7: 고정 섹션 정책 — DB 덮어쓰기와 무관하게 항상 3개 스텝 렌더링', async () => {
    // DEFAULT_STEPS가 항상 사용되며(body_json 무시)
    // 섹션 헤더(title/subtitle)는 DB에서 읽으므로 스텝 카드 콘텐츠만 검증
    await expect(mp.howItWorksCards).toHaveCount(3);
    const cardTexts = await mp.howItWorksSection
      .locator('.rounded-xl:visible')
      .allTextContents();
    expect(cardTexts.join(' ')).not.toContain('CloudSave');
  });
});

// ── WL-76: FinOpsAutomation ──────────────────────────────────────────────────
test.describe('WL-76 FinOpsAutomation — As-Is/To-Be 비교', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('T-76-1: #finops 섹션이 DOM에 렌더링된다', async () => {
    await expect(mp.finopsSection).toBeVisible();
  });

  test('T-76-2: 섹션 h2 타이틀이 노출된다', async () => {
    await expect(mp.finopsSection.locator('h2')).toBeVisible();
  });

  test('T-76-3: 비교 행 3개(Visibility/Commitment/Operation) 카테고리 레이블 렌더링', async () => {
    await expect(mp.finopsSection.getByText(/Visibility/)).toBeVisible();
    await expect(mp.finopsSection.getByText(/Commitment/)).toBeVisible();
    await expect(mp.finopsSection.getByText(/Operation/)).toBeVisible();
  });

  test('T-76-4: As-Is 카드 3개의 태그가 렌더링된다', async () => {
    await expect(mp.finopsSection.getByText('사후 확인', { exact: true })).toBeVisible();
    await expect(mp.finopsSection.getByText('방치된 자산', { exact: true })).toBeVisible();
    await expect(mp.finopsSection.getByText('피로도 증가', { exact: true })).toBeVisible();
  });

  test('T-76-5: To-Be 카드 3개의 태그가 렌더링된다', async () => {
    await expect(mp.finopsSection.getByText('실시간', { exact: true })).toBeVisible();
    await expect(mp.finopsSection.getByText('자동화', { exact: true })).toBeVisible();
    await expect(mp.finopsSection.getByText('선제 대응', { exact: true })).toBeVisible();
  });

  test('T-76-6: 모바일 뷰(375px) — 아래 방향 화살표 표시, 오른쪽 화살표 숨김', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    // Acrylic DNS 미설정 환경을 방지하기 위해 재이동 없이 뷰포트만 조정 (CSS 반응형)
    await expect(mp.finopsArrowDown).toBeVisible();
    await expect(mp.finopsArrowRight).toBeHidden();
  });
});

// ── WL-77: CoreEngines ───────────────────────────────────────────────────────
test.describe('WL-77 CoreEngines — 3대 엔진 카드 + 지표', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('T-77-1: #core-engines 섹션이 DOM에 렌더링된다 (버그 수정 후)', async () => {
    await expect(mp.coreEnginesSection).toBeVisible();
  });

  test('T-77-2: 고정 타이틀 "절감을 현실로 만드는 핵심 엔진"이 노출된다', async () => {
    await expect(
      mp.coreEnginesSection.getByText('절감을 현실로 만드는 핵심 엔진'),
    ).toBeVisible();
  });

  test('T-77-3: 부제목에 파트너명이 치환된다 ({PartnerName} 미포함)', async () => {
    const subtitle = mp.coreEnginesSection.locator('p').first();
    const text = await subtitle.textContent();
    expect(text ?? '').not.toContain('{PartnerName}');
    // 부제 템플릿의 일부 고정 문구로 보간 성공 간접 검증
    expect(text ?? '').toContain('의 세 가지 엔진');
  });

  test('T-77-4: 엔진 카드 3개(AI 비용 예측/자동 절감 권고/멀티 클라우드 통합)', async () => {
    await expect(mp.coreEnginesSection.getByText('AI 비용 예측')).toBeVisible();
    await expect(mp.coreEnginesSection.getByText('자동 절감 권고')).toBeVisible();
    await expect(mp.coreEnginesSection.getByText('멀티 클라우드 통합')).toBeVisible();
  });

  test('T-77-5: 각 카드에 지표 콜아웃 96% / 27% / 3개가 노출된다', async () => {
    await expect(mp.coreEnginesSection.getByText('96%', { exact: true })).toBeVisible();
    await expect(mp.coreEnginesSection.getByText('27%', { exact: true })).toBeVisible();
    await expect(mp.coreEnginesSection.getByText('3개', { exact: true })).toBeVisible();
  });

  test('T-77-6: 고정 섹션 정책 — DB title과 무관하게 하드코딩 타이틀 유지', async () => {
    // 컴포넌트는 DB global_contents.title을 무시하고 항상 하드코딩 문자열을 렌더한다.
    await expect(
      mp.coreEnginesSection.getByText('절감을 현실로 만드는 핵심 엔진'),
    ).toBeVisible();
  });
});

// ── WL-78: RoleBasedValue ────────────────────────────────────────────────────
test.describe('WL-78 RoleBasedValue — CTO/DevOps/CFO 탭', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('T-78-1: #role-value 섹션이 DOM에 렌더링된다', async () => {
    await expect(mp.roleValueSection).toBeVisible();
  });

  test('T-78-2: 탭 3개(CTO/DevOps/CFO)가 렌더링된다', async () => {
    await expect(mp.roleTabsList).toBeVisible();
    await expect(mp.roleTabCto).toBeVisible();
    await expect(mp.roleTabDevops).toBeVisible();
    await expect(mp.roleTabCfo).toBeVisible();
  });

  test('T-78-3: 기본값 CTO 탭 콘텐츠가 표시된다', async () => {
    await expect(
      mp.roleValueSection.getByText('기술 전략과 비용 효율을 동시에 달성하세요'),
    ).toBeVisible();
  });

  test('T-78-4: DevOps 탭 클릭 시 콘텐츠가 전환된다', async () => {
    await mp.roleTabDevops.click();
    await expect(
      mp.roleValueSection.getByText('인프라 운영 효율을 코드처럼 자동화하세요'),
    ).toBeVisible();
  });

  test('T-78-5: CFO 탭 클릭 시 콘텐츠가 전환된다', async () => {
    await mp.roleTabCfo.click();
    await expect(
      mp.roleValueSection.getByText('클라우드 예산을 예측 가능한 고정비로 만드세요'),
    ).toBeVisible();
  });

  test('T-78-6: 섹션 내 {PartnerName} 미치환 토큰이 없다', async () => {
    const sectionText = await mp.roleValueSection.textContent();
    expect(sectionText ?? '').not.toContain('{PartnerName}');
  });

  test('T-78-7: 인용구(italic)에 {PartnerName} 미포함', async () => {
    // CTO 기본 인용구 중 파트너명 삽입 부위: "...{PartnerName} 대시보드..."
    const quote = mp.roleValueSection.locator('p.italic').first();
    const text = await quote.textContent();
    expect(text ?? '').not.toContain('{PartnerName}');
    expect(text ?? '').toContain('대시보드');
  });

  test('T-78-8: CTA 카드가 "#contact" 앵커 링크를 가진다', async () => {
    const ctaLink = mp.roleValueSection.getByRole('link', { name: /지금 신청하기/ }).first();
    await expect(ctaLink).toHaveAttribute('href', '#contact');
  });
});

// ── WL-79: FaqSection 콘텐츠(인터랙션은 faq-interaction.spec.ts) ──────────────
test.describe('WL-79 FaqSection — 콘텐츠 렌더링', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('T-79-1: #faq 섹션이 DOM에 렌더링된다', async () => {
    await expect(mp.faqSection).toBeVisible();
  });

  test('T-79-2: 섹션 h2 타이틀이 노출된다', async () => {
    await expect(mp.faqSection.locator('h2')).toBeVisible();
  });

  test('T-79-3: DEFAULT_FAQ_ITEMS 첫 번째 항목(아코디언)이 기본 열림 상태', async () => {
    // Radix Accordion: 열린 항목의 content는 data-state="open" 속성을 가진다.
    const firstContent = mp.faqAccordionItems.first().locator('[data-state="open"]');
    await expect(firstContent.first()).toBeVisible();
  });

  test('T-79-4: 아코디언 최대 5개 항목이 표시된다', async () => {
    const count = await mp.faqAccordionItems.count();
    expect(count).toBeLessThanOrEqual(5);
    expect(count).toBeGreaterThan(0);
  });

  test('T-79-5: 카테고리 필터 버튼 6개(전체 + 5개 카테고리)가 렌더링된다', async () => {
    await expect(mp.faqCategoryButtons).toHaveCount(6);
    // 개별 라벨 검증
    await expect(mp.faqSection.getByRole('button', { name: '전체', exact: true })).toBeVisible();
    await expect(mp.faqSection.getByRole('button', { name: '비용', exact: true })).toBeVisible();
    await expect(mp.faqSection.getByRole('button', { name: '리소스', exact: true })).toBeVisible();
    await expect(mp.faqSection.getByRole('button', { name: '거버넌스', exact: true })).toBeVisible();
    await expect(mp.faqSection.getByRole('button', { name: 'AutoSavings', exact: true })).toBeVisible();
    await expect(mp.faqSection.getByRole('button', { name: '세팅', exact: true })).toBeVisible();
  });

  test('T-79-6: "전체" 필터 기본 활성 상태 (border-primary 스타일)', async () => {
    const allButton = mp.faqSection.getByRole('button', { name: '전체', exact: true });
    // 활성 상태는 cn()으로 'border-primary bg-primary ... text-primary-foreground' 클래스가 추가됨
    await expect(allButton).toHaveClass(/border-primary/);
  });
});
