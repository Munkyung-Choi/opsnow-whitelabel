import { test, expect } from '@playwright/test';

/**
 * WL-96: FAQ Hub & Detail 페이지 E2E 검증
 * WL-105: DB 시딩 완료 후 전체 todo → passing 전환 (2026-04-16)
 *
 * H-1: Hub 페이지 렌더링 (URL, Hero, CategoryTabs, ItemList)
 * H-2: 카테고리 필터링 (URL searchParam 기반)
 * H-3: 상세 페이지 이동 및 렌더링
 * H-4: 상세 페이지 "FAQ로 돌아가기" 네비게이션
 *
 * 시딩 전제:
 *   - seed_faq_global_content.sql 실행 완료 (WL-103)
 *   - 5개 카테고리 (billing 3개·resources 2개·governance 1개·autosavings 1개·setup 1개)
 *
 * 실행 전제: Acrylic DNS + `npm run dev`
 */

const BASE = 'http://partner-a.localhost:3000/ko/faq';
const BASE_DETAIL = 'http://partner-a.localhost:3000/ko/faq/';
const FIRST_SLUG = 'how-billing-works'; // billing 카테고리 첫 번째 시딩 항목

// ── H-1: Hub 페이지 기본 렌더링 ────────────────────────────────────────────────
test.describe('WL-96 H-1: FAQ Hub 기본 렌더링', () => {

  test('H-1-1: /ko/faq URL이 200으로 응답한다', async ({ page }) => {
    const res = await page.goto(BASE);
    expect(res?.status()).toBe(200);
  });

  test('H-1-2: Hero 영역 — 타이틀("무엇을 도와드릴까요?")이 보인다', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByRole('heading', { name: '무엇을 도와드릴까요?' })).toBeVisible();
  });

  test('H-1-3: "전체" 카테고리 탭이 기본 활성화 상태로 노출된다', async ({ page }) => {
    await page.goto(BASE);
    // URL에 ?category 파라미터 없음 → "전체" 탭 활성 상태 (allCategory = "전체")
    await expect(page.getByRole('link', { name: '전체' }).or(
      page.getByRole('button', { name: '전체' })
    ).first()).toBeVisible();
    // 현재 URL에 category 파라미터 없음 = 전체 표시 상태
    expect(page.url()).not.toContain('category=');
  });

  test('H-1-4: DB 시딩 후 — FaqItemCard 목록이 1개 이상 렌더링된다', async ({ page }) => {
    await page.goto(BASE);
    // FaqItemCard는 <li> 안의 <a href="/ko/faq/{slug}"> 링크로 렌더링됨
    const cards = page.locator('ul > li > a[href*="/ko/faq/"]');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('H-1-5: 결과 없는 카테고리 → "해당 카테고리의 질문이 없습니다." 메시지 [skip — empty-category 픽스처 없음]', async () => {
    // 현재 시딩된 5개 카테고리에 모두 항목이 존재.
    // invalid category param은 page.tsx에서 null로 처리되어 전체 표시.
    // empty-category 픽스처 추가 시 활성화.
    test.skip(true, '모든 시딩 카테고리에 FAQ 항목이 존재 — empty-category 전용 픽스처 필요');
  });
});

// ── H-2: 카테고리 필터링 ────────────────────────────────────────────────────────
test.describe('WL-96 H-2: 카테고리 필터링', () => {

  test('H-2-1: 카테고리 탭 클릭 시 URL에 ?category={id} searchParam이 반영된다', async ({ page }) => {
    await page.goto(BASE);
    // "결제/요금" 탭 클릭 (billing 카테고리 ko label)
    await page.getByRole('link', { name: '결제/요금' }).or(
      page.getByRole('button', { name: '결제/요금' })
    ).first().click();
    await page.waitForURL(/category=billing/);
    expect(page.url()).toContain('category=billing');
  });

  test('H-2-2: ?category={id} URL 직접 진입 시 해당 탭이 활성화 상태로 렌더링된다', async ({ page }) => {
    await page.goto(`${BASE}?category=billing`);
    // "결제/요금" 탭이 활성화된 상태 (aria-selected 또는 active 클래스)
    const billingTab = page.getByRole('link', { name: '결제/요금' }).or(
      page.getByRole('button', { name: '결제/요금' })
    ).first();
    await expect(billingTab).toBeVisible();
    // 활성화 탭은 aria-current 또는 data-state="active" 속성 보유
    const isActive =
      (await billingTab.getAttribute('aria-current')) !== null ||
      (await billingTab.getAttribute('data-state')) === 'active' ||
      (await billingTab.getAttribute('data-active')) !== null;
    expect(isActive).toBe(true);
  });

  test('H-2-3: billing 필터 적용 후 표시 항목 수가 전체보다 적다 (타 카테고리 항목 숨김)', async ({ page }) => {
    // 전체 항목 수 조회 (category 파라미터 없음)
    await page.goto(BASE);
    const allCards = page.locator('ul > li > a[href*="/ko/faq/"]');
    await expect(allCards.first()).toBeVisible();
    const totalCount = await allCards.count();

    // billing 필터 적용 후 항목 수 조회
    await page.goto(`${BASE}?category=billing`);
    const filteredCards = page.locator('ul > li > a[href*="/ko/faq/"]');
    await expect(filteredCards.first()).toBeVisible();
    const filteredCount = await filteredCards.count();

    // billing: 3개 / 전체: 8개 → 필터 후 더 적어야 함
    expect(filteredCount).toBeLessThan(totalCount);
    expect(filteredCount).toBeGreaterThan(0);
  });
});

// ── H-3: 상세 페이지 ────────────────────────────────────────────────────────────
test.describe('WL-96 H-3: FAQ 상세 페이지', () => {

  test('H-3-1: FaqItemCard 클릭 시 /ko/faq/{slug} URL로 이동한다', async ({ page }) => {
    await page.goto(BASE);
    const firstCard = page.locator('ul > li > a[href*="/ko/faq/"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await page.waitForURL(/\/ko\/faq\/[^/]+$/);
    expect(page.url()).toMatch(/\/ko\/faq\/[^/]+$/);
  });

  test('H-3-2: 상세 페이지 — 질문 제목이 h1으로 렌더링된다', async ({ page }) => {
    await page.goto(`${BASE_DETAIL}${FIRST_SLUG}`);
    // "요금 구조는 어떻게 되나요?" (seed_faq_global_content.sql billing 첫 번째 항목)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('요금 구조는');
  });

  test('H-3-3: 상세 페이지 — 마크다운 본문이 .prose 영역 내에 렌더링된다', async ({ page }) => {
    await page.goto(`${BASE_DETAIL}${FIRST_SLUG}`);
    await expect(page.locator('.prose')).toBeVisible();
    // 본문에 마크다운 렌더링된 텍스트가 존재
    const proseText = await page.locator('.prose').textContent();
    expect(proseText?.length ?? 0).toBeGreaterThan(10);
  });

  test('H-3-4: 상세 페이지 — 존재하지 않는 slug는 404 처리된다', async ({ page }) => {
    const res = await page.goto(`${BASE_DETAIL}this-slug-does-not-exist-xyz-404`);
    expect(res?.status()).toBe(404);
  });
});

// ── H-4: 상세 → Hub 네비게이션 ─────────────────────────────────────────────────
test.describe('WL-96 H-4: 상세 → Hub 뒤로가기', () => {

  test('H-4-1: "FAQ 목록으로" 링크가 /ko/faq로 이동한다', async ({ page }) => {
    await page.goto(`${BASE_DETAIL}${FIRST_SLUG}`);
    // t.faq.backToFaq = "FAQ 목록으로"
    const backLink = page.getByRole('link', { name: 'FAQ 목록으로' });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await page.waitForURL(/\/ko\/faq$/);
    expect(page.url()).toMatch(/\/ko\/faq$/);
  });
});

// ── 활성화된 스모크 테스트 (DB 의존 없음) ──────────────────────────────────────
test.describe('WL-96 Smoke: Hub 페이지 정상 응답', () => {
  test('S-1: /ko/faq 페이지가 400 미만으로 응답한다', async ({ page }) => {
    const res = await page.goto(BASE);
    expect(res?.status()).toBeLessThan(400);
  });

  test('S-2: /ko/faq 페이지에 <main> 요소가 존재한다', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('main')).toBeVisible();
  });
});
