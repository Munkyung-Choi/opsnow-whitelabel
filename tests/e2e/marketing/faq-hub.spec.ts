import { test, expect } from '@playwright/test';

/**
 * WL-96: FAQ Hub & Detail 페이지 E2E 검증
 *
 * H-1: Hub 페이지 렌더링 (URL, Hero, CategoryTabs, ItemList)
 * H-2: 카테고리 필터링 (URL searchParam 기반)
 * H-3: 상세 페이지 이동 및 렌더링
 * H-4: 상세 페이지 "FAQ로 돌아가기" 네비게이션
 *
 * 전제: DB 미시딩 상태에서도 페이지 자체는 렌더링 (빈 목록 처리)
 * 실행 전제: Acrylic DNS + `npm run dev`
 */

const BASE = 'http://partner-a.localhost:3000/ko/faq';

// ── H-1: Hub 페이지 기본 렌더링 ────────────────────────────────────────────────
test.describe('WL-96 H-1: FAQ Hub 기본 렌더링', () => {
  test.todo('H-1-1: /ko/faq URL이 200으로 응답한다');
  test.todo('H-1-2: Hero 영역 — 타이틀("무엇을 도와드릴까요?")이 보인다');
  test.todo('H-1-3: "전체" 카테고리 탭이 기본 활성화 상태로 노출된다');
  test.todo('H-1-4: DB 시딩 후 — FaqItemCard 목록이 1개 이상 렌더링된다');
  test.todo('H-1-5: DB 미시딩 시 — "해당 카테고리의 질문이 없습니다." 메시지가 보인다');
});

// ── H-2: 카테고리 필터링 ────────────────────────────────────────────────────────
test.describe('WL-96 H-2: 카테고리 필터링', () => {
  test.todo('H-2-1: 카테고리 탭 클릭 시 URL에 ?category={id} searchParam이 반영된다');
  test.todo('H-2-2: ?category={id} URL 직접 진입 시 해당 탭이 활성화 상태로 렌더링된다');
  test.todo('H-2-3: 필터 적용 후 다른 카테고리 항목은 렌더링되지 않는다');
});

// ── H-3: 상세 페이지 ────────────────────────────────────────────────────────────
test.describe('WL-96 H-3: FAQ 상세 페이지', () => {
  test.todo('H-3-1: FaqItemCard 클릭 시 /ko/faq/{slug} URL로 이동한다');
  test.todo('H-3-2: 상세 페이지 — 질문 제목이 h1으로 렌더링된다');
  test.todo('H-3-3: 상세 페이지 — 마크다운 본문이 .prose 영역 내에 렌더링된다');
  test.todo('H-3-4: 상세 페이지 — 존재하지 않는 slug는 404 처리된다');
});

// ── H-4: 상세 → Hub 네비게이션 ─────────────────────────────────────────────────
test.describe('WL-96 H-4: 상세 → Hub 뒤로가기', () => {
  test.todo('H-4-1: "FAQ 목록으로" 링크가 /ko/faq로 이동한다');
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
