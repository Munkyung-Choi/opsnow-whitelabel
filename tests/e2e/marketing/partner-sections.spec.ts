import { test, expect } from '@playwright/test';
import { MarketingPage } from '../../pages/MarketingPage';

/**
 * WL-85: 파트너별 섹션 렌더링 회귀 테스트 — Scenarios 1~4
 *
 * S1: partner-a 마케팅 메인 페이지 8개 섹션 전부 렌더링 확인 (황금 경로)
 * S2: is_visible=false 섹션 미노출 확인 (DB fixture 구축 후 활성화)
 * S3: contents.title=null 파트너 — 섹션 렌더링 + h2 미존재 확인 (DB fixture 필요)
 * S4: contents row 없는 파트너 — DEFAULT 코드 폴백 렌더링 확인 (DB fixture 필요)
 */

test.describe('S1: partner-a — 마케팅 8개 섹션 전부 렌더링', () => {
  let marketingPage: MarketingPage;

  test.beforeEach(async ({ page }) => {
    marketingPage = new MarketingPage(page, 'partner-a');
    await marketingPage.goto();
  });

  test('hero 섹션이 렌더링된다', async () => {
    await expect(marketingPage.heroSection).toBeVisible();
  });

  test('pain_points 섹션이 렌더링된다', async () => {
    await expect(marketingPage.painPointsSection).toBeVisible();
  });

  test('stats 섹션이 렌더링된다', async () => {
    await expect(marketingPage.statsSection).toBeVisible();
  });

  test('how_it_works 섹션이 렌더링된다', async () => {
    await expect(marketingPage.howItWorksSection).toBeVisible();
  });

  test('finops_automation 섹션이 렌더링된다', async () => {
    await expect(marketingPage.finopsSection).toBeVisible();
  });

  test('core_engines 섹션이 렌더링된다', async () => {
    await expect(marketingPage.coreEnginesSection).toBeVisible();
  });

  test('role_based_value 섹션이 렌더링된다', async () => {
    await expect(marketingPage.roleValueSection).toBeVisible();
  });

  test('faq 섹션이 렌더링된다', async () => {
    await expect(marketingPage.faqSection).toBeVisible();
  });

  test('final_cta(contact) 섹션이 렌더링된다', async () => {
    await expect(marketingPage.contactSection).toBeVisible();
  });

  // ── WL-83 회귀 방지 ─────────────────────────────────────────────────────────
  // simplify 스킬이 fallback 타이틀을 제거하면서 partner-c/d 타이틀이 누락된 버그 재발 방지.
  test('stats 섹션에 타이틀(h2)이 렌더링된다 [WL-83 회귀]', async () => {
    await expect(marketingPage.statsSection.locator('h2')).toBeVisible();
  });

  // ── {PartnerName} 보간 회귀 방지 ─────────────────────────────────────────────
  // DB의 {PartnerName} / {business_name} 토큰이 앱 레이어에서 치환되지 않고
  // 그대로 노출되는 경우를 감지한다. (WL-83 hotfix 관련)
  test('페이지 전체에 미치환 {PartnerName} 토큰이 없다 [WL-83 보간 회귀]', async () => {
    const bodyText = await marketingPage.page.locator('body').textContent();
    expect(bodyText).not.toContain('{PartnerName}');
    expect(bodyText).not.toContain('{business_name}');
  });

  // ── Empty State 미발생 확인 ──────────────────────────────────────────────────
  // partner_sections rows가 0개일 때 나타나는 "콘텐츠를 준비 중입니다" 문구가
  // 정상 파트너에는 노출되지 않아야 한다.
  test('Empty State(섹션 없음 안내 문구)가 노출되지 않는다', async () => {
    await expect(
      marketingPage.page.getByText('콘텐츠를 준비 중입니다'),
    ).not.toBeVisible();
  });
});

// ── WL-98: 마케팅 페이지 공통 검증 (C-1~C-4) ─────────────────────────────────
// C-1: {PartnerName} 미치환 토큰 없음 — S1 블록(line 67)에서 이미 검증됨
// C-2: {business_name} 미치환 토큰 없음 — S1 블록(line 70)에서 이미 검증됨
// 아래 C-3/C-4는 page.goto() 이전에 리스너를 부착해야 하므로 별도 describe로 분리.
test.describe('WL-98 공통 검증 — 네트워크/콘솔 에러', () => {
  test('C-3: 마케팅 메인 페이지에 5xx 응답이 없다', async ({ page }) => {
    const errors: { url: string; status: number }[] = [];
    page.on('response', (res) => {
      const status = res.status();
      if (status >= 500 && status < 600) {
        errors.push({ url: res.url(), status });
      }
    });

    const mp = new MarketingPage(page, 'partner-a');
    await mp.goto();

    expect(errors, `5xx responses: ${JSON.stringify(errors)}`).toHaveLength(0);
  });

  test('C-4: 마케팅 메인 페이지에 브라우저 콘솔 error 레벨 메시지가 없다', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    const mp = new MarketingPage(page, 'partner-a');
    await mp.goto();

    // Next.js dev 환경의 hydration 경고 등 노이즈 제외가 필요하면 필터 추가
    expect(
      consoleErrors,
      `console errors:\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });
});

// ── Scenarios 2~4: globalSetup에서 seed된 테스트 파트너 기반 ──────────────────
// 픽스처: tests/fixtures/seed-partners.ts (globalSetup/globalTeardown 자동 관리)

// ── S2: is_visible=false 섹션 격리 ───────────────────────────────────────────
test.describe('S2: partner_sections.is_visible=false 섹션 격리 [WL-102]', () => {
  const BASE = 'http://partner-test-hidden.localhost:3000';

  test('S2-1: is_visible=false인 stats 섹션이 DOM에서 미노출된다 (RLS 필터 검증)', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    // RLS policy "anon_select_visible_partner_sections": is_visible=true만 반환
    // → stats 섹션이 sections 배열에 없으므로 renderSection 미호출 → DOM에 #stats 없음
    await expect(page.locator('#stats')).toHaveCount(0);
  });

  test('S2-2: is_visible=true인 섹션(pain_points)은 정상 렌더링된다', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await expect(page.locator('#pain-points')).toBeVisible({ timeout: 15_000 });
  });

  test('S2-3: 나머지 가시 섹션(how_it_works)도 정상 렌더링된다', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await expect(page.locator('#how-it-works')).toBeVisible({ timeout: 15_000 });
  });
});

// ── S3: title=null 콘텐츠 — h2 미렌더링 검증 ─────────────────────────────────
test.describe('S3: contents.title=null — h2 미렌더링 검증 [WL-102]', () => {
  const BASE = 'http://partner-test-null-title.localhost:3000';

  test('S3-1: #stats 섹션 컨테이너가 렌더링된다 (섹션 자체는 존재)', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await expect(page.locator('#stats')).toBeVisible();
  });

  test('S3-2: stats 섹션의 h2 타이틀이 없다 (title=null → {sectionTitle && <h2>} 미렌더링)', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await expect(page.locator('#stats h2')).toHaveCount(0);
  });

  test('S3-3: stats 섹션 본문(수치 카드)은 DEFAULT_STATS로 렌더링된다 (body=null → 폴백)', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    // contents.body=null → parseStats(null) → DEFAULT_STATS (30%/5분/99.9%)
    await expect(page.locator('#stats').getByText('30%', { exact: true })).toBeVisible();
  });
});

// ── S4: contents row 없는 파트너 — DEFAULT 폴백 검증 ─────────────────────────
test.describe('S4: contents row 없는 파트너 — DEFAULT 데이터 폴백 [WL-102]', () => {
  const BASE = 'http://partner-test-empty-contents.localhost:3000';

  test('S4-1: HowItWorks DEFAULT_STEPS 렌더링 — Connect/Diagnose/Automate', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    // contents.how_it_works 없음 → DEFAULT_STEPS 사용
    // 듀얼 레이아웃(데스크톱+모바일): 같은 텍스트가 두 번 존재 → .first()로 단일 요소 선택
    await expect(page.locator('#how-it-works').getByText('Connect').first()).toBeVisible();
    await expect(page.locator('#how-it-works').getByText('Diagnose').first()).toBeVisible();
    await expect(page.locator('#how-it-works').getByText('Automate').first()).toBeVisible();
  });

  test('S4-2: StatsSection DEFAULT_STATS 렌더링 — 30%/5분/99.9%', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    // contents.stats 없음 → parseStats(null) → DEFAULT_STATS
    await expect(page.locator('#stats').getByText('30%', { exact: true })).toBeVisible();
    await expect(page.locator('#stats').getByText('5분', { exact: true })).toBeVisible();
    await expect(page.locator('#stats').getByText('99.9%', { exact: true })).toBeVisible();
  });

  test('S4-3: PainPoints 섹션 카드 3개가 렌더링된다 (global_contents 기반 — 파트너 contents 무관)', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    // pain_points는 global_contents에서 읽음 → 파트너 contents 부재와 무관하게 렌더링
    await expect(page.locator('#pain-points [data-slot="card"]')).toHaveCount(3);
  });

  test('S4-4: FaqSection 아코디언 항목이 렌더링된다 (global_contents 기반)', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await expect(page.locator('#faq')).toBeVisible();
    const itemCount = await page.locator('#faq [data-slot="accordion-item"]').count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('S4-5: 페이지 500 에러 없음 — partner contents 미설정 파트너 graceful 렌더링', async ({ page }) => {
    const serverErrors: string[] = [];
    page.on('response', (resp) => {
      if (resp.status() >= 500) serverErrors.push(`${resp.status()} ${resp.url()}`);
    });
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    expect(serverErrors).toHaveLength(0);
  });
});
