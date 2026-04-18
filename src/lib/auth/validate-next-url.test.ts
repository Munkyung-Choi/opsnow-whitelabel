import { describe, it, expect } from 'vitest'
import { validateNextUrl } from './validate-next-url'

// WL-53 R8-01 — next= 인젝션 방어 (Open Redirect 차단)
// 설계:
//   ALLOWED_NEXT_PREFIXES = ['/admin/', '/partner/']
//   DENIED_NEXT_PATHS     = ['/auth/', '/api/', '/__proxy_health']
//   fallback              = '/admin/dashboard'
//   방어 3단계: 재귀 디코딩 → NFKC 정규화 → URL 파싱 + pathname 재검증

const FALLBACK = '/admin/dashboard'

describe('validateNextUrl', () => {
  describe('허용 (allowed)', () => {
    it('/admin/dashboard → /admin/dashboard', () => {
      expect(validateNextUrl('/admin/dashboard')).toBe('/admin/dashboard')
    })

    it('/admin/partners/123 (dynamic segment) → /admin/partners/123', () => {
      expect(validateNextUrl('/admin/partners/123')).toBe('/admin/partners/123')
    })

    it('/partner/my-site → /partner/my-site', () => {
      expect(validateNextUrl('/partner/my-site')).toBe('/partner/my-site')
    })

    it('/admin/dashboard?tab=overview — query string 포함 시 pathname만 반환', () => {
      expect(validateNextUrl('/admin/dashboard?tab=overview')).toBe('/admin/dashboard')
    })

    it('/admin/./dashboard — URL 정규화 후 /admin/dashboard 허용', () => {
      expect(validateNextUrl('/admin/./dashboard')).toBe('/admin/dashboard')
    })
  })

  describe('차단 — 절대 URL', () => {
    it('https://evil.com → fallback', () => {
      expect(validateNextUrl('https://evil.com')).toBe(FALLBACK)
    })

    it('http://evil.com/admin/dashboard (내부 경로 위장) → fallback', () => {
      expect(validateNextUrl('http://evil.com/admin/dashboard')).toBe(FALLBACK)
    })

    it('javascript:alert(1) → fallback', () => {
      expect(validateNextUrl('javascript:alert(1)')).toBe(FALLBACK)
    })

    it('data:text/html,<script>alert(1)</script> → fallback', () => {
      expect(validateNextUrl('data:text/html,<script>alert(1)</script>')).toBe(FALLBACK)
    })
  })

  describe('차단 — 프로토콜 상대 경로', () => {
    it('//evil.com → fallback', () => {
      expect(validateNextUrl('//evil.com')).toBe(FALLBACK)
    })

    it('//evil.com/admin/dashboard (prefix 위장) → fallback', () => {
      expect(validateNextUrl('//evil.com/admin/dashboard')).toBe(FALLBACK)
    })
  })

  describe('차단 — 백슬래시 우회', () => {
    it('/\\evil.com → fallback', () => {
      expect(validateNextUrl('/\\evil.com')).toBe(FALLBACK)
    })

    it('\\/evil.com → fallback', () => {
      expect(validateNextUrl('\\/evil.com')).toBe(FALLBACK)
    })

    it('/admin\\..\\evil → fallback (백슬래시 포함 시 선제 차단)', () => {
      expect(validateNextUrl('/admin\\..\\evil')).toBe(FALLBACK)
    })
  })

  describe('차단 — URL-encoded 우회', () => {
    it('%2F%2Fevil.com (단일 인코딩된 //) → fallback', () => {
      expect(validateNextUrl('%2F%2Fevil.com')).toBe(FALLBACK)
    })

    it('%2Fadmin%2F..%2Fevil (path traversal) → fallback', () => {
      expect(validateNextUrl('%2Fadmin%2F..%2Fevil')).toBe(FALLBACK)
    })

    it('%252F%252Fevil (이중 인코딩) → fallback (재귀 디코딩)', () => {
      expect(validateNextUrl('%252F%252Fevil')).toBe(FALLBACK)
    })
  })

  describe('차단 — path traversal', () => {
    it('/admin/../evil (상위 탈출) → fallback', () => {
      expect(validateNextUrl('/admin/../evil')).toBe(FALLBACK)
    })

    it('/admin/..  → fallback (루트로 탈출)', () => {
      expect(validateNextUrl('/admin/..')).toBe(FALLBACK)
    })
  })

  describe('차단 — unicode homoglyph', () => {
    it('/аdmin/dashboard (Cyrillic "а" U+0430) → fallback (비-ASCII 차단)', () => {
      expect(validateNextUrl('/\u0430dmin/dashboard')).toBe(FALLBACK)
    })

    it('/evіl.com (Cyrillic "і" U+0456) → fallback', () => {
      expect(validateNextUrl('/ev\u0456l.com')).toBe(FALLBACK)
    })
  })

  describe('차단 — deny list (redirect loop / non-user path)', () => {
    it('/auth/login → fallback (redirect loop 방지)', () => {
      expect(validateNextUrl('/auth/login')).toBe(FALLBACK)
    })

    it('/auth/logout → fallback', () => {
      expect(validateNextUrl('/auth/logout')).toBe(FALLBACK)
    })

    it('/api/admin/logs → fallback (non-user path)', () => {
      expect(validateNextUrl('/api/admin/logs')).toBe(FALLBACK)
    })

    it('/__proxy_health → fallback (debug 전용)', () => {
      expect(validateNextUrl('/__proxy_health')).toBe(FALLBACK)
    })
  })

  describe('차단 — 허용 prefix 외', () => {
    it('/ (root) → fallback', () => {
      expect(validateNextUrl('/')).toBe(FALLBACK)
    })

    it('/foo → fallback', () => {
      expect(validateNextUrl('/foo')).toBe(FALLBACK)
    })

    it('/admin (trailing slash 없음) → fallback', () => {
      expect(validateNextUrl('/admin')).toBe(FALLBACK)
    })

    it('/partner (trailing slash 없음) → fallback', () => {
      expect(validateNextUrl('/partner')).toBe(FALLBACK)
    })
  })

  describe('경계 — falsy input', () => {
    it('null → fallback', () => {
      expect(validateNextUrl(null)).toBe(FALLBACK)
    })

    it('undefined → fallback', () => {
      expect(validateNextUrl(undefined)).toBe(FALLBACK)
    })

    it('빈 문자열 "" → fallback', () => {
      expect(validateNextUrl('')).toBe(FALLBACK)
    })

    it('공백 문자열 "   " → fallback', () => {
      expect(validateNextUrl('   ')).toBe(FALLBACK)
    })
  })
})
