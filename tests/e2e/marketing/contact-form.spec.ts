import { test, expect } from '@playwright/test';
import { MarketingPage } from '../../pages/MarketingPage';

/**
 * WL-101: ContactForm / FinalCTASection 검증
 *
 * F-1: 필드 렌더링 (7개)
 * F-2: 인터랙션 (3개 실행 + 3개 skip)
 *   - F-2-3/F-2-4: noValidate 속성으로 HTML5 validation 비활성화됨 → skip
 *   - F-2-5: Server Action(WL-42) 미구현 → skip
 *
 * 대상 파트너: partner-a
 * 실행 전제: Acrylic DNS Proxy 설정 + `npm run dev`
 */

// ── F-1: ContactForm 필드 렌더링 ──────────────────────────────────────────────
test.describe('WL-101 F-1: ContactForm 필드 렌더링', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('F-1-1: #contact 섹션이 DOM에 렌더링된다', async () => {
    await expect(mp.contactSection).toBeVisible();
  });

  test('F-1-2: 이름(customer_name) Label과 Input이 노출된다', async () => {
    await expect(mp.contactSection.locator('label[for="customer_name"]')).toBeVisible();
    await expect(mp.contactNameInput).toBeVisible();
  });

  test('F-1-3: 이메일 Label과 Input[type=email]이 노출된다', async () => {
    await expect(mp.contactSection.locator('label[for="email"]')).toBeVisible();
    await expect(mp.contactEmailInput).toBeVisible();
    await expect(mp.contactEmailInput).toHaveAttribute('type', 'email');
  });

  test('F-1-4: 회사명(company_name) Label과 Input이 노출된다', async () => {
    await expect(mp.contactSection.locator('label[for="company_name"]')).toBeVisible();
    await expect(mp.contactCompanyInput).toBeVisible();
  });

  test('F-1-5: 월 클라우드 사용량 SelectTrigger가 노출된다', async () => {
    await expect(mp.contactUsageSelect).toBeVisible();
  });

  test('F-1-6: 좌측 마케팅 카피 — badge와 신뢰 포인트 영역이 노출된다 [WL-80 ContactFormMain]', async () => {
    // WL-80: ContactFormMain은 message textarea 없음 — 2-column 구조로 교체됨
    // 좌측 컬럼의 Badge("무료 분석 상담")와 trust point li 요소 확인
    await expect(mp.contactSection.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(mp.contactSection.locator('ul li').first()).toBeVisible();
  });

  test('F-1-7: 제출 버튼(type=submit)이 노출된다', async () => {
    await expect(mp.contactSubmitBtn).toBeVisible();
  });
});

// ── F-2: ContactForm 인터랙션 ─────────────────────────────────────────────────
test.describe('WL-101 F-2: ContactForm 인터랙션', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('F-2-1: Select 클릭 시 SelectContent(드롭다운)가 열린다', async ({ page }) => {
    await mp.contactUsageSelect.click();
    // Radix SelectContent: role="listbox"
    await expect(page.getByRole('listbox')).toBeVisible();
  });

  test('F-2-2: Select 옵션 선택 시 SelectTrigger의 표시값이 갱신된다', async ({ page }) => {
    await mp.contactUsageSelect.click();
    // ko.json usageOptions[0] = "100만원 미만"
    await page.getByRole('option', { name: '100만원 미만' }).click();
    await expect(mp.contactUsageSelect).toContainText('100만원 미만');
  });

  test('F-2-3: 빈 값 제출 시 필수 필드 경고 [skip — noValidate로 HTML5 validation 비활성화]', async () => {
    // ContactForm에 noValidate 속성이 있어 브라우저 기본 validation이 비활성화됨.
    // WL-42(Server Action 구현) 완료 후 서버사이드 validation 검증으로 대체 예정.
    test.skip(true, 'form noValidate=true — WL-42 Server Action 구현 후 활성화');
  });

  test('F-2-4: 잘못된 이메일 형식 제출 시 검증 실패 [skip — noValidate로 HTML5 validation 비활성화]', async () => {
    test.skip(true, 'form noValidate=true — WL-42 Server Action 구현 후 활성화');
  });

  test('F-2-5: 유효값 입력 후 제출 → Server Action 호출 [skip — WL-42 미구현]', async () => {
    test.skip(true, 'WL-42 Server Action 구현 전 — 현재 alert() 임시 피드백 사용 중');
  });
});
