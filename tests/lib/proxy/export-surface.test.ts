import { describe, it, expect } from 'vitest'
import * as proxyModule from '@/proxy'

// WL-156 — proxy.ts export 표면 assertion.
// Next.js 16.x는 src/proxy.ts를 미들웨어 진입점으로 인식한다 (commit b381220 참조).
// `export const config` matcher가 존재해야 Next.js가 올바르게 라우팅을 등록한다.
// src/middleware.ts와의 중복 선언은 빌드 충돌을 유발하므로 금지.

describe('proxy 모듈 export 표면 — 미들웨어 등록 guardrail', () => {
  it('proxy 모듈은 config matcher를 export한다 (Next.js 미들웨어 등록)', () => {
    expect('config' in proxyModule).toBe(true)
    const config = (proxyModule as { config?: { matcher?: unknown } }).config
    expect(Array.isArray(config?.matcher)).toBe(true)
  })

  it('proxy 모듈은 proxy 함수를 export한다', () => {
    expect(typeof proxyModule.proxy).toBe('function')
  })

  it('proxy 모듈은 validateLocale 함수를 re-export한다 (기존 하위 호환)', () => {
    expect(typeof proxyModule.validateLocale).toBe('function')
  })
})
