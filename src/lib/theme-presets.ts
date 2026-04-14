/**
 * [WL-65] 멀티 테넌트 테마 프리셋 정의
 *
 * DB `partners.theme_key` 컬럼과 1:1 매핑.
 * 모든 색상값은 HSL 채널 문자열 (예: "234 100% 36%").
 * CSS에서 hsl(var(--primary)) 형태로 참조하므로 hsl() 래퍼는 포함하지 않는다.
 *
 * theme_key → --primary HSL 채널 변환표:
 *   gray   → 243 48%  9%
 *   blue   → 234 100% 36%
 *   green  → 146 54% 22%
 *   orange →  18 99% 41%
 */

export type ThemeKey = 'gray' | 'blue' | 'green' | 'orange'

export const DEFAULT_THEME_KEY: ThemeKey = 'blue'

/** Admin UI 표시명 및 대표 hex (theme preview용) */
export interface ThemeMeta {
  label: string
  primaryHex: string
}

export const THEME_META: Record<ThemeKey, ThemeMeta> = {
  gray:   { label: 'Gray',   primaryHex: '#0D0C22' },
  blue:   { label: 'Blue',   primaryHex: '#0012B6' },
  green:  { label: 'Green',  primaryHex: '#1A5835' },
  orange: { label: 'Orange', primaryHex: '#D23F01' },
}

/** CSS variable 맵 — 값은 hsl() 래퍼 없는 HSL 채널 문자열 */
export type ThemeVars = Record<string, string>

export const themes: Record<ThemeKey, ThemeVars> = {
  // ── Gray / Dark Navy ─────────────────────────────────────────────────────
  gray: {
    '--primary':                '243 48% 9%',
    '--primary-foreground':     '0 0% 100%',
    '--secondary':              '243 20% 93%',
    '--secondary-foreground':   '243 48% 9%',
    '--muted':                  '243 15% 94%',
    '--muted-foreground':       '243 10% 46%',
    '--accent':                 '243 18% 90%',
    '--accent-foreground':      '243 48% 9%',
    '--background':             '0 0% 100%',
    '--foreground':             '243 25% 10%',
    '--card':                   '0 0% 100%',
    '--card-foreground':        '243 25% 10%',
    '--popover':                '0 0% 100%',
    '--popover-foreground':     '243 25% 10%',
    '--border':                 '243 18% 88%',
    '--input':                  '243 18% 88%',
    '--ring':                   '243 48% 9%',
    '--destructive':            '0 84% 60%',
    '--destructive-foreground': '0 0% 100%',
  },

  // ── Blue ─────────────────────────────────────────────────────────────────
  blue: {
    '--primary':                '234 100% 36%',
    '--primary-foreground':     '0 0% 100%',
    '--secondary':              '234 50% 94%',
    '--secondary-foreground':   '234 100% 36%',
    '--muted':                  '234 30% 95%',
    '--muted-foreground':       '234 15% 46%',
    '--accent':                 '234 45% 91%',
    '--accent-foreground':      '234 100% 36%',
    '--background':             '0 0% 100%',
    '--foreground':             '234 40% 10%',
    '--card':                   '0 0% 100%',
    '--card-foreground':        '234 40% 10%',
    '--popover':                '0 0% 100%',
    '--popover-foreground':     '234 40% 10%',
    '--border':                 '234 35% 88%',
    '--input':                  '234 35% 88%',
    '--ring':                   '234 100% 36%',
    '--destructive':            '0 84% 60%',
    '--destructive-foreground': '0 0% 100%',
  },

  // ── Green ─────────────────────────────────────────────────────────────────
  green: {
    '--primary':                '146 54% 22%',
    '--primary-foreground':     '0 0% 100%',
    '--secondary':              '146 28% 92%',
    '--secondary-foreground':   '146 54% 22%',
    '--muted':                  '146 20% 94%',
    '--muted-foreground':       '146 10% 46%',
    '--accent':                 '146 22% 89%',
    '--accent-foreground':      '146 54% 22%',
    '--background':             '0 0% 100%',
    '--foreground':             '146 35% 10%',
    '--card':                   '0 0% 100%',
    '--card-foreground':        '146 35% 10%',
    '--popover':                '0 0% 100%',
    '--popover-foreground':     '146 35% 10%',
    '--border':                 '146 22% 87%',
    '--input':                  '146 22% 87%',
    '--ring':                   '146 54% 22%',
    '--destructive':            '0 84% 60%',
    '--destructive-foreground': '0 0% 100%',
  },

  // ── Orange ────────────────────────────────────────────────────────────────
  orange: {
    '--primary':                '18 99% 41%',
    '--primary-foreground':     '0 0% 100%',
    '--secondary':              '18 55% 94%',
    '--secondary-foreground':   '18 99% 41%',
    '--muted':                  '18 28% 94%',
    '--muted-foreground':       '18 12% 46%',
    '--accent':                 '18 48% 91%',
    '--accent-foreground':      '18 99% 41%',
    '--background':             '0 0% 100%',
    '--foreground':             '18 40% 10%',
    '--card':                   '0 0% 100%',
    '--card-foreground':        '18 40% 10%',
    '--popover':                '0 0% 100%',
    '--popover-foreground':     '18 40% 10%',
    '--border':                 '18 38% 87%',
    '--input':                  '18 38% 87%',
    '--ring':                   '18 99% 41%',
    '--destructive':            '0 84% 60%',
    '--destructive-foreground': '0 0% 100%',
  },
}
