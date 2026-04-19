import { z } from 'zod'

// Admin 인프라 §4: 공유 Zod 스키마 패턴
// Server Action의 Step 4(입력 검증)와 Client 폼 UI가 이 파일을 SSOT로 참조한다.

export const SUPPORTED_LOCALES = ['ko', 'en', 'ja', 'zh'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  ko: '한국어',
  en: '영어',
  ja: '일본어',
  zh: '중국어',
}

export const createPartnerSchema = z
  .object({
    business_name: z.string().min(2, '법인명은 2자 이상 입력해 주세요.').max(100),
    subdomain: z
      .string()
      .min(2, '서브도메인은 2자 이상 입력해 주세요.')
      .max(30, '서브도메인은 30자 이하로 입력해 주세요.')
      .regex(
        /^[a-z0-9][a-z0-9-]*$/,
        '영소문자, 숫자, 하이픈(-)만 사용 가능합니다. 처음은 영소문자 또는 숫자로 시작해야 합니다.'
      ),
    theme_key: z.enum(['gray', 'blue', 'green', 'orange'], {
      error: '테마를 선택해 주세요.',
    }),
    default_locale: z
      .enum(SUPPORTED_LOCALES, { error: '기본 언어를 선택해 주세요.' })
      .default('ko'),
    published_locales: z
      .array(z.enum(SUPPORTED_LOCALES))
      .min(1, '최소 1개 언어를 게시해야 합니다.')
      .default(['ko']),
  })
  .refine((data) => data.published_locales.includes(data.default_locale), {
    message: '기본 언어는 게시 언어 목록에 포함되어야 합니다.',
    path: ['default_locale'],
  })

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>

export type CreatePartnerFieldErrors = Partial<
  Record<keyof CreatePartnerInput, string>
>
