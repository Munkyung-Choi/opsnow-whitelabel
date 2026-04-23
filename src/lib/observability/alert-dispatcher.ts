import { Redis } from '@upstash/redis';
import { sendEmailAlert } from './send-email-alert';

// WL-156 — Rate Limit 알림 디스패처.
// 설계 원칙:
//   - Upstash SET NX + EX 300s 원자 suppression (Journal 2026-04-22 L8: isNewAlert 네이밍)
//   - Redis 장애 시 Fail-Safe 침묵 — 이메일 폭주 방지
//   - 3계층 방어: outer try-catch / sendEmailAlert .catch() / Redis lazy null
//   - waitUntil 단일 체인 — 호출부(checkRateLimit)가 event.waitUntil(dispatchRateLimitAlert(ctx))로 등록
//     (Auditor 취약점 #4: 내부 중첩 waitUntil 금지 — Silent Loss 방지)

let _redis: Redis | null = null;
let _redisInitAttempted = false;

function getRedis(): Redis | null {
  if (_redisInitAttempted) return _redis;
  _redisInitAttempted = true;
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error('[AlertDispatcher] init skipped — UPSTASH_REDIS_REST_URL/TOKEN missing');
      return null;
    }
    _redis = Redis.fromEnv();
    return _redis;
  } catch (e) {
    console.error('[AlertDispatcher] init failed:', e);
    return null;
  }
}

const SUPPRESSION_TTL_SECONDS = 300;

export type AlertContextType = 'partner' | 'admin-ip' | 'auth-ip' | 'host' | 'dev-partner';

export interface AlertContext {
  key: string;
  ip: string;
  context: AlertContextType;
}

export async function dispatchRateLimitAlert(ctx: AlertContext): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) {
      console.error('[AlertDispatcher] Redis unavailable — alert suppressed (Fail-Safe)');
      return;
    }

    // Auditor #3: context를 네임스페이스에 포함하여 동일 key가 다른 context에서 독립 알림 보장
    const suppressionKey = `alert:ratelimit:${ctx.context}:${ctx.key}`;

    // Upstash SET NX 반환값: "OK"(신규 생성) | null(이미 존재)
    const isNewAlert = await redis.set(suppressionKey, '1', {
      nx: true,
      ex: SUPPRESSION_TTL_SECONDS,
    });
    if (isNewAlert !== 'OK') return;

    // 외부 AI 7차 #2: 튜닝 근거 확보용 성공 로그 (WL-159에서 본격 observability 강화 예정)
    console.info('[AlertDispatcher] alert dispatched', {
      key: ctx.key,
      context: ctx.context,
    });

    await sendEmailAlert({
      subject: `[Rate Limit] ${ctx.context} key=${ctx.key}`,
      payload: {
        key: ctx.key,
        ip: ctx.ip,
        context: ctx.context,
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
      },
    }).catch((err) => {
      console.error('[AlertDispatcher] sendEmailAlert failed:', err);
    });
  } catch (err) {
    console.error('[AlertDispatcher] unexpected error — suppressed:', err);
  }
}
