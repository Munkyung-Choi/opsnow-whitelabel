import { test, expect } from '@playwright/test'

// WL-145 — Rate Limit E2E
//
// Quota 보존 전략: Upstash 무료 티어 10k/day 제약으로 실제 rate limit 트리거
// 테스트는 자동화하지 않는다. 아래 두 가지로 검증:
//   1. (이 파일) 정상 요청 regression 검증 — rate limit 게이트가 정상 플로우를 차단하지 않음
//   2. Deploy 단계 smoke check — curl 51회로 수동 429 검증 (Report 단계 명기)

const BASE_A = 'http://partner-a.localhost:3000'

test.describe('WL-145 Rate Limit — 정상 플로우 regression', () => {
  test('파트너 정상 요청 시 rate limit 게이트가 200 응답을 차단하지 않는다', async ({ page }) => {
    const response = await page.goto(`${BASE_A}/`, { waitUntil: 'load' })
    expect(response?.status()).toBe(200)
    // 정상 응답은 429가 아니어야 한다
    expect(response?.status()).not.toBe(429)
  })
})

// 아래 시나리오는 실제 Upstash 호출을 유발하므로 CI에서 자동 실행하지 않는다.
// Deploy 단계 smoke check에서 curl로 수동 검증:
//   for i in {1..52}; do curl -o /dev/null -s -w "%{http_code}\n" https://<partner>.opsnow.com/; done
// 51번째 요청부터 429가 반환되어야 한다.
test.describe('WL-145 Rate Limit — 실제 트리거 (수동 검증만)', () => {
  test.skip('51번째 요청부터 429 응답 + X-RateLimit-Remaining=0', async () => {})
  test.skip('다른 파트너는 독립 쿼터 — 한 파트너 차단이 다른 파트너에 영향 없음', async () => {})
  test.skip('429 응답은 X-RateLimit-Limit/Remaining/Reset/Retry-After 헤더 포함', async () => {})
  test.skip('60s 경과 후 sliding window 회복 — 쿼터 리셋 후 정상 200 응답', async () => {})
  test.skip('존재하지 않는 서브도메인 50회 초과 시 429 — Partner Enumeration 방어', async () => {})
})
