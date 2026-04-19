// WL-125 — 파트너 자산 업로드 스키마 SSOT.
// 마이그레이션 20260419000009의 bucket 정의와 반드시 동기화.

export const PARTNER_ASSET_BUCKETS = {
  logo: 'partner-logos',
  favicon: 'partner-favicons',
} as const

export type PartnerAssetType = keyof typeof PARTNER_ASSET_BUCKETS

export const LOGO_CONSTRAINTS = {
  maxBytes: 2 * 1024 * 1024, // 2MB
  mimeTypes: ['image/png', 'image/jpeg', 'image/webp'] as const,
  extensions: ['png', 'jpg', 'jpeg', 'webp'] as const,
} as const

export const FAVICON_CONSTRAINTS = {
  maxBytes: 512 * 1024, // 512KB
  mimeTypes: ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png'] as const,
  extensions: ['ico', 'png'] as const,
} as const

export type PartnerAssetConstraints = {
  maxBytes: number
  mimeTypes: readonly string[]
  extensions: readonly string[]
}

export function getAssetConstraints(type: PartnerAssetType): PartnerAssetConstraints {
  return type === 'logo' ? LOGO_CONSTRAINTS : FAVICON_CONSTRAINTS
}

// MIME → 확장자 매핑. 업로드 시 파일명 구성에 사용.
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
}

export function getExtensionFromMime(mimeType: string): string | null {
  return MIME_EXTENSION_MAP[mimeType] ?? null
}

export type ValidationResult = { ok: true } | { ok: false; error: string }

export function validatePartnerAssetFile(
  type: PartnerAssetType,
  file: { size: number; type: string }
): ValidationResult {
  const constraints = getAssetConstraints(type)

  if (file.size > constraints.maxBytes) {
    const maxMB = (constraints.maxBytes / (1024 * 1024)).toFixed(2)
    return {
      ok: false,
      error: `파일 크기가 ${maxMB}MB를 초과합니다.`,
    }
  }

  if (!constraints.mimeTypes.includes(file.type)) {
    return {
      ok: false,
      error: `허용되지 않는 파일 형식입니다. 허용: ${constraints.mimeTypes.join(', ')}`,
    }
  }

  return { ok: true }
}
