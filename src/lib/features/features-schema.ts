import { z } from 'zod'

export const FEATURE_KEYS = ['custom_domain', 'analytics', 'multi_locale'] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]

export const FeaturesSchema = z.object({
  custom_domain: z.boolean().optional().default(false),
  analytics: z.boolean().optional().default(false),
  multi_locale: z.boolean().optional().default(false),
})

export type FeaturesMap = z.infer<typeof FeaturesSchema>
