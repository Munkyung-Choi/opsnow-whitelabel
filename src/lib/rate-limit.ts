import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// WL-145 — 파트너별 Rate Limiting (Noisy Neighbor 방어)
// WL-146 — Admin IP 기반 Rate Limiting (Credential Stuffing 방어)
// Edge Runtime에서 동작. @upstash/ratelimit이 REST API 기반이라 Edge 호환.

// Edge Worker 인스턴스 내 메모리 캐시 — Upstash 명령 호출 절감.
// 무료 티어 10,000 commands/day 할당량 보존 목적.
// 파트너·어드민 트래픽이 서로 eviction하지 않도록 분리.
const partnerEphemeralCache = new Map<string, number>();
const adminEphemeralCache = new Map<string, number>();

interface LimiterConfig {
  envRequestsKey: string;
  envWindowKey: string;
  defaultRequestsProd: number;
  defaultRequestsDev: number;
  defaultWindow: `${number} s`;
  prefix: string;
  ephemeralCache: Map<string, number>;
}

function createLimiter(config: LimiterConfig): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('[RateLimit] init failed — UPSTASH_REDIS_REST_URL/TOKEN missing. Fail-open.');
    return null;
  }
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    const defaultRequests = isDev ? config.defaultRequestsDev : config.defaultRequestsProd;
    const requests = parseInt(process.env[config.envRequestsKey] ?? '', 10) || defaultRequests;
    const window = (process.env[config.envWindowKey] ?? config.defaultWindow) as `${number} s`;
    return new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(requests, window),
      ephemeralCache: config.ephemeralCache,
      analytics: false,
      prefix: config.prefix,
    });
  } catch (e) {
    console.error('[RateLimit] init failed — Fail-open:', e);
    return null;
  }
}

// ── Partner Rate Limiter (WL-145) ───────────────────────────────────────────
let _partnerRateLimiter: Ratelimit | null = null;
let _partnerInitAttempted = false;

export function getPartnerRateLimiter(): Ratelimit | null {
  if (_partnerInitAttempted) return _partnerRateLimiter;
  _partnerInitAttempted = true;
  _partnerRateLimiter = createLimiter({
    envRequestsKey: 'RATE_LIMIT_REQUESTS',
    envWindowKey: 'RATE_LIMIT_WINDOW',
    defaultRequestsProd: 50,
    defaultRequestsDev: 500,
    defaultWindow: '60 s',
    prefix: 'rl_partner',
    ephemeralCache: partnerEphemeralCache,
  });
  return _partnerRateLimiter;
}

// ── Admin Rate Limiter (WL-146) ─────────────────────────────────────────────
// IP 기반 Credential Stuffing 방어. Partner와 독립된 인스턴스·캐시·설정.
let _adminRateLimiter: Ratelimit | null = null;
let _adminInitAttempted = false;

export function getAdminRateLimiter(): Ratelimit | null {
  if (_adminInitAttempted) return _adminRateLimiter;
  _adminInitAttempted = true;
  _adminRateLimiter = createLimiter({
    envRequestsKey: 'RATE_LIMIT_ADMIN_REQUESTS',
    envWindowKey: 'RATE_LIMIT_ADMIN_WINDOW',
    defaultRequestsProd: 30,
    defaultRequestsDev: 300,
    defaultWindow: '60 s',
    prefix: 'rl_admin',
    ephemeralCache: adminEphemeralCache,
  });
  return _adminRateLimiter;
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
