-- =============================================================================
-- Migration: 20260408000001_create_tables.sql
-- Description: 전체 테이블 생성 (Multi-tenant White-label Site)
-- 생성 순서: partners → profiles → contents / global_contents / leads /
--            site_visits / system_logs
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) partners (파트너사 기본 설정 및 테마)
--    profiles보다 먼저 생성 — profiles.partner_id가 이 테이블을 참조
-- -----------------------------------------------------------------------------
CREATE TABLE partners (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID NOT NULL REFERENCES auth.users(id),
  business_name  TEXT NOT NULL,
  subdomain      TEXT UNIQUE NOT NULL,
  custom_domain  TEXT UNIQUE,
  custom_domain_status TEXT DEFAULT 'none'
    CHECK (custom_domain_status IN ('none', 'pending', 'approved', 'active')),
  is_active      BOOLEAN DEFAULT true,

  primary_color   TEXT DEFAULT '#0000FF',
  secondary_color TEXT DEFAULT '#F3F4F6',
  logo_url        TEXT,
  favicon_url     TEXT,

  -- 신규 리드 접수 시 알림을 받을 이메일 목록 (최대 3개)
  -- 예: ["ceo@acme.com", "sales@acme.com"]
  -- 최대 3개 제한은 애플리케이션 레벨에서 검증
  notification_emails JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- 0) profiles (사용자 역할 및 파트너 소속 관리)
--    partners 이후에 생성 — partner_id가 partners(id)를 참조
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('master_admin', 'partner_admin')),
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- 2) contents (마케팅 사이트 섹션 콘텐츠 — 파트너별)
--    section_type 예: 'hero', 'about', 'contact', 'terms', 'privacy'
-- -----------------------------------------------------------------------------
CREATE TABLE contents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,

  title        TEXT,
  subtitle     TEXT,
  body         TEXT,
  cta_text     TEXT,
  contact_info JSONB DEFAULT '{"email": "", "phone": "", "address": ""}',

  -- 발행 상태: false(초안)인 콘텐츠는 공개 마케팅 사이트에 노출되지 않음
  is_published BOOLEAN DEFAULT false,

  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_partner_section UNIQUE (partner_id, section_type)
);


-- -----------------------------------------------------------------------------
-- 2-1) global_contents (공통 섹션 콘텐츠 — Master Admin 전용 편집)
--      partner_id 없이 저장, 모든 파트너 마케팅 사이트에 동일 적용
--      section_type 예: 'features', 'trust_badges'
-- -----------------------------------------------------------------------------
CREATE TABLE global_contents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type TEXT NOT NULL UNIQUE,

  title        TEXT,
  subtitle     TEXT,
  body         TEXT,
  -- 섹션별 추가 데이터 (예: 기능 카드 목록, 인증 배지 이미지 URL 등)
  meta         JSONB DEFAULT '{}',

  updated_at   TIMESTAMPTZ DEFAULT now(),
  -- 마지막 수정자 추적 (Master Admin audit 용도)
  updated_by   UUID REFERENCES auth.users(id)
);


-- -----------------------------------------------------------------------------
-- 3) leads (잠재 고객 문의 내역 — 원본)
--    ⚠️ Master Admin은 이 테이블에 직접 접근 불가
--       반드시 leads_masked_view를 통해서만 조회
-- -----------------------------------------------------------------------------
CREATE TABLE leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  customer_name       TEXT NOT NULL,
  company_name        TEXT,
  email               TEXT NOT NULL,
  phone               TEXT,
  cloud_usage_amount  TEXT,
  message             TEXT,

  -- new: 신규 접수 | in_progress: 검토 중 | contacted: 연락 완료 | closed: 종결
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'contacted', 'closed')),

  created_at TIMESTAMPTZ DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- 3-1) site_visits (마케팅 사이트 일별 방문 카운터)
--      전환율 계산(리드 수 / 방문 수) 용도
--      Upsert 방식으로 일별 누적 카운트
-- -----------------------------------------------------------------------------
CREATE TABLE site_visits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count      INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT unique_partner_daily UNIQUE (partner_id, visit_date)
);


-- -----------------------------------------------------------------------------
-- 3-2) system_logs (Master Admin 행위 감사 로그)
--      Impersonation 포함 모든 관리 작업 기록
--      actor_id(실제 행위자) + on_behalf_of(대상 파트너)로 법적 책임 추적
-- -----------------------------------------------------------------------------
CREATE TABLE system_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 실제 행위자 (항상 Master Admin의 auth.uid())
  actor_id     UUID NOT NULL REFERENCES auth.users(id),
  -- Impersonation 중인 경우 대상 파트너 ID, 일반 작업은 NULL
  on_behalf_of UUID REFERENCES partners(id),
  -- 수행된 작업 (예: 'impersonate_start', 'partner_update', 'global_content_publish')
  action       TEXT NOT NULL,
  -- 영향받은 테이블명 (예: 'partners', 'contents', 'global_contents')
  target_table TEXT,
  -- 영향받은 row의 ID
  target_id    UUID,
  -- 변경 전후 데이터: {"before": {...}, "after": {...}}
  diff         JSONB,
  -- Master Admin 요청 IP (법적 증거용)
  ip           TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);
