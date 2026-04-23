import { z } from 'zod'

// WL-158 — observability 기능(Rate Limit 알림·Redis) 환경변수 SSOT.
// 모두 optional: 미설정 시 기능 비활성화(Fail-Safe), 형식 오류 시 console.error.
// getObservabilityEnv()는 호출 시점에 process.env를 읽는다 (모듈 로드 시점 아님).

const _observabilityEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_ALERT_FROM: z.string().min(1).optional(),
  RESEND_ALERT_TO: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
})

export type ObservabilityEnv = z.infer<typeof _observabilityEnvSchema>

export function getObservabilityEnv(): ObservabilityEnv {
  const result = _observabilityEnvSchema.safeParse({
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    RESEND_ALERT_FROM: process.env.RESEND_ALERT_FROM || undefined,
    RESEND_ALERT_TO: process.env.RESEND_ALERT_TO || undefined,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || undefined,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
  })
  if (!result.success) {
    console.error('[env] observability env 형식 오류 — Fail-Safe 적용:', result.error.flatten())
    return {}
  }
  return result.data
}
