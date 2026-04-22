'use client'

import { useState, useCallback } from 'react'

// WL-148 — 섹션 폼 dirty 상태 훅.
// MVP 단순화 정책: 유저가 입력 변경하면 dirty=true. 서버 액션 성공 시 markClean으로 해제.
// Undo(원본값 복원) 시 자동 해제는 지원하지 않는다 — 원본값 비교는 구현 복잡도↑ + E2E 예측성↓.

interface FormDirty {
  dirty: boolean
  markDirty: () => void
  markClean: () => void
}

export function useFormDirty(): FormDirty {
  const [dirty, setDirty] = useState(false)
  const markDirty = useCallback(() => setDirty(true), [])
  const markClean = useCallback(() => setDirty(false), [])
  return { dirty, markDirty, markClean }
}
