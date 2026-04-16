import { test, expect } from '@playwright/test';
import { MarketingPage } from '../../pages/MarketingPage';

/**
 * WL-101: 라우팅·멀티 파트너 격리 검증
 *
 * R-1: 404 라우팅 (3개 실행 + 1개 skip)
 *   - R-1-4: is_active=false 파트너 픽스처 없음 → skip
 *
 * M-1: 멀티 파트너 격리 (5개)
 *   - M-1-3: partner-b stats is_visible=false → partner-a 단독 검증
 *
 * 파트너:
 *   partner-a: subdomain='partner-a', business_name='CloudSave', theme_key='gray'
 *   partner-b: subdomain='partner-b', business_name='DataFlow', theme_key='blue'
 *
 * 실행 전제: Acrylic DNS Proxy 설정 + `npm run dev`
 */

const BASE_A = 'http://partner-a.localhost:3000';
const BASE_B = 'http://partner-b.localhost:3000';
const NONEXISTENT = 'http://nonexistent.localhost:3000';

// ── R-1: 404 라우팅 ───────────────────────────────────────────────────────────
test.describe('WL-101 R-1: 404 라우팅', () => {

  test('R-1-1: 존재하지 않는 서브도메인 접근 시 /not-found 페이지로 이동한다', async ({ page }) => {
    await page.goto(`${NONEXISTENT}/`, { waitUntil: 'load' });
    // proxy가 validatePartner 실패 → /not-found 리다이렉트
    expect(page.url()).toContain('/not-found');
  });

  test('R-1-2: 파트너 도메인에서 존재하지 않는 경로 접근 시 404 페이지가 렌더링된다', async ({ page }) => {
    await page.goto(`${BASE_A}/this-path-does-not-exist-xyz`, { waitUntil: 'load' });
    // Next.js global not-found.tsx: "페이지를 찾을 수 없습니다"
    await expect(page.getByText('페이지를 찾을 수 없습니다')).toBeVisible();
  });

  test('R-1-3: /not-found 페이지가 에러 메시지와 함께 렌더링된다', async ({ page }) => {
    await page.goto(`${NONEXISTENT}/`, { waitUntil: 'load' });
    // app/not-found/page.tsx: "설정 대기 중" h1 + 설명 문구
    await expect(page.getByText('설정 대기 중')).toBeVisible();
    // 파트너 관리자 문의 안내 문구
    await expect(page.getByText(/파트너 관리자/)).toBeVisible();
  });

  test('R-1-4: is_active=false 파트너 접근 시 /not-found 리다이렉트 [skip — 픽스처 없음]', async () => {
    // is_active=false인 파트너 DB 픽스처가 없어 검증 불가
    // WL-102 DB 픽스처 구축 후 활성화
    test.skip(true, 'is_active=false 파트너 픽스처 미구축 — WL-102 globalSetup 후 활성화');
  });
});

// ── M-1: 멀티 파트너 격리 ────────────────────────────────────────────────────
test.describe('WL-101 M-1: 멀티 파트너 격리', () => {

  test('M-1-1: partner-a 페이지에 business_name "CloudSave"가 노출된다', async ({ page }) => {
    await page.goto(`${BASE_A}/`, { waitUntil: 'load' });
    // GNB 로고 링크 aria-label = "{business_name} 홈"
    await expect(page.locator('header').getByRole('link', { name: /CloudSave/ })).toBeVisible();
  });

  test('M-1-2: partner-b 페이지에 business_name "DataFlow"가 노출되고 partner-a와 다르다', async ({ page }) => {
    await page.goto(`${BASE_B}/`, { waitUntil: 'load' });
    await expect(page.locator('header').getByRole('link', { name: /DataFlow/ })).toBeVisible();
    // partner-a 상호명이 partner-b 페이지에 노출되지 않아야 함
    const headerText = await page.locator('header').textContent();
    expect(headerText ?? '').not.toContain('CloudSave');
  });

  test('M-1-3: partner-a DEFAULT Stats 수치(30%·5분·99.9%)가 정상 노출된다', async ({ page }) => {
    // partner-b stats is_visible=false (seed) → partner-a 단독 검증
    const mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
    await expect(mp.statsSection.getByText('30%', { exact: true })).toBeVisible();
    await expect(mp.statsSection.getByText('5분', { exact: true })).toBeVisible();
    await expect(mp.statsSection.getByText('99.9%', { exact: true })).toBeVisible();
  });

  test('M-1-4: partner-a와 partner-b의 --primary CSS Variable 값이 다르다 [테마 격리]', async ({ page, browser }) => {
    // partner-a: theme_key='gray' → --primary: '243 48% 9%'
    // partner-b: theme_key='blue' → --primary: '234 100% 36%'
    // 테마 변수는 [partnerId]/layout.tsx의 <div style={themeVars}> 인라인 스타일로 주입됨
    // → document.documentElement이 아닌 [style*="--primary"] 요소에서 읽어야 함
    await page.goto(`${BASE_A}/`, { waitUntil: 'load' });
    const primaryA = await page.evaluate(() => {
      const el = document.querySelector('[style*="--primary"]') as HTMLElement | null;
      return el ? el.style.getPropertyValue('--primary').trim() : '';
    });

    const pageB = await browser.newPage();
    await pageB.goto(`${BASE_B}/`, { waitUntil: 'load' });
    const primaryB = await pageB.evaluate(() => {
      const el = document.querySelector('[style*="--primary"]') as HTMLElement | null;
      return el ? el.style.getPropertyValue('--primary').trim() : '';
    });
    await pageB.close();

    // 두 파트너의 --primary 값이 달라야 함 (테마 격리 확인)
    expect(primaryA).not.toBe('');
    expect(primaryB).not.toBe('');
    expect(primaryA).not.toEqual(primaryB);
  });

  test('M-1-5: partner-a 페이지에서 partner-b URL로 이동 시 콘텐츠가 분리된다', async ({ page }) => {
    // partner-a 메인 로드 후 partner-b로 직접 이동
    await page.goto(`${BASE_A}/`, { waitUntil: 'load' });
    await expect(page.locator('header').getByRole('link', { name: /CloudSave/ })).toBeVisible();

    await page.goto(`${BASE_B}/`, { waitUntil: 'load' });
    // partner-b 페이지에는 partner-b 상호명(DataFlow)이 노출됨
    await expect(page.locator('header').getByRole('link', { name: /DataFlow/ })).toBeVisible();
    // partner-a 내용이 잔류하지 않음
    await expect(page.locator('header').getByRole('link', { name: /CloudSave/ })).toHaveCount(0);
  });
});
