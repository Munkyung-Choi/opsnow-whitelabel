import { test, expect } from '@playwright/test';
import { LegalPage } from '../../pages/MarketingPage';

/**
 * WL-85: 법적 고지 페이지 파트너별 분리 렌더링 — Scenario 5
 *
 * S5a: /ko/terms — 이용약관
 * S5b: /ko/privacy — 개인정보 처리방침
 * S5c: /ko/cookie-policy — WL-84(쿠키 정책 페이지) 구현 후 활성화
 *
 * 검증 기준:
 *   - 페이지가 /not-found로 리다이렉트되지 않는다 (라우트 존재 확인)
 *   - 페이지에 미치환 {PartnerName} 토큰이 노출되지 않는다
 *   - 파트너 A와 파트너 B의 법적 고지 페이지가 서로 다른 URL로 분리된다
 */

test.describe('S5a: /ko/terms — 이용약관', () => {
  test('partner-a 이용약관 페이지가 정상 렌더링된다', async ({ page }) => {
    const legalPage = new LegalPage(page, 'partner-a', 'terms');
    await legalPage.goto();

    // 404/not-found로 리다이렉트되지 않아야 함
    await expect(page).not.toHaveURL(/not-found/);

    // {PartnerName} 미치환 토큰이 노출되지 않아야 함
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('{PartnerName}');
    expect(bodyText).not.toContain('{business_name}');
  });


});

test.describe('S5b: /ko/privacy — 개인정보 처리방침', () => {
  test('partner-a 개인정보 처리방침 페이지가 정상 렌더링된다', async ({ page }) => {
    const legalPage = new LegalPage(page, 'partner-a', 'privacy');
    await legalPage.goto();

    await expect(page).not.toHaveURL(/not-found/);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('{PartnerName}');
    // {business_name} 가드: DB 정규화 완료 (2026-04-15). 이 패턴이 재등장하면 데이터 오염 신호.
    expect(bodyText).not.toContain('{business_name}');
  });
});

// ── S5c: cookie-policy [WL-84] ───────────────────────────────────────────────
test.describe('S5c: /ko/cookie-policy — 쿠키 정책 [WL-84]', () => {
  test('partner-a 쿠키 정책 페이지가 정상 렌더링된다', async ({ page }) => {
    const legalPage = new LegalPage(page, 'partner-a', 'cookie-policy');
    await legalPage.goto();

    // 404/not-found로 리다이렉트되지 않아야 함
    await expect(page).not.toHaveURL(/not-found/);

    // {PartnerName} 미치환 토큰이 노출되지 않아야 함
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('{PartnerName}');
    expect(bodyText).not.toContain('{business_name}');
  });
});


// =============================================================================
// WL-111: cookie-policy slug → cookie_policy DB 타입 명시적 매핑 검증
// =============================================================================

test.describe('WL-111: slug → section_type 명시적 매핑', () => {
  test('S5c-1: /ko/cookie-policy 정상 렌더링 (404 아님)', async ({ page }) => {
    const legalPage = new LegalPage(page, 'partner-a', 'cookie-policy');
    await legalPage.goto();
    await expect(page).not.toHaveURL(/not-found/);
    const mainText = await page.locator('main').textContent();
    expect((mainText ?? '').trim().length).toBeGreaterThan(0);
  });

  test('S5c-2: /en/cookie-policy 정상 렌더링 (404 아님)', async ({ page }) => {
    await page.goto('http://partner-a.localhost:3000/en/cookie-policy', { waitUntil: 'load' });
    await expect(page).not.toHaveURL(/not-found/);
    const mainText = await page.locator('main').textContent();
    expect((mainText ?? '').trim().length).toBeGreaterThan(0);
  });

  test('S5c-3: 잘못된 slug /ko/invalid-legal → 404 페이지 렌더링', async ({ page }) => {
    await page.goto('http://partner-a.localhost:3000/ko/invalid-legal', { waitUntil: 'load' });
    // Next.js App Router notFound()는 현재 URL 유지 + 404 UI 렌더링
    await expect(page.locator('p').filter({ hasText: '404' })).toBeVisible();
  });
});

// =============================================================================
// WL-101: Legal pages 콘텐츠 수준 검증 (기존 파일 확장)
// =============================================================================

// ── L-1: Legal pages 콘텐츠·GNB 검증 ─────────────────────────────────────────
test.describe('WL-101 L-1: Legal pages 콘텐츠 수준 검증', () => {

  test('L-1-1: /terms 페이지 메인 콘텐츠가 렌더링된다 (h1 또는 comingSoon 문구)', async ({ page }) => {
    const legalPage = new LegalPage(page, 'partner-a', 'terms');
    await legalPage.goto();

    // h1이 있거나(terms 발행 시) comingSoon paragraph가 있어야 함(미발행 시)
    const h1Count    = await page.locator('main h1').count();
    const parasCount = await page.locator('main p').count();
    expect(h1Count + parasCount).toBeGreaterThan(0);
  });

  test('L-1-2: /terms 페이지 메인 영역에 텍스트가 존재한다 (placeholder 감지 방어)', async ({ page }) => {
    const legalPage = new LegalPage(page, 'partner-a', 'terms');
    await legalPage.goto();

    const mainText = await page.locator('main').textContent();
    // 아무 내용도 없으면 (whitespace만) → 렌더링 문제
    expect((mainText ?? '').trim().length).toBeGreaterThan(0);
  });

  test('L-1-3: /privacy 페이지 메인 콘텐츠가 렌더링된다 (h1 또는 comingSoon 문구)', async ({ page }) => {
    const legalPage = new LegalPage(page, 'partner-a', 'privacy');
    await legalPage.goto();

    const h1Count    = await page.locator('main h1').count();
    const parasCount = await page.locator('main p').count();
    expect(h1Count + parasCount).toBeGreaterThan(0);
  });

  test('L-1-4: /privacy 페이지 메인 영역에 텍스트가 존재한다 (placeholder 감지 방어)', async ({ page }) => {
    const legalPage = new LegalPage(page, 'partner-a', 'privacy');
    await legalPage.goto();

    const mainText = await page.locator('main').textContent();
    expect((mainText ?? '').trim().length).toBeGreaterThan(0);
  });

  test('L-1-5: 법적 고지 페이지에 GNB(header)가 존재한다', async ({ page }) => {
    const legalPage = new LegalPage(page, 'partner-a', 'terms');
    await legalPage.goto();

    // GlobalNav가 렌더링되어 메인 페이지로 복귀 가능
    await expect(page.locator('header')).toBeVisible();
  });

  test('L-1-6: /cookie-policy 페이지 메인 영역에 텍스트가 존재한다 [WL-84]', async ({ page }) => {
    const legalPage = new LegalPage(page, 'partner-a', 'cookie-policy');
    await legalPage.goto();

    // is_published=false이므로 comingSoon 텍스트가 표시됨
    const mainText = await page.locator('main').textContent();
    expect((mainText ?? '').trim().length).toBeGreaterThan(0);
  });
});
