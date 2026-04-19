import { z } from 'zod'

export const updatePartnerThemeSchema = z.object({
  theme_key: z.enum(['gray', 'blue', 'green', 'orange'], {
    error: '테마를 선택해 주세요.',
  }),
})

export type UpdatePartnerThemeInput = z.infer<typeof updatePartnerThemeSchema>

export interface SiteBuilderFormState {
  error?: string
  fieldErrors?: {
    theme_key?: string
    logo?: string
    favicon?: string
  }
  ok?: true
}
