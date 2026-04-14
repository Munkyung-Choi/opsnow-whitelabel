-- =============================================================================
-- Migration: 20260414000001_add_theme_key.sql
-- Description: [WL-65] partners.theme_key 컬럼 추가
--              hex 기반 color 저장 → 테마 프리셋 키 기반 관리로 전환
-- Breakpoint: WL #1 (DB Schema 변경) — 문경 님 승인 완료 (2026-04-14)
-- =============================================================================

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS theme_key TEXT DEFAULT 'blue'
    CONSTRAINT partners_theme_key_check
    CHECK (theme_key IN ('gray', 'blue', 'green', 'orange'));

COMMENT ON COLUMN partners.theme_key IS
  'Figma Make 기준 테마 프리셋 키 (gray|blue|green|orange). '
  'src/lib/theme-presets.ts의 ThemeKey와 1:1 매핑. '
  'primary_color / secondary_color 컬럼은 deprecated.';

-- -----------------------------------------------------------------------------
-- 기존 파트너 데이터 마이그레이션: primary_color hex → theme_key
-- 로컬 seed 색상(Tailwind palette)과 Figma Make 색상 모두 포함
-- -----------------------------------------------------------------------------
UPDATE partners SET theme_key = 'gray'
  WHERE primary_color IN ('#374151', '#0D0C22', '#6D28D9');

UPDATE partners SET theme_key = 'green'
  WHERE primary_color IN ('#16A34A', '#1A5835');

UPDATE partners SET theme_key = 'orange'
  WHERE primary_color IN ('#EA580C', '#D23F01');

-- 위 조건에 해당하지 않는 기존 파트너는 DEFAULT 'blue' 유지
-- (파란 계열: #2563EB, #0369A1, #0012B6 등)
