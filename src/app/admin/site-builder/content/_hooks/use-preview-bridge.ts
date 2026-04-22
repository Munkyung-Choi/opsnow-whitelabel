'use client'

import { useRef, useCallback, useEffect, type RefObject } from 'react'

// WL-147 — ContentEditorForm에서 미리보기 iframe 브릿지 로직을 캡슐화한 훅.
// 폼은 UI 입력에만 집중하고, iframe 생성·URL 빌드·debounce·postMessage는 여기서 전담한다.

function buildPreviewUrl(subdomain: string, locale: string): string {
  if (typeof window === 'undefined') return ''
  const { hostname, port } = window.location
  if (hostname.includes('localhost')) {
    return `http://${subdomain}.localhost:${port || 3000}/${locale}`
  }
  return `${window.location.protocol}//${window.location.hostname}/?partner=${subdomain}`
}

interface PreviewBridge {
  iframeRef: RefObject<HTMLIFrameElement | null>
  previewUrl: string
  sendPreview: (section: string, fields: Record<string, string>) => void
}

export function usePreviewBridge(subdomain: string, locale: string): PreviewBridge {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 언마운트 시 pending timer 정리
  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    },
    []
  )

  const sendPreview = useCallback((section: string, fields: Record<string, string>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) return
      iframe.contentWindow.postMessage(
        { type: 'WL_PREVIEW_UPDATE', section, fields },
        '*' // 마케팅 사이트는 origin 검증을 수행; 어드민은 자체 iframe이므로 * 허용
      )
    }, 150)
  }, [])

  const previewUrl = buildPreviewUrl(subdomain, locale)

  return { iframeRef, previewUrl, sendPreview }
}
