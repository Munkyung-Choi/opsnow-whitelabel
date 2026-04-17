-- =============================================================================
-- Migration: 20260417000001_add_domain_requests.sql
-- Description: domain_requests 역공학 마이그레이션 — Shadow DB 해소 (WL-108)
-- Track: HIGH | Human Check: 승인완료 2026-04-17
-- ✅ 멱등성 보장: 클라우드(기존 테이블) + 로컬(신규 생성) 양쪽 안전하게 적용
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ENUM 타입 — domain_request_status
--    멱등성: duplicate_object 예외 무시
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.domain_request_status AS ENUM (
    'pending',    -- 파트너가 제출, 검토 대기
    'approved',   -- Master Admin 승인, DNS 검증 진행 중
    'active',     -- DNS 검증 완료, 실제 라우팅 적용됨
    'rejected',   -- Master Admin 거절
    'expired'     -- 다른 요청이 active 되면 기존 active는 자동 만료
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- -----------------------------------------------------------------------------
-- 2. 테이블 생성
--    멱등성: IF NOT EXISTS
--    Audit #3: requested_domain 포맷 CHECK 추가 (proxy.ts 라우팅 오작동 방지)
--    Audit #6: request_type NOT NULL 추가
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.domain_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,

  -- Audit #3: 도메인 포맷 정규식 + 최대 길이 제약
  -- 허용: subdomain 단독(partner-a) 또는 FQDN(partner.example.com)
  requested_domain    TEXT NOT NULL
    CHECK (
      requested_domain ~* '^[a-z0-9][a-z0-9\-]*(\.[a-z0-9][a-z0-9\-]*)*$'
      AND length(requested_domain) BETWEEN 1 AND 253
    ),

  -- Audit #6: NOT NULL 추가 (NULL이 CHECK를 통과하는 버그 방지)
  request_type        TEXT NOT NULL
    CHECK (request_type IN ('subdomain', 'custom_tld')),

  status              public.domain_request_status NOT NULL DEFAULT 'pending',

  -- DNS TXT 레코드 등 검증용 메타데이터
  verification_record JSONB DEFAULT '{}',

  rejection_reason    TEXT,

  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  reviewed_at         TIMESTAMPTZ,    -- Master Admin 검토 시각
  activated_at        TIMESTAMPTZ     -- active 상태 전환 시각
);


-- -----------------------------------------------------------------------------
-- 3. RLS 활성화
-- -----------------------------------------------------------------------------
ALTER TABLE public.domain_requests ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- 4. RLS 정책 (4개)
--    멱등성: DROP IF EXISTS → CREATE
--    정책명: 클라우드 기존 이름 유지 (컨벤션 일관성 보장)
--    Audit #1: partner_can_update_own_pending_requests 신규 추가
--    Audit #5: master_admin ALL 유지 (domain_requests는 인프라 설정값, PII 아님)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "master_admin_full_access"                    ON public.domain_requests;
DROP POLICY IF EXISTS "partner_can_view_own_requests"               ON public.domain_requests;
DROP POLICY IF EXISTS "partner_can_insert_own_requests"             ON public.domain_requests;
DROP POLICY IF EXISTS "partner_can_update_own_pending_requests"     ON public.domain_requests;

-- Master Admin: 전체 도메인 요청 CRUD (긴급 복구·강제 상태 변경)
CREATE POLICY "master_admin_full_access" ON public.domain_requests
  FOR ALL TO authenticated
  USING (get_my_role() = 'master_admin');

-- Partner Admin: 본인 파트너 요청 조회
CREATE POLICY "partner_can_view_own_requests" ON public.domain_requests
  FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE owner_id = auth.uid())
  );

-- Partner Admin: 본인 파트너 요청 신규 등록
CREATE POLICY "partner_can_insert_own_requests" ON public.domain_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    partner_id IN (SELECT id FROM public.partners WHERE owner_id = auth.uid())
  );

-- Partner Admin: pending 상태 자기 요청만 수정 가능 (approved 이후 수정 차단)
-- Audit #1: status 에스컬레이션 방지 — USING과 WITH CHECK 모두 pending 조건 적용
CREATE POLICY "partner_can_update_own_pending_requests" ON public.domain_requests
  FOR UPDATE TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE owner_id = auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    partner_id IN (SELECT id FROM public.partners WHERE owner_id = auth.uid())
    AND status = 'pending'
  );


-- -----------------------------------------------------------------------------
-- 5. 트리거 함수 — sync_partner_domain_on_active()
--    Audit #2: SET search_path = public 추가 (Schema Injection 방지)
--    Audit #4: pg_trigger_depth() 가드 추가 (재귀 트리거 차단)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_partner_domain_on_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Audit #4: 재귀 트리거 방지 — 내부 UPDATE domain_requests 재진입 시 즉시 반환
    IF pg_trigger_depth() > 1 THEN
      RETURN NEW;
    END IF;

    IF NEW.status = 'active'::domain_request_status
       AND OLD.status != 'active'::domain_request_status THEN

        -- A. 기존 active 요청 → expired 전환 (파트너당 active 1개 보장)
        UPDATE public.domain_requests
        SET status     = 'expired'::domain_request_status,
            updated_at = NOW()
        WHERE partner_id = NEW.partner_id
          AND status = 'active'::domain_request_status
          AND id != NEW.id;

        -- B. partners 테이블 원자 동기화
        UPDATE public.partners
        SET
            custom_domain        = NEW.requested_domain,
            custom_domain_status = 'active',
            updated_at           = NOW()
        WHERE id = NEW.partner_id;

        -- C. 활성화 메타데이터 기록
        NEW.updated_at   := NOW();
        NEW.reviewed_at  := COALESCE(NEW.reviewed_at, NOW());
        NEW.activated_at := NOW();
    END IF;
    RETURN NEW;
END;
$$;


-- -----------------------------------------------------------------------------
-- 6. 트리거 연결
--    멱등성: DROP IF EXISTS → CREATE
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sync_domain_to_partner ON public.domain_requests;

CREATE TRIGGER trg_sync_domain_to_partner
  BEFORE UPDATE ON public.domain_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_partner_domain_on_active();
