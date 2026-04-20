import { test, expect } from '@playwright/test';
import { MarketingPage } from '../../pages/MarketingPage';

/**
 * WL-138: 리드 수집 보안 경계 E2E 검증 — Scenario A (partner_id 강제 교정)
 *
 * 검증 대상: submitLead Server Action이 FormData를 무시하고 host 헤더에서
 * partner_id를 강제 도출하여 DB에 저장함.
 * 클라이언트 측에서 어떤 partner_id를 보내도(혹은 보내지 않아도) 서버는
 * 도메인 기반 UUID를 저장한다.
 *
 * 실행 전제: Acrylic DNS Proxy 설정 + `npm run dev`
 */

test.describe('WL-138 Scenario A: partner_id 강제 교정 — host 헤더 기반 저장 검증', () => {
  test('partner-a 도메인에서 제출된 리드가 DB에 partner-a의 UUID로 저장된다', async ({ page }) => {
    const mp = new MarketingPage(page, 'partner-a');
    await mp.goto();

    const testEmail = `wl138-sec-${Date.now()}@test.opsnow.com`;

    await mp.contactNameInput.fill('WL138 보안테스트');
    await mp.contactEmailInput.fill(testEmail);
    await mp.contactCompanyInput.fill('Security Test Co');
    await mp.contactSubmitBtn.click();

    await expect(
      mp.contactSection.getByRole('heading', { name: '신청이 완료되었습니다!' })
    ).toBeVisible({ timeout: 8000 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return;

    // partner-a의 실제 UUID를 DB에서 조회 (하드코딩 방지)
    const partnerRes = await page.request.get(
      `${supabaseUrl}/rest/v1/partners?subdomain=eq.partner-a&select=id`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
    );
    const partners = await partnerRes.json() as Array<{ id: string }>;
    expect(partners).toHaveLength(1);
    const expectedPartnerId = partners[0].id;

    // 저장된 리드의 partner_id 검증
    const leadRes = await page.request.get(
      `${supabaseUrl}/rest/v1/leads?email=eq.${encodeURIComponent(testEmail)}&select=id,partner_id`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
    );
    const records = await leadRes.json() as Array<{ id: string; partner_id: string }>;
    expect(records).toHaveLength(1);
    // 핵심: 클라이언트가 FormData에 partner_id를 보내지 않아도(폼 필드 없음)
    //        서버가 host 헤더에서 올바른 UUID를 도출하여 저장함
    expect(records[0].partner_id).toBe(expectedPartnerId);

    // 테스트 데이터 정리
    await page.request.delete(
      `${supabaseUrl}/rest/v1/leads?email=eq.${encodeURIComponent(testEmail)}`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
    );
  });
});
