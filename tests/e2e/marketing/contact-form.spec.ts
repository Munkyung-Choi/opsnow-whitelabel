import { test, expect } from '@playwright/test';
import { MarketingPage } from '../../pages/MarketingPage';
import { createAdminClient } from '../../fixtures/supabase-admin';

/**
 * WL-101: ContactForm / FinalCTASection 검증
 *
 * F-1: 필드 렌더링 (7개)
 * F-2: 인터랙션 (5개 실행)
 *   - F-2-3/F-2-4: noValidate로 HTML5 validation 비활성화 → Zod 서버 검증 테스트
 *   - F-2-5: WL-42 Server Action 연동 → leads 테이블 레코드 생성 확인
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

  test('F-2-3: 이름 입력 없이 제출 시 필수 필드 인라인 에러 표시 (Zod server validation)', async () => {
    // noValidate → HTML5 validation 비활성화 → Zod 서버 검증이 에러 반환
    await mp.contactEmailInput.fill('test@example.com');
    // 이름은 비워둔 채로 제출
    await mp.contactSubmitBtn.click();
    // Zod에서 customer_name 에러 → ContactFormFields가 #err-name p를 렌더링
    await expect(mp.contactSection.locator('#err-name')).toBeVisible({ timeout: 5000 });
  });

  test('F-2-4: 잘못된 이메일 형식 제출 시 이메일 필드 인라인 에러 표시', async () => {
    await mp.contactNameInput.fill('홍길동');
    await mp.contactEmailInput.fill('not-an-email');
    await mp.contactSubmitBtn.click();
    // Zod에서 email 에러 → ContactFormFields가 #err-email p를 렌더링
    await expect(mp.contactSection.locator('#err-email')).toBeVisible({ timeout: 5000 });
  });

  test('F-2-5: 유효값 입력 후 제출 → leads 테이블에 레코드 생성 + 성공 상태 표시', async ({ page }) => {
    const testEmail = `e2e-wl42-${Date.now()}@test.opsnow.com`;

    await mp.contactNameInput.fill('E2E 테스트');
    await mp.contactEmailInput.fill(testEmail);
    await mp.contactCompanyInput.fill('OpsNow E2E');
    await mp.contactSubmitBtn.click();

    // 성공 상태: "신청이 완료되었습니다!" h3 표시
    await expect(mp.contactSection.getByRole('heading', { name: '신청이 완료되었습니다!' })).toBeVisible({ timeout: 8000 });

    // Node 컨텍스트 클라이언트로 생성된 레코드 확인 후 삭제 (service_role은 브라우저 컨텍스트 불가)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();

      const { data: records } = await admin
        .from('leads')
        .select('id, email')
        .eq('email', testEmail);
      expect(records).toHaveLength(1);
      expect(records![0].email).toBe(testEmail);

      await admin.from('leads').delete().eq('email', testEmail);
    }
  });
});
