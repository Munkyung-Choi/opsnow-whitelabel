-- =============================================================================
-- Migration: 20260412000001_add_partner_sections.sql
-- Description: WL-40 — 파트너별 섹션 노출 제어 및 순서 관리 테이블 추가
-- Breakpoint: [Approved by 문경 님 on 2026-04-12]
-- =============================================================================

-- partner_sections: 파트너별 마케팅 섹션 가시성(is_visible) 및 순서(display_order) 관리
CREATE TABLE IF NOT EXISTS public.partner_sections (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id    UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  section_type  TEXT NOT NULL CHECK (section_type IN (
    'pain_points', 'stats', 'how_it_works',
    'finops_automation', 'core_engines', 'role_based_value',
    'faq', 'final_cta'
  )),
  is_visible    BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, section_type)
);

ALTER TABLE public.partner_sections ENABLE ROW LEVEL SECURITY;

-- anon: 마케팅 사이트 렌더링용 — is_visible=true인 섹션만 노출 (정보 최소화)
CREATE POLICY "anon_select_visible_partner_sections" ON public.partner_sections
  FOR SELECT TO anon USING (is_visible = true);

-- authenticated: 자사 섹션만 읽기 (partner_admin)
CREATE POLICY "auth_select_own_sections" ON public.partner_sections
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    partner_id = (
      SELECT partner_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'partner_admin'
    )
  );

-- authenticated: 자사 섹션 update (is_visible, display_order 토글 — WL-42 어드민 구현 시 사용)
CREATE POLICY "auth_update_own_sections" ON public.partner_sections
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    partner_id = (
      SELECT partner_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'partner_admin'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    partner_id = (
      SELECT partner_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'partner_admin'
    )
  );

-- 인덱스: partner_id 기준 빠른 조회
CREATE INDEX IF NOT EXISTS idx_partner_sections_partner_id
  ON public.partner_sections (partner_id);
