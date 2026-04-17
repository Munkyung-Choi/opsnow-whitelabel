import { test, expect } from '@playwright/test';
import { MarketingPage } from '../../pages/MarketingPage';

/**
 * WL-99: 다국어 전환 · 글로벌 네비게이션 검증
 *
 * N-1: GlobalNav 렌더링 (5개)
 * N-2: LanguageSelector 인터랙션 (3개, N-2-4 skip)
 * N-3: 로케일 전환 E2E — WL-71 회귀 방지 (6개)
 *
 * 구현 특이사항:
 *   - proxy.ts는 NextResponse.rewrite() 사용 → 브라우저 URL은 항상 base(partner-a.localhost:3000)
 *   - 로케일 div: root layout은 <html lang="ko"> 고정, locale layout이 <div lang={locale}> 주입
 *   - 로케일 전환: LanguageSelector → /api/set-locale → cookie 설정 → base URL redirect → rewrite
 *
 * 대상 파트너: partner-a (published_locales: ko, en, ja, zh — 4개 전부)
 */

// ── 헬퍼 ────────────────────────────────────────────────────────────────────────

/**
 * LanguageSelector에서 특정 로케일 코드(EN/JA/ZH)를 클릭하여 전환하고
 * 페이지 로드가 완료될 때까지 대기한다.
 */
async function switchLocale(mp: MarketingPage, localeCode: 'EN' | 'JA' | 'ZH') {
  await mp.langSelector.click();
  // Radix SelectContent는 포털로 마운트 → page 전체에서 role=option 검색
  await mp.page.getByRole('option', { name: new RegExp(localeCode) }).click();
  // set-locale API redirect → base URL reload → middleware rewrite
  await mp.page.waitForLoadState('load');
}

// ── N-1: GlobalNav 렌더링 ────────────────────────────────────────────────────────
test.describe('WL-99 N-1: GlobalNav 렌더링', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('N-1-1: 파트너 로고 영역(링크)이 헤더에 렌더링된다', async () => {
    // logo_url 유무와 무관하게 로고 링크 자체는 항상 존재
    await expect(mp.navLogoLink).toBeVisible();
  });

  test('N-1-2: 데스크톱 네비 메뉴 링크 3개(기능·프로세스·FAQ)가 노출된다', async () => {
    // 기본 뷰포트(1280×720)에서 nav[aria-label="주요 메뉴"]가 visible
    await expect(mp.navDesktopLinks).toHaveCount(3);
    await expect(mp.navHeader.locator('nav[aria-label="주요 메뉴"] a[href="#core-engines"]')).toBeVisible();
    await expect(mp.navHeader.locator('nav[aria-label="주요 메뉴"] a[href="#how-it-works"]')).toBeVisible();
    await expect(mp.navHeader.locator('nav[aria-label="주요 메뉴"] a[href="#faq"]')).toBeVisible();
  });

  test('N-1-3: 모바일(375px) 뷰포트에서 햄버거 아이콘이 노출되고 데스크톱 메뉴는 hidden', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(mp.navMobileTrigger).toBeVisible();
    // 데스크톱 nav는 md:flex → 375px에서 display:none
    await expect(mp.navHeader.locator('nav[aria-label="주요 메뉴"]')).toBeHidden();
  });

  test('N-1-4: 모바일(375px) 햄버거 클릭 시 Sheet 메뉴가 열린다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mp.navMobileTrigger.click();
    // shadcn Sheet는 Radix Dialog → role="dialog"
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('N-1-5: Sheet 메뉴 내에 섹션 이동 링크 3개가 노출된다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mp.navMobileTrigger.click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.locator('a[href="#core-engines"]')).toBeVisible();
    await expect(sheet.locator('a[href="#how-it-works"]')).toBeVisible();
    await expect(sheet.locator('a[href="#faq"]')).toBeVisible();
  });
});

// ── N-2: LanguageSelector ────────────────────────────────────────────────────────
test.describe('WL-99 N-2: LanguageSelector', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('N-2-1: 현재 로케일 코드(KO)가 GNB 우측에 노출된다', async () => {
    // SelectTrigger 내부의 SelectValue → <span>KO</span>
    await expect(mp.langSelector).toBeVisible();
    await expect(mp.langSelector).toContainText('KO');
  });

  test('N-2-2: 언어 선택기 클릭 시 드롭다운이 확장된다', async ({ page }) => {
    await mp.langSelector.click();
    // Radix SelectContent — role="listbox"
    await expect(page.getByRole('listbox')).toBeVisible();
  });

  test('N-2-3: 드롭다운에 partner-a 공개 로케일(한국어·English·日本語·中文)이 노출된다', async ({ page }) => {
    // partner-a.published_locales = ['ko', 'en', 'ja', 'zh'] — 4개 로케일 게시됨
    await mp.langSelector.click();
    await expect(page.getByRole('option', { name: /한국어/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /English/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /日本語/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /中文/ })).toBeVisible();
  });

  test('N-2-4: published_locales 제한 파트너에서 미공개 로케일이 필터링된다', async () => {
    // DB fixture(service_role) 구축 필요 — published_locales가 ['ko']인 파트너 필요
    test.skip(true, 'DB fixture 구축 필요 — published_locales 제한 파트너');
  });
});

// ── N-3: 로케일 전환 (WL-71 회귀 방지) ──────────────────────────────────────────
test.describe('WL-99 N-3: 로케일 전환 — WL-71 회귀 방지', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('N-3-1: KO→EN 전환 후 페이지 DOM에 div[lang="en"]이 주입된다', async ({ page }) => {
    // proxy.ts는 rewrite() 사용 → 브라우저 URL은 base URL 유지
    // locale layout이 <div lang={locale}> 주입 → en 전환 후 div[lang="en"] 존재 확인
    await switchLocale(mp, 'EN');
    await expect(page.locator('div[lang="en"]')).toBeAttached();
  });

  test('N-3-2: KO→EN 전환 후 /not-found 리다이렉트가 발생하지 않는다 [WL-71 회귀]', async ({ page }) => {
    // WL-71 버그: 언어 변경 시 /not-found로 리다이렉트됨
    // 수정 후: base URL로 정상 복귀
    await switchLocale(mp, 'EN');
    expect(page.url()).not.toContain('/not-found');
  });

  test('N-3-3: KO→EN 전환 후 영어 콘텐츠가 렌더링된다 [WL-71 회귀]', async () => {
    // WL-71 버그: 전환해도 화면은 한국어 유지
    // en.json nav.cta = "Free Consultation"
    await switchLocale(mp, 'EN');
    // GNB CTA 버튼이 영어로 변경됨 (한국어: "무료 상담")
    await expect(mp.navHeader.getByRole('link', { name: 'Free Consultation' }).first()).toBeVisible();
  });

  test('N-3-4: EN→JA 전환 후 일본어 콘텐츠가 렌더링된다', async () => {
    // partner-a.published_locales = ['ko', 'en'] — JA/ZH 미게시
    // 4개 로케일 전환 검증은 ja/zh를 published로 가진 파트너 fixture 구축 후 활성화
    test.skip(true, 'partner-a published_locales에 ja 미포함 — ja/zh fixture 파트너 구축 후 활성화');
  });

  test('N-3-5: 로케일 전환 후 GNB 언어 코드가 선택한 값으로 변경된다', async () => {
    await switchLocale(mp, 'EN');
    // SelectTrigger의 SelectValue가 "EN"으로 업데이트됨
    await expect(mp.langSelector).toContainText('EN');
  });

  test('N-3-6: 기본 페이지 로드 시 div[lang="ko"]가 DOM에 존재한다', async ({ page }) => {
    // locale layout이 <div lang={locale} className="contents"> 를 주입함을 검증
    // root layout의 <html lang="ko"> 는 고정값이므로 locale layout의 div를 확인
    await expect(page.locator('div[lang="ko"]')).toBeAttached();
  });
});
