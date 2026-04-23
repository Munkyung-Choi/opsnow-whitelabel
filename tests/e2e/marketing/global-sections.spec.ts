import { test, expect } from '@playwright/test';
import { MarketingPage } from '../../pages/MarketingPage';

/**
 * eval-arch Testability A: stats / pain_points 글로벌 섹션 콘텐츠 레벨 E2E
 *
 * 기존 partner-sections.spec.ts는 컨테이너 가시성(toBeVisible)만 확인.
 * 이 파일은 실제 카드 구조·텍스트·토큰 미치환을 검증한다.
 *
 * pain_points: global_contents 기반 → 모든 파트너 공통, DEFAULT 텍스트 직접 검증 가능.
 * stats: partner contents 기반 → partner-a DEFAULT_STATS(30%·5분·99.9%) 구조 검증.
 */

// ── PainPoints (WL-74) ────────────────────────────────────────────────────────
test.describe('PainPoints — 콘텐츠 레벨 렌더링 [eval-arch Testability A]', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('T-74-C1: #pain-points 섹션 컨테이너가 렌더링된다', async () => {
    await expect(mp.painPointsSection).toBeVisible();
  });

  test('T-74-C2: 섹션 h2 타이틀이 노출된다', async () => {
    await expect(mp.painPointsSection.locator('h2')).toBeVisible();
  });

  test('T-74-C3: 카드 3개(data-slot="card")가 렌더링된다', async () => {
    await expect(mp.painPointCards).toHaveCount(3);
  });

  test('T-74-C4: PROBLEM 01 / 02 / 03 태그가 모두 노출된다', async () => {
    await expect(mp.painPointTags).toHaveCount(3);
    await expect(mp.painPointsSection.getByText('PROBLEM 01', { exact: true })).toBeVisible();
    await expect(mp.painPointsSection.getByText('PROBLEM 02', { exact: true })).toBeVisible();
    await expect(mp.painPointsSection.getByText('PROBLEM 03', { exact: true })).toBeVisible();
  });

  test('T-74-C5: DEFAULT_PAIN_POINTS.ko 카드 타이틀 3개가 노출된다', async () => {
    await expect(mp.painPointsSection.getByText('가시성 부족', { exact: true })).toBeVisible();
    await expect(mp.painPointsSection.getByText('대응 지연', { exact: true })).toBeVisible();
    await expect(mp.painPointsSection.getByText('최적화 난제', { exact: true })).toBeVisible();
  });

  test('T-74-C6: pain_points 섹션에 미치환 {PartnerName} 토큰이 없다', async () => {
    const text = await mp.painPointsSection.textContent();
    expect(text ?? '').not.toContain('{PartnerName}');
    expect(text ?? '').not.toContain('{business_name}');
  });

  test('T-74-C7: pain_points 섹션에 raw JSON 문자열이 노출되지 않는다', async () => {
    const text = await mp.painPointsSection.textContent();
    // i18n 객체 전체 빈 문자열일 때 raw JSON이 노출되는 버그 방어 (extractI18n fix)
    expect(text ?? '').not.toMatch(/^\{"ko"/);
    expect(text ?? '').not.toContain('"ko":');
  });
});

// ── StatsSection (WL-82) ─────────────────────────────────────────────────────
test.describe('StatsSection — 콘텐츠 레벨 렌더링 [eval-arch Testability A]', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('T-82-C1: #stats 섹션 컨테이너가 렌더링된다', async () => {
    await expect(mp.statsSection).toBeVisible();
  });

  test('T-82-C2: 섹션 h2 타이틀이 노출된다', async () => {
    await expect(mp.statsSection.locator('h2')).toBeVisible();
  });

  test('T-82-C3: 통계 카드 3개(data-slot="card")가 렌더링된다', async () => {
    await expect(mp.statCards).toHaveCount(3);
  });

  test('T-82-C4: 수치 값(.tabular-nums) 3개가 모두 노출된다', async () => {
    await expect(mp.statValues).toHaveCount(3);
    // 각 카드에 수치가 비어있지 않음을 확인
    const values = await mp.statValues.allTextContents();
    for (const v of values) {
      expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  test('T-82-C5: DEFAULT_STATS.ko 수치 30% · 5분 · 99.9%가 노출된다 (contents 없는 파트너 폴백)', async ({ page }) => {
    // partner-a는 DB custom 콘텐츠 보유 → partner-test-empty-contents로 DEFAULT 폴백 검증
    const emptyMp = new MarketingPage(page, 'partner-test-empty-contents');
    await emptyMp.goto();
    await expect(emptyMp.statsSection.getByText('30%', { exact: true })).toBeVisible();
    await expect(emptyMp.statsSection.getByText('5분', { exact: true })).toBeVisible();
    await expect(emptyMp.statsSection.getByText('99.9%', { exact: true })).toBeVisible();
  });

  test('T-82-C6: stats 섹션 라벨(label)이 빈 문자열이 아니다', async () => {
    // 각 카드의 label 텍스트가 실제 문자열로 렌더됨을 확인
    await expect(
      mp.statsSection.getByText('월 클라우드 비용 절감', { exact: true }),
    ).toBeVisible();
  });

  test('T-82-C7: stats 섹션에 미치환 {PartnerName} 토큰이 없다', async () => {
    const text = await mp.statsSection.textContent();
    expect(text ?? '').not.toContain('{PartnerName}');
    expect(text ?? '').not.toContain('{business_name}');
  });

  test('T-82-C8: stats 섹션에 raw JSON 문자열이 노출되지 않는다', async () => {
    const text = await mp.statsSection.textContent();
    expect(text ?? '').not.toContain('"ko":');
  });
});
