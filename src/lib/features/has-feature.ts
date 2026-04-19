import { FEATURE_KEYS, FeaturesSchema, type FeatureKey } from './features-schema'

/**
 * WL-124 — 파트너별 Feature Flag 조회 단일 진입점.
 *
 * ⚠️ UX 분기 전용 (기능 표시/숨김 결정).
 *    접근 제어(Auth/Authorization) 게이트로 절대 사용하지 말 것.
 *    인증·권한 검증은 withAdminAction 또는 requireRole에서 수행한다.
 *
 * 우선순위:
 *   1. unknown key 탐지 → console.warn (오타 방지)
 *   2. Zod 파싱 실패 → console.warn + false (관용 처리)
 *   3. 파싱 성공 → 해당 key 값 (없으면 false)
 */
export function hasFeature(
  partner: { features: unknown },
  feature: FeatureKey
): boolean {
  const raw = partner.features

  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const unknownKeys = Object.keys(raw as object).filter(
      (k) => !(FEATURE_KEYS as readonly string[]).includes(k)
    )
    if (unknownKeys.length > 0) {
      console.warn(`[features] Unknown feature keys detected:`, unknownKeys)
    }
  }

  const parsed = FeaturesSchema.safeParse(raw ?? {})
  if (!parsed.success) {
    console.warn(`[features] Invalid features JSONB structure:`, parsed.error.issues)
    return false
  }

  return parsed.data[feature] ?? false
}
