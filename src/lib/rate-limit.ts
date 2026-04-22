import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// WL-145 — 파트너별 Rate Limiting (Noisy Neighbor 방어)
// Edge Runtime에서 동작. @upstash/ratelimit이 REST API 기반이라 Edge 호환.

// Edge Worker 인스턴스 내 메모리 캐시 — Upstash 명령 호출 절감
// 무료 티어 10,000 commands/day 할당량 보존 목적.
// Isolate별 독립이므로 정확도 보증이 아닌 근사 최적화.
const ephemeralCache = new Map();

let _rateLimiter: Ratelimit | null = null;
let _initAttempted = false;

// Lazy singleton — env 누락 시 null 반환 (Fail-open).
// @upstash/redis는 env 누락 시 throw하지 않고 warning만 출력하므로
// 명시적으로 env 존재를 검증한 뒤 인스턴스화한다.
// 호출부(checkRateLimit)는 null을 Fail-open으로 처리.
export function getPartnerRateLimiter(): Ratelimit | null {
  if (_initAttempted) return _rateLimiter;
  _initAttempted = true;
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error('[RateLimit] init failed — UPSTASH_REDIS_REST_URL/TOKEN missing. Fail-open.');
      _rateLimiter = null;
      return _rateLimiter;
    }
    // Dev/test 환경은 관대한 기본값, Production은 50/60s 기본.
    // 명시적 override: RATE_LIMIT_REQUESTS / RATE_LIMIT_WINDOW env.
    const isDev = process.env.NODE_ENV !== 'production';
    const defaultRequests = isDev ? 500 : 50;
    const requests = parseInt(process.env.RATE_LIMIT_REQUESTS ?? '', 10) || defaultRequests;
    const window = (process.env.RATE_LIMIT_WINDOW ?? '60 s') as `${number} s`;
    _rateLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(requests, window),
      ephemeralCache,
      analytics: false,
      prefix: 'rl_partner',
    });
  } catch (e) {
    console.error('[RateLimit] init failed — Fail-open:', e);
    _rateLimiter = null;
  }
  return _rateLimiter;
}

export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
    'Retry-After': '10',
  };
}
