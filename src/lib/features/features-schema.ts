import { z } from 'zod'

/**
 * ⚠️ SSOT — FEATURE_KEYS 확장 시 **4곳 동기 수정 의무** (WL-150, DEBT-012):
 *   1. 이 파일의 FEATURE_KEYS 배열 + FeaturesSchema.shape
 *   2. `supabase/migrations/YYYYMMDDNNNNNN_partners_features_check_update.sql`
 *      — is_valid_partner_features() 함수 내 `e.key NOT IN (...)` 목록 재선언
 *   3. `supabase/migrations/YYYYMMDDNNNNNN_update_partner_feature_fn_allowlist.sql`
 *      — p_feature_key NOT IN (...) 목록 + jsonb_build_object 항목
 *   4. Supabase SQL Editor에서 문경 님 직접 적용 (CLAUDE.md 2026-04-08 운영 규칙)
 *
 * 누락 시 방어망:
 *   - 행동 기반 drift 탐지 테스트: `tests/lib/features/features-sync.test.ts`
 *   - 런타임 관용 처리: `hasFeature()` unknown key → console.warn + false
 *   - DB CHECK 제약: `partners_features_shape` (Layer 2 최후의 보루)
 *
 * 구조적 해결 로드맵: DEBT-012 (docs/tech-debt.md) — key 6개 이상 또는 drift 사고 1회 시 상환.
 */
export const FEATURE_KEYS = ['custom_domain', 'analytics', 'multi_locale'] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]

export const FeaturesSchema = z.object({
  custom_domain: z.boolean().optional().default(false),
  analytics: z.boolean().optional().default(false),
  multi_locale: z.boolean().optional().default(false),
})

export type FeaturesMap = z.infer<typeof FeaturesSchema>
