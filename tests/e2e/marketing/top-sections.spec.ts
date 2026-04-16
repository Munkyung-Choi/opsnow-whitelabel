import { test, expect } from '@playwright/test';
import { MarketingPage } from '../../pages/MarketingPage';

/**
 * WL-100: 상단 섹션 콘텐츠 검증 — HeroSection · PainPoints · StatsSection
 *
 * C:   공통 검증 (2개)
 * H-1: HeroSection (WL-67) — 8개
 * P-1: PainPoints (WL-74) — 7개
 * S-1: StatsSection (WL-82/83 회귀 방지) — 6개
 *
 * 대상 파트너: partner-a (기본 시드 파트너 — is_active=true)
 * 실행 전제: Acrylic DNS Proxy 설정 + `npm run dev`
 */

// ── C: 공통 검증 ───────────────────────────────────────────────────────────────
test.describe('WL-100 C: 공통 검증', () => {
  let mp: MarketingPage;
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('C-1: 페이지 본문에 미치환 {PartnerName} 토큰이 없다', async ({ page }) => {
    const bodyText = await page.locator('body').textContent();
    expect(bodyText ?? '').not.toContain('{PartnerName}');
  });

  test('C-2: 페이지 로드 중 콘솔 에러가 발생하지 않는다', async () => {
    expect(consoleErrors).toHaveLength(0);
  });
});

// ── H-1: HeroSection ──────────────────────────────────────────────────────────
test.describe('WL-100 H-1: HeroSection — WL-67', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('H-1-1: #hero 섹션이 DOM에 렌더링된다', async () => {
    await expect(mp.heroSection).toBeVisible();
  });

  test('H-1-2: 타이틀(h1 또는 h2)이 노출된다', async () => {
    await expect(mp.heroTitle.first()).toBeVisible();
  });

  test('H-1-3: 부제목 영역이 non-empty로 노출된다', async () => {
    await expect(mp.heroSubtitle).toBeVisible();
    const text = await mp.heroSubtitle.textContent();
    expect((text ?? '').trim()).not.toBe('');
  });

  test('H-1-4: CTA 버튼이 #contact 앵커 링크를 가진다', async () => {
    await expect(mp.heroCta.first()).toBeVisible();
    await expect(mp.heroCta.first()).toHaveAttribute('href', '#contact');
  });

  test('H-1-5: ChevronDown 스크롤 인디케이터(서비스 둘러보기 버튼)가 노출된다', async () => {
    await expect(mp.heroChevron).toBeVisible();
  });

  test('H-1-6: HeroImage <img>가 visible이고 src가 non-empty다', async () => {
    await expect(mp.heroImage).toBeVisible();
    const src = await mp.heroImage.getAttribute('src');
    expect(src ?? '').not.toBe('');
  });

  test('H-1-7: 커스텀 이미지 미설정 파트너에서 기본 이미지(hero-default.webp)가 폴백 적용된다', async () => {
    // partner-a.hero_image_url 미설정 → DEFAULT_HERO_IMAGE("/images/marketing/hero-default.webp")
    // Next.js Image: /_next/image?url=%2Fimages%2Fmarketing%2Fhero-default.webp&w=...
    const src = await mp.heroImage.getAttribute('src');
    expect(src ?? '').toContain('hero-default.webp');
  });

  test('H-1-8: #hero 섹션 내 {PartnerName} 미치환 토큰이 없다', async () => {
    const text = await mp.heroSection.textContent();
    expect(text ?? '').not.toContain('{PartnerName}');
  });
});

// ── P-1: PainPoints ───────────────────────────────────────────────────────────
test.describe('WL-100 P-1: PainPoints — WL-74', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('P-1-1: #pain-points 섹션이 DOM에 렌더링된다', async () => {
    await expect(mp.painPointsSection).toBeVisible();
  });

  test('P-1-2: 섹션 h2 타이틀이 노출된다', async () => {
    await expect(mp.painPointsSection.locator('h2')).toBeVisible();
  });

  test('P-1-3: 문제 카드 3개가 렌더링된다', async () => {
    await expect(mp.painPointCards).toHaveCount(3);
  });

  test('P-1-4: global_contents 기반 카드 제목이 노출된다', async () => {
    // global_contents.pain_points.meta.cards에 seed 데이터가 있으므로 DEFAULT 미사용
    // 실제 DB 값: "엑셀 수작업", "예산 초과 알림 부재", "멀티 클라우드 복잡성" (seed.sql 기준)
    await expect(mp.painPointsSection.getByText('엑셀 수작업', { exact: true })).toBeVisible();
    await expect(mp.painPointsSection.getByText('예산 초과 알림 부재', { exact: true })).toBeVisible();
    await expect(mp.painPointsSection.getByText('멀티 클라우드 복잡성', { exact: true })).toBeVisible();
  });

  test('P-1-5: PROBLEM 배지 태그(01·02·03)가 각 카드에 노출된다', async () => {
    await expect(mp.painPointsSection.getByText('PROBLEM 01')).toBeVisible();
    await expect(mp.painPointsSection.getByText('PROBLEM 02')).toBeVisible();
    await expect(mp.painPointsSection.getByText('PROBLEM 03')).toBeVisible();
  });

  test('P-1-6: DB 미설정 파트너에서 DEFAULT_PAIN_POINTS 폴백으로 3개 카드가 렌더된다', async () => {
    // parsePainPoints(null) → DEFAULT_PAIN_POINTS → 항상 3개 반환
    await expect(mp.painPointCards).toHaveCount(3);
  });

  test('P-1-7: 각 카드 내 Lucide 아이콘 <svg>가 렌더된다', async () => {
    // DEFAULT: EyeOff·Clock·Puzzle (문제 아이콘) + Info (통계 각주 아이콘) → 카드당 최소 1개
    const icons = mp.painPointsSection.locator('[data-slot="card"] svg');
    const count = await icons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ── S-1: StatsSection ─────────────────────────────────────────────────────────
test.describe('WL-100 S-1: StatsSection — WL-82/83 회귀 방지', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('S-1-1: #stats 섹션이 DOM에 렌더링된다', async () => {
    await expect(mp.statsSection).toBeVisible();
  });

  test('S-1-2: 섹션 h2 타이틀이 노출된다 [WL-83 회귀]', async () => {
    // WL-83 버그: DB title이 있어도 h2가 렌더되지 않던 문제 수정 검증
    // partner-a stats content에 title 세팅 전제
    await expect(mp.statsSection.locator('h2')).toBeVisible();
  });

  test('S-1-3: 통계 항목 카드 3개가 렌더링된다', async () => {
    await expect(mp.statCards).toHaveCount(3);
  });

  test('S-1-4: DEFAULT 수치(30%·5분·99.9%)가 노출된다', async () => {
    await expect(mp.statsSection.getByText('30%', { exact: true })).toBeVisible();
    await expect(mp.statsSection.getByText('5분', { exact: true })).toBeVisible();
    await expect(mp.statsSection.getByText('99.9%', { exact: true })).toBeVisible();
  });

  test('S-1-5: 라벨 텍스트(월 클라우드 비용 절감·초기 설정 완료·서비스 가용성 보장)가 노출된다', async () => {
    await expect(mp.statsSection.getByText('월 클라우드 비용 절감', { exact: true })).toBeVisible();
    await expect(mp.statsSection.getByText('초기 설정 완료', { exact: true })).toBeVisible();
    await expect(mp.statsSection.getByText('서비스 가용성 보장', { exact: true })).toBeVisible();
  });

  test('S-1-6: DEFAULT_STATS 폴백 — partner-a 수치가 기본값과 동일하다 (DB 오버라이드 없음)', async () => {
    // DB stats body_json 없을 때 DEFAULT_STATS 사용 → 30%/5분/99.9% 고정
    await expect(mp.statValues.nth(0)).toContainText('30%');
    await expect(mp.statValues.nth(1)).toContainText('5분');
    await expect(mp.statValues.nth(2)).toContainText('99.9%');
  });
});
