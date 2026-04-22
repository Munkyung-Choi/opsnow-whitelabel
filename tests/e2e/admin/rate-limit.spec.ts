import { test, expect } from '@playwright/test'

// WL-146 — Admin Rate Limit E2E
//
// Quota 보존 전략: Upstash 무료 티어 10k/day 제약 + dev 기본값 300 req/60s로
// 실제 burst 트리거는 수동 검증으로만 수행한다.
//   1. (이 파일) 정상 요청 regression 검증 — rate limit 게이트가 /auth/login 페이지 로드를 차단하지 않음
//   2. Deploy 단계 smoke check — curl 31회로 수동 429 검증 (Report 단계 명기)

const ADMIN_ORIGIN = 'http://admin-whitelabel.localhost:3000'

test.describe('WL-146 Admin Rate Limit — 정상 플로우 regression', () => {
  test('/auth/login 페이지 정상 접근 시 rate limit 게이트가 200 응답을 차단하지 않는다', async ({ page }) => {
    const response = await page.goto(`${ADMIN_ORIGIN}/auth/login`, { waitUntil: 'load' })
    // 200(로그인 페이지 렌더) 또는 세션 있을 시 303(redirect). 429는 아니어야 함.
    expect(response?.status()).not.toBe(429)
  })

  test('admin host 루트 진입 시 rate limit 게이트가 정상 플로우를 차단하지 않는다', async ({ page }) => {
    // 미인증 상태에서 admin host 접근 → /auth/login?next=/ redirect 경로 진입.
    // 게이트는 429를 내지 않아야 한다.
    const response = await page.goto(`${ADMIN_ORIGIN}/`, { waitUntil: 'load' })
    expect(response?.status()).not.toBe(429)
  })
})

// 아래 시나리오는 실제 Upstash 호출을 유발하므로 CI에서 자동 실행하지 않는다.
// Deploy 단계 smoke check에서 curl로 수동 검증:
//   for i in {1..32}; do curl -o /dev/null -s -w "%{http_code}\n" \
//     -H "x-vercel-forwarded-for: 1.2.3.4" \
//     https://admin-whitelabel.opsnow.com/auth/login; done
// 31번째 요청부터 429가 반환되어야 한다 (production 기본값 30/60s).
test.describe('WL-146 Admin Rate Limit — 실제 트리거 (수동 검증만)', () => {
  test.skip('31번째 요청부터 429 응답 + X-RateLimit-Remaining=0 (production 기본 30/60s)', async () => {})
  test.skip('서로 다른 x-vercel-forwarded-for IP는 독립 쿼터 — 버킷 분리', async () => {})
  test.skip('admin limiter는 partner limiter와 독립 — 동일 IP가 partner host로 가도 admin 쿼터 잔류', async () => {})
  test.skip('429 응답은 X-RateLimit-Limit/Remaining/Reset/Retry-After 헤더 포함', async () => {})
  test.skip('60s 경과 후 sliding window 회복 — 쿼터 리셋 후 정상 응답', async () => {})
})
