import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { hasFeature } from '@/lib/features/has-feature'

// WL-124 — hasFeature() Unit Tests

describe('hasFeature — 정상 케이스', () => {
  it('feature가 true로 설정된 경우 true 반환', () => {
    expect(hasFeature({ features: { custom_domain: true } }, 'custom_domain')).toBe(true)
  })

  it('feature가 false로 설정된 경우 false 반환', () => {
    expect(hasFeature({ features: { analytics: false } }, 'analytics')).toBe(false)
  })

  it('여러 key가 혼재할 때 요청한 key만 반환', () => {
    const features = { custom_domain: true, analytics: false, multi_locale: true }
    expect(hasFeature({ features }, 'analytics')).toBe(false)
    expect(hasFeature({ features }, 'multi_locale')).toBe(true)
  })
})

describe('hasFeature — null / undefined / 빈 features', () => {
  it('features가 null이면 false 반환', () => {
    expect(hasFeature({ features: null }, 'custom_domain')).toBe(false)
  })

  it('features가 undefined이면 false 반환', () => {
    expect(hasFeature({ features: undefined }, 'analytics')).toBe(false)
  })

  it('features가 빈 객체 {}이면 false 반환', () => {
    expect(hasFeature({ features: {} }, 'multi_locale')).toBe(false)
  })

  it('features에 해당 key가 없으면 false 반환', () => {
    expect(hasFeature({ features: { analytics: true } }, 'custom_domain')).toBe(false)
  })
})

describe('hasFeature — unknown key → console.warn', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('알 수 없는 key가 있으면 console.warn 호출', () => {
    hasFeature({ features: { custom_domain: true, unknown_flag: true } }, 'custom_domain')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown feature keys'),
      expect.arrayContaining(['unknown_flag'])
    )
  })

  it('알 수 없는 key가 있어도 기존 알려진 key는 정상 반환', () => {
    const result = hasFeature({ features: { analytics: true, typo_flag: false } }, 'analytics')
    expect(result).toBe(true)
  })

  it('알려진 key만 있으면 warn 없음', () => {
    hasFeature({ features: { custom_domain: false } }, 'custom_domain')
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe('hasFeature — 비정상 JSONB 구조 → warn + false', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('features가 string이면 warn + false', () => {
    expect(hasFeature({ features: 'invalid' }, 'custom_domain')).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('features가 배열이면 warn + false', () => {
    expect(hasFeature({ features: ['custom_domain'] }, 'custom_domain')).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('features가 숫자이면 warn + false', () => {
    expect(hasFeature({ features: 1 }, 'analytics')).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
  })
})
