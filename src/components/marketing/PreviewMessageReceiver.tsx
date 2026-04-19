'use client'

import { useEffect } from 'react'

// admin origin 목록 — postMessage origin 검증에 사용
const ADMIN_ORIGIN_PATTERNS = [
  'admin-whitelabel.localhost',
  'admin.opsnow-whitelabel.vercel.app',
]

function isAllowedAdminOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    return ADMIN_ORIGIN_PATTERNS.some((pattern) => hostname.includes(pattern))
  } catch {
    return false
  }
}

interface PreviewMessage {
  type: 'WL_PREVIEW_UPDATE'
  section: string
  fields: Record<string, string>
}

export default function PreviewMessageReceiver() {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isAllowedAdminOrigin(event.origin)) return

      const data = event.data as PreviewMessage
      if (data?.type !== 'WL_PREVIEW_UPDATE') return

      const { fields } = data
      Object.entries(fields).forEach(([fieldKey, value]) => {
        const selector = `[data-wl-preview="${fieldKey}"]`
        const el = document.querySelector(selector)
        if (el) el.textContent = value
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return null
}
