import { test, expect } from '@playwright/test';
import { MarketingPage } from '../../pages/MarketingPage';

/**
 * WL-98 / WL-79: FaqSection 인터랙션 검증
 *
 * 필터 전환·아코디언 토글·링크 href 등 사용자 인터랙션을 검증한다.
 * 정적 콘텐츠 검증은 `section-content.spec.ts`에서 다룬다.
 *
 * 대상 파트너: partner-a
 * 기반 데이터: DEFAULT_FAQ_ITEMS (WL-97 DB 구축 전까지 코드 폴백 사용)
 */

test.describe('WL-79 FaqSection — 필터·아코디언 인터랙션', () => {
  let mp: MarketingPage;

  test.beforeEach(async ({ page }) => {
    mp = new MarketingPage(page, 'partner-a');
    await mp.goto();
  });

  test('T-79-7: "비용" 필터 클릭 시 비용 카테고리 항목만 표시', async () => {
    await mp.faqSection.getByRole('button', { name: '비용', exact: true }).click();

    // 필터 적용 후, 표시된 모든 AccordionItem 내부의 카테고리 배지가 "비용"인지 검증
    const categoryBadges = mp.faqAccordionItems.locator(
      'span.border.border-border',
    );
    const count = await categoryBadges.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(categoryBadges.nth(i)).toHaveText('비용');
    }
  });

  test('T-79-8: "리소스" 필터 클릭 시 리소스 카테고리 항목만 표시', async () => {
    await mp.faqSection.getByRole('button', { name: '리소스', exact: true }).click();

    const categoryBadges = mp.faqAccordionItems.locator(
      'span.border.border-border',
    );
    const count = await categoryBadges.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(categoryBadges.nth(i)).toHaveText('리소스');
    }
  });

  test('T-79-9: 닫힌 아코디언 항목 클릭 시 콘텐츠가 열린다', async () => {
    // Radix Accordion(type="single" collapsible, defaultValue=first.id):
    //   첫 항목은 기본 열림 → 두 번째 항목은 닫힘 상태.
    const secondTrigger = mp.faqAccordionItems.nth(1).getByRole('button');
    await expect(secondTrigger).toHaveAttribute('data-state', 'closed');

    await secondTrigger.click();

    await expect(secondTrigger).toHaveAttribute('data-state', 'open');
  });

  test('T-79-10: "자세히 보기" 링크 href가 /{locale}/faq/{id} 형식', async () => {
    // "자세히 보기"는 아코디언이 열린 상태에서만 DOM에 가시화된다.
    // 첫 번째 항목은 기본 열림이므로 그 안의 링크를 검증한다.
    const detailLink = mp.faqAccordionItems
      .first()
      .getByRole('link', { name: /자세히 보기/ })
      .first();

    // WL-96 구현 전에는 faqBase 자체가 undefined여서 링크가 렌더되지 않을 수 있다.
    // 존재 여부를 선제 확인 후 href 패턴 검증.
    const exists = await detailLink.count();
    test.skip(exists === 0, 'WL-96 미구현 상태 — 자세히 보기 링크 미렌더');

    // 서브도메인 기반 라우팅: /{locale}/faq/{faqId} (2 세그먼트)
    await expect(detailLink).toHaveAttribute(
      'href',
      /^\/[^/]+\/faq\/[^/]+$/,
    );
  });

  test('T-79-11: "모든 FAQ 보기" 버튼 href가 /{locale}/faq 형식', async () => {
    // 서브도메인 기반 라우팅: 파트너 구분은 subdomain이 담당하므로
    // href는 /{locale}/faq (2 세그먼트) 형식이 정상
    const cta = mp.faqAllCta;
    const exists = await cta.count();
    test.skip(exists === 0, 'WL-96 미구현 상태 — 모든 FAQ 보기 CTA 미렌더');

    await expect(cta).toHaveAttribute('href', /^\/[^/]+\/faq$/);
  });

  test('T-79-12: 빈 카테고리 선택 시 "질문 없음" 문구 노출', async () => {
    // DEFAULT_FAQ_ITEMS는 모든 5개 카테고리에 최소 1건 이상의 항목을 포함한다.
    // 실제로 빈 카테고리는 DB fixture에서만 재현 가능 → DB 구축 후 활성화.
    test.skip(
      true,
      'DEFAULT_FAQ_ITEMS가 모든 카테고리를 채우므로 DB fixture 구축 후 활성화',
    );
  });
});
