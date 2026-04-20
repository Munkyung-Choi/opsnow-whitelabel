import { test, expect } from '@playwright/test';

/**
 * WL-96: FAQ Hub & Detail 페이지 E2E 검증
 *
 * H-1: Hub 페이지 렌더링 (URL, Hero, CategoryTabs, ItemList)
 * H-2: 카테고리 필터링 (client-side state — URL 변경 없음)
 * H-3: 상세 페이지 이동 및 렌더링
 * H-4: 상세 페이지 "FAQ로 돌아가기" 네비게이션
 * H-5: 검색 기능
 * H-6: 페이지네이션
 *
 * 시딩 전제:
 *   - seed_faq_global_content.sql 실행 완료 (WL-103)
 *   - 5개 카테고리 (billing 3개·resources 2개·governance 1개·autosavings 1개·setup 1개)
 *
 * 실행 전제: Acrylic DNS + `npm run dev`
 */

const BASE = 'http://partner-a.localhost:3000/ko/faq';
const BASE_DETAIL = 'http://partner-a.localhost:3000/ko/faq/';
const FIRST_SLUG = 'how-billing-works';

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
    const allTab = page.getByRole('tab', { name: /전체/ });
    await expect(allTab).toBeVisible();
    await expect(allTab).toHaveAttribute('aria-selected', 'true');
    // URL에 category 파라미터 없음
    expect(page.url()).not.toContain('category=');
  });

  test('H-1-4: DB 시딩 후 — FaqItemCard 목록이 1개 이상 렌더링된다', async ({ page }) => {
    await page.goto(BASE);
    const cards = page.locator('[data-testid="faq-card"]');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('H-1-5: Hero 영역 — 검색 입력창이 존재한다', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByPlaceholder(/검색하세요/)).toBeVisible();
  });
});

// ── H-2: 카테고리 필터링 (client-side) ─────────────────────────────────────────
test.describe('WL-96 H-2: 카테고리 필터링', () => {

  test('H-2-1: 카테고리 탭 클릭 시 URL 변경 없이 해당 카테고리 항목만 표시된다', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('[data-testid="faq-card"]').first()).toBeVisible();

    // billing 카테고리 탭 클릭 (label은 시딩 데이터 기준)
    await page.getByRole('tab', { name: /결제|billing/i }).click();

    // URL 변경 없음 (client-side state)
    expect(page.url()).not.toContain('category=');
    // 필터링된 항목이 보임
    await expect(page.locator('[data-testid="faq-card"]').first()).toBeVisible();
  });

  test('H-2-2: ?category={id} URL 직접 진입 시 해당 탭이 활성화 상태로 렌더링된다', async ({ page }) => {
    await page.goto(`${BASE}?category=billing`);
    // billing 탭이 aria-selected="true"
    const billingTab = page.getByRole('tab', { name: /결제|billing/i });
    await expect(billingTab).toBeVisible();
    await expect(billingTab).toHaveAttribute('aria-selected', 'true');
  });

  test('H-2-3: billing 필터 적용 후 표시 항목 수가 전체보다 적다', async ({ page }) => {
    await page.goto(BASE);
    const allCards = page.locator('[data-testid="faq-card"]');
    await expect(allCards.first()).toBeVisible();
    const totalCount = await allCards.count();

    // billing 탭 클릭
    await page.getByRole('tab', { name: /결제|billing/i }).click();
    await expect(page.locator('[data-testid="faq-card"]').first()).toBeVisible();
    const filteredCount = await page.locator('[data-testid="faq-card"]').count();

    expect(filteredCount).toBeLessThan(totalCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('H-2-4: "전체" 탭 재클릭 시 전체 항목이 복원된다', async ({ page }) => {
    await page.goto(BASE);
    const allCards = page.locator('[data-testid="faq-card"]');
    await expect(allCards.first()).toBeVisible();
    const totalCount = await allCards.count();

    await page.getByRole('tab', { name: /결제|billing/i }).click();
    await page.getByRole('tab', { name: /전체/ }).click();
    await expect(page.locator('[data-testid="faq-card"]').first()).toBeVisible();
    const restoredCount = await page.locator('[data-testid="faq-card"]').count();

    expect(restoredCount).toBe(totalCount);
  });
});

// ── H-3: 상세 페이지 ────────────────────────────────────────────────────────────
test.describe('WL-96 H-3: FAQ 상세 페이지', () => {

  test('H-3-1: FaqItemCard 클릭 시 /ko/faq/{slug} URL로 이동한다', async ({ page }) => {
    await page.goto(BASE);
    const firstCard = page.locator('[data-testid="faq-card"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await page.waitForURL(/\/ko\/faq\/[^/]+$/);
    expect(page.url()).toMatch(/\/ko\/faq\/[^/]+$/);
  });

  test('H-3-2: 상세 페이지 — 질문 제목이 h1으로 렌더링된다', async ({ page }) => {
    await page.goto(`${BASE_DETAIL}${FIRST_SLUG}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('요금 구조는');
  });

  test('H-3-3: 상세 페이지 — 마크다운 본문이 .prose 영역 내에 렌더링된다', async ({ page }) => {
    await page.goto(`${BASE_DETAIL}${FIRST_SLUG}`);
    await expect(page.locator('.prose')).toBeVisible();
    const proseText = await page.locator('.prose').textContent();
    expect(proseText?.length ?? 0).toBeGreaterThan(10);
  });

  test('H-3-4: 상세 페이지 — 존재하지 않는 slug는 not-found 처리된다', async ({ page }) => {
    await page.goto(`${BASE_DETAIL}this-slug-does-not-exist-xyz-404`);
    await expect(page.locator('.prose')).not.toBeVisible();
  });
});

// ── H-4: 상세 → Hub 네비게이션 ─────────────────────────────────────────────────
test.describe('WL-96 H-4: 상세 → Hub 뒤로가기', () => {

  test('H-4-1: "FAQ 목록으로" 링크가 /ko/faq로 이동한다', async ({ page }) => {
    await page.goto(`${BASE_DETAIL}${FIRST_SLUG}`);
    const backLink = page.getByRole('link', { name: 'FAQ 목록으로' });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await page.waitForURL(/\/ko\/faq$/);
    expect(page.url()).toMatch(/\/ko\/faq$/);
  });
});

// ── H-5: 검색 기능 ──────────────────────────────────────────────────────────────
test.describe('WL-96 H-5: 검색 기능', () => {

  test('H-5-1: 검색어 입력 후 검색 버튼 클릭 시 검색 결과 뷰로 전환된다', async ({ page }) => {
    await page.goto(BASE);
    await page.getByPlaceholder(/검색하세요/).fill('요금');
    await page.getByRole('button', { name: '검색' }).click();

    // "검색 지우기" 버튼이 나타나야 함
    await expect(page.getByRole('button', { name: '검색 지우기' })).toBeVisible();
    // 결과 카드들이 보여야 함
    await expect(page.locator('[data-testid="faq-card"]').first()).toBeVisible();
  });

  test('H-5-2: 매칭 없는 검색어 입력 시 "일치하는 질문이 없습니다" 메시지 노출', async ({ page }) => {
    await page.goto(BASE);
    await page.getByPlaceholder(/검색하세요/).fill('xyzxyz_존재하지않는검색어');
    await page.getByRole('button', { name: '검색' }).click();

    await expect(page.getByText('일치하는 질문이 없습니다')).toBeVisible();
  });

  test('H-5-3: "검색 지우기" 클릭 시 목록 뷰로 복귀한다', async ({ page }) => {
    await page.goto(BASE);
    await page.getByPlaceholder(/검색하세요/).fill('요금');
    await page.getByRole('button', { name: '검색' }).click();
    await expect(page.getByRole('button', { name: '검색 지우기' })).toBeVisible();

    await page.getByRole('button', { name: '검색 지우기' }).click();

    // 검색 지우기 버튼이 사라지고 목록 뷰 복귀
    await expect(page.getByRole('button', { name: '검색 지우기' })).not.toBeVisible();
    await expect(page.locator('[data-testid="faq-card"]').first()).toBeVisible();
  });
});

// ── H-6: 페이지네이션 ──────────────────────────────────────────────────────────
test.describe('WL-96 H-6: 페이지네이션', () => {

  test('H-6-1: 페이지당 항목 수 선택기(Select)가 존재한다', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('[data-testid="faq-card"]').first()).toBeVisible();
    // 페이지당 Select 영역 확인
    await expect(page.getByText('페이지당')).toBeVisible();
  });
});

// ── Smoke ────────────────────────────────────────────────────────────────────
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
