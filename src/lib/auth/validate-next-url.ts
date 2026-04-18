// WL-53 / R8-01 — Open Redirect 방어용 next= 파라미터 화이트리스트 검증.
//
// 공격 벡터 커버리지:
//   - 절대 URL, protocol-relative (//), 백슬래시, URL-encoded, 이중 인코딩,
//     path traversal, unicode homoglyph, scheme injection (javascript:, data:)

export const ALLOWED_NEXT_PREFIXES = ['/admin/', '/partner/'] as const
export const DENIED_NEXT_PATHS = ['/auth/', '/api/', '/__proxy_health'] as const
export const DEFAULT_FALLBACK = '/admin/dashboard'

const DUMMY_ORIGIN = 'http://__dummy__'
const MAX_DECODE_DEPTH = 3

export function validateNextUrl(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return DEFAULT_FALLBACK
  const trimmed = raw.trim()
  if (trimmed.length === 0) return DEFAULT_FALLBACK

  let decoded: string
  try {
    decoded = recursiveDecode(trimmed, MAX_DECODE_DEPTH)
  } catch {
    return DEFAULT_FALLBACK
  }

  const normalized = decoded.normalize('NFKC')

  if (/[^\x00-\x7F]/.test(normalized)) return DEFAULT_FALLBACK
  if (normalized.includes('\\')) return DEFAULT_FALLBACK
  if (normalized.startsWith('//')) return DEFAULT_FALLBACK
  if (/^[a-z][a-z0-9+\-.]*:/i.test(normalized)) return DEFAULT_FALLBACK

  let parsed: URL
  try {
    parsed = new URL(normalized, DUMMY_ORIGIN)
  } catch {
    return DEFAULT_FALLBACK
  }
  if (parsed.origin !== DUMMY_ORIGIN) return DEFAULT_FALLBACK

  const pathname = parsed.pathname

  if (DENIED_NEXT_PATHS.some((denied) => isDeniedMatch(pathname, denied))) {
    return DEFAULT_FALLBACK
  }
  if (!ALLOWED_NEXT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return DEFAULT_FALLBACK
  }

  return pathname
}

function recursiveDecode(input: string, maxDepth: number): string {
  let current = input
  for (let i = 0; i < maxDepth; i++) {
    const next = decodeURIComponent(current)
    if (next === current) return current
    current = next
  }
  return current
}

function isDeniedMatch(pathname: string, denied: string): boolean {
  if (denied.endsWith('/')) {
    return pathname === denied.slice(0, -1) || pathname.startsWith(denied)
  }
  return pathname === denied
}
