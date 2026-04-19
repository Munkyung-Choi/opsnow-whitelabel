'use server'

import { revalidatePath } from 'next/cache'
import { withAdminAction } from '@/lib/auth/with-admin-action'
import { updatePartnerThemeSchema, type SiteBuilderFormState } from '@/lib/schemas/site-builder'
import { uploadPartnerAsset, validatePartnerAssetFile } from '@/lib/storage'

export async function updatePartnerTheme(
  _prevState: SiteBuilderFormState,
  formData: FormData
): Promise<SiteBuilderFormState> {
  return withAdminAction(
    {
      requiredRole: 'partner_admin',
      auditAction: 'partner.theme.update',
      revalidate: '/admin/site-builder',
    },
    async (user, db) => {
      // Step 4: 입력 검증 (Zod + 파일 검증 — 변경 전 일괄 검사)
      const parsed = updatePartnerThemeSchema.safeParse({
        theme_key: formData.get('theme_key'),
      })

      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors
        return {
          result: { fieldErrors: { theme_key: flat.theme_key?.[0] } } as SiteBuilderFormState,
        }
      }

      const logoFile = formData.get('logo')
      const faviconFile = formData.get('favicon')
      const fieldErrors: SiteBuilderFormState['fieldErrors'] = {}

      if (logoFile instanceof File && logoFile.size > 0) {
        const v = validatePartnerAssetFile('logo', logoFile)
        if (!v.ok) fieldErrors.logo = v.error
      }
      if (faviconFile instanceof File && faviconFile.size > 0) {
        const v = validatePartnerAssetFile('favicon', faviconFile)
        if (!v.ok) fieldErrors.favicon = v.error
      }
      if (fieldErrors.logo || fieldErrors.favicon) {
        return { result: { fieldErrors } as SiteBuilderFormState }
      }

      // 현재 상태 조회 (audit diff + 마케팅 캐시 무효화용 subdomain)
      const { data: current } = await db
        .from('partners')
        .select('theme_key, logo_url, favicon_url, subdomain')
        .eq('id', user.partner_id)
        .single()

      // Step 5: 파일 업로드 (있을 때만)
      // Audit R-A-1: partnerId는 user.partner_id에서 직접 주입 — form 입력 신뢰 금지
      let logoUrl: string | undefined
      let faviconUrl: string | undefined
      // rollback 대상 추적 — DB 실패 시 이미 업로드된 파일 삭제
      let uploadedLogo: { path: string; bucket: string } | undefined
      let uploadedFavicon: { path: string; bucket: string } | undefined

      if (logoFile instanceof File && logoFile.size > 0) {
        const r = await uploadPartnerAsset(db, {
          partnerId: user.partner_id,
          type: 'logo',
          file: logoFile,
        })
        if (!r.ok) {
          return { result: { fieldErrors: { logo: r.error } } as SiteBuilderFormState }
        }
        logoUrl = r.publicUrl
        uploadedLogo = { path: r.path, bucket: r.bucket }
      }

      if (faviconFile instanceof File && faviconFile.size > 0) {
        const r = await uploadPartnerAsset(db, {
          partnerId: user.partner_id,
          type: 'favicon',
          file: faviconFile,
        })
        if (!r.ok) {
          // 로고가 이미 업로드됐다면 고아 파일 rollback
          if (uploadedLogo) {
            await db.storage.from(uploadedLogo.bucket).remove([uploadedLogo.path]).catch(() => {})
          }
          return { result: { fieldErrors: { favicon: r.error } } as SiteBuilderFormState }
        }
        faviconUrl = r.publicUrl
        uploadedFavicon = { path: r.path, bucket: r.bucket }
      }

      // Step 5 (DB): partners 업데이트
      const updatePayload = {
        theme_key: parsed.data.theme_key,
        updated_at: new Date().toISOString(),
        ...(logoUrl !== undefined && { logo_url: logoUrl }),
        ...(faviconUrl !== undefined && { favicon_url: faviconUrl }),
      }

      const { error: dbError } = await db
        .from('partners')
        .update(updatePayload)
        .eq('id', user.partner_id)

      if (dbError) {
        // DB 실패 시 업로드된 파일 모두 rollback (고아 파일 방지)
        if (uploadedLogo) await db.storage.from(uploadedLogo.bucket).remove([uploadedLogo.path]).catch(() => {})
        if (uploadedFavicon) await db.storage.from(uploadedFavicon.bucket).remove([uploadedFavicon.path]).catch(() => {})
        return {
          result: { error: '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' } as SiteBuilderFormState,
        }
      }

      // 마케팅 사이트 테마 즉시 반영 (subdomain 경로 정밀 무효화)
      if (current?.subdomain) {
        revalidatePath(`/${current.subdomain}`, 'layout')
      }

      return {
        result: { ok: true } as SiteBuilderFormState,
        auditDetails: {
          target_table: 'partners',
          target_id: user.partner_id,
          diff: {
            before: {
              theme_key: current?.theme_key,
              logo_url: current?.logo_url,
              favicon_url: current?.favicon_url,
            },
            after: updatePayload,
          },
        },
      }
    }
  )
}
