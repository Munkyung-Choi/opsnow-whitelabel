-- =============================================================================
-- Seed: supabase/seed.sql
-- Description: 개발·테스트용 파트너, 콘텐츠, 리드 Seed 데이터 (WL-47)
-- 대상: 로컬 개발 환경 (supabase db reset)
-- 멱등성: ON CONFLICT DO NOTHING 방식 사용
-- ⚠️  프로덕션 DB에 절대 적용 금지
-- 민감 정보: 실제 이메일·전화번호 없음. test-* 도메인 및 더미 데이터만 사용.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- [Pre-clean] Seed 이메일 충돌 방지
-- auth.users의 email 컬럼은 partial unique index(users_email_partial_key)를 가진다.
-- 동일 이메일이 다른 UUID로 존재하면 INSERT ON CONFLICT (id)가 email 충돌을 막지 못함.
-- → seed UUID와 다른 ID를 가진 orphan 이메일을 먼저 삭제하여 멱등성 보장.
-- -----------------------------------------------------------------------------
DELETE FROM auth.users
WHERE email IN (
  'master@test.opsnow.com',
  'admin@cloudsave.test',
  'admin@dataflow.test',
  'admin@greensave.test',
  'admin@orangecloud.test'
)
AND id NOT IN (
  '762b0245-de65-46e5-ab27-b1c7bf8aaa29',
  '6adb5034-0a0e-4f60-bbd3-b1286a071473',
  'fab084cd-5921-44f6-85b1-a13a01d3cfd4',
  'c3000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000001'
);


-- -----------------------------------------------------------------------------
-- [Step 1] Auth Users (auth.users)
-- profiles.id → auth.users(id) FK 의존성 해결을 위해 먼저 생성
-- 고정 UUID로 관리하여 RLS 검증 스크립트(docs/exec-plans/)와 일치시킴
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new
) VALUES
  -- Master Admin
  (
    '762b0245-de65-46e5-ab27-b1c7bf8aaa29',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'master@test.opsnow.com',
    crypt('TestPassword123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, '', '', '', ''
  ),
  -- Partner A (CloudSave) Admin
  (
    '6adb5034-0a0e-4f60-bbd3-b1286a071473',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@cloudsave.test',
    crypt('TestPassword123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, '', '', '', ''
  ),
  -- Partner B (DataFlow) Admin
  (
    'fab084cd-5921-44f6-85b1-a13a01d3cfd4',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@dataflow.test',
    crypt('TestPassword123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, '', '', '', ''
  ),
  -- Partner C (GreenSave) Admin
  (
    'c3000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@greensave.test',
    crypt('TestPassword123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, '', '', '', ''
  ),
  -- Partner D (OrangeCloud) Admin
  (
    'd4000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@orangecloud.test',
    crypt('TestPassword123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- [Step 2] Partners (파트너사)
-- partner-a: CloudSave  — Gray 테마 (dark navy)
-- partner-b: DataFlow   — Blue 테마
-- partner-c: GreenSave  — Green 테마
-- partner-d: OrangeCloud — Orange 테마
-- -----------------------------------------------------------------------------
INSERT INTO public.partners (
  id, business_name, subdomain, owner_id,
  theme_key, default_locale, published_locales,
  logo_url, favicon_url,
  hero_image_url,  -- NULL = 기본 이미지(/images/marketing/hero-default.webp) 사용. 파트너 커스텀 업로드 시 Supabase Storage URL로 대체.
  is_active, notification_emails
) VALUES
  (
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'CloudSave',
    'partner-a',
    '6adb5034-0a0e-4f60-bbd3-b1286a071473',
    'gray', 'ko', ARRAY['ko'],
    '/images/partners/partner-a-logo.svg', NULL,  -- logo_url (로컬 dev용 정적 파일), favicon_url
    NULL,        -- hero_image_url: NULL = 기본 이미지 사용
    true, '["admin@cloudsave.test"]'
  ),
  (
    '9309979b-9211-457e-ad01-68e843c7687b',
    'DataFlow',
    'partner-b',
    'fab084cd-5921-44f6-85b1-a13a01d3cfd4',
    'blue', 'ko', ARRAY['ko'],
    '/images/partners/partner-b-logo.svg', NULL,  -- logo_url (로컬 dev용 정적 파일), favicon_url
    NULL,        -- hero_image_url: NULL = 기본 이미지 사용
    true, '["admin@dataflow.test"]'
  ),
  (
    'c3000000-0000-4000-8000-000000000002',
    'GreenSave',
    'partner-c',
    'c3000000-0000-4000-8000-000000000001',
    'green', 'ko', ARRAY['ko'],
    '/images/partners/partner-c-logo.svg', NULL,  -- logo_url (로컬 dev용 정적 파일), favicon_url
    NULL,        -- hero_image_url: NULL = 기본 이미지 사용
    true, '["admin@greensave.test"]'
  ),
  (
    'd4000000-0000-4000-8000-000000000002',
    'OrangeCloud',
    'partner-d',
    'd4000000-0000-4000-8000-000000000001',
    'orange', 'ko', ARRAY['ko'],
    '/images/partners/partner-d-logo.svg', NULL,  -- logo_url (로컬 dev용 정적 파일), favicon_url
    NULL,        -- hero_image_url: NULL = 기본 이미지 사용
    true, '["admin@orangecloud.test"]'
  )
ON CONFLICT (id) DO UPDATE SET
  business_name       = EXCLUDED.business_name,
  subdomain           = EXCLUDED.subdomain,
  theme_key           = EXCLUDED.theme_key,
  default_locale      = EXCLUDED.default_locale,
  published_locales   = EXCLUDED.published_locales,
  logo_url            = EXCLUDED.logo_url,
  is_active           = EXCLUDED.is_active,
  notification_emails = EXCLUDED.notification_emails,
  hero_image_url      = EXCLUDED.hero_image_url,
  updated_at          = NOW();


-- -----------------------------------------------------------------------------
-- [Step 3] Profiles (사용자 역할)
-- master_admin: OpsNow 내부 관리자 (partner_id = NULL)
-- partner_admin: 각 파트너사 담당자
-- -----------------------------------------------------------------------------
INSERT INTO public.profiles (id, role, partner_id) VALUES
  ('762b0245-de65-46e5-ab27-b1c7bf8aaa29', 'master_admin', NULL),
  ('6adb5034-0a0e-4f60-bbd3-b1286a071473', 'partner_admin', 'b03e99fd-9cec-4ab3-a2c5-3462562f84f2'),
  ('fab084cd-5921-44f6-85b1-a13a01d3cfd4', 'partner_admin', '9309979b-9211-457e-ad01-68e843c7687b'),
  ('c3000000-0000-4000-8000-000000000001', 'partner_admin', 'c3000000-0000-4000-8000-000000000002'),
  ('d4000000-0000-4000-8000-000000000001', 'partner_admin', 'd4000000-0000-4000-8000-000000000002')
ON CONFLICT (id) DO UPDATE SET
  role       = EXCLUDED.role,
  partner_id = EXCLUDED.partner_id;


-- -----------------------------------------------------------------------------
-- [Step 4] Contents (파트너별 마케팅 섹션 콘텐츠)
-- section_type은 WL-40 컴포넌트 인벤토리 기준:
--   hero, stats, how_it_works, faq, final_cta, terms, privacy, footer
-- is_published: hero/footer는 발행, 나머지 일부는 초안으로 혼합하여 Fallback 로직 검증
-- -----------------------------------------------------------------------------

-- [ Partner A: CloudSave ]
INSERT INTO public.contents (
  id, partner_id, section_type, title, subtitle, body, cta_text, contact_info, is_published
) VALUES
  -- Hero (발행)
  (
    'c0000001-0000-0000-0000-000000000001',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'hero',
    E'클라우드는 혁신적입니다.\n청구서만 빼고요.',
    '이제 복잡한 수동 관리는 끝났습니다. {PartnerName:이/가} 숨겨진 낭비를 찾아내 매월 청구서를 최대 40%까지 자동 삭감해드립니다.',
    NULL,
    '지금 무료로 시작하기',
    '{"email": "", "phone": "", "address": ""}',
    true
  ),
  -- Stats (발행)
  (
    'c0000001-0000-0000-0000-000000000002',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'stats',
    '{PartnerName:이/가} 만드는 실제 성과',
    NULL,
    '[{"number":"30%","label":"평균 비용 절감"},{"number":"5분","label":"전체 현황 파악"},{"number":"99.9%","label":"서비스 안정성"},{"number":"500+","label":"도입 기업"}]',
    NULL,
    '{"email": "", "phone": "", "address": ""}',
    true
  ),
  -- How It Works (발행)
  (
    'c0000001-0000-0000-0000-000000000003',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'how_it_works',
    '{PartnerName:이/가} 비용을 줄이는 3가지',
    '복잡한 클라우드 비용 구조를 3단계로 단순화합니다.',
    '[{"step":1,"title":"연결","description":"{PartnerName:을/를} 클라우드 계정에 연결합니다. AWS, Azure, GCP 모두 5분 내 설정 완료."},{"step":2,"title":"분석","description":"AI가 지출 패턴을 분석하고 낭비 리소스를 자동으로 탐지합니다."},{"step":3,"title":"최적화","description":"권고안을 클릭 한 번으로 적용하고 즉시 비용 절감 효과를 확인하세요."}]',
    NULL,
    '{"email": "", "phone": "", "address": ""}',
    true
  ),
  -- FAQ (발행)
  (
    'c0000001-0000-0000-0000-000000000004',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'faq',
    '자주 묻는 질문',
    NULL,
    '[
      {"question": "{PartnerName:은/는} 어떤 클라우드를 지원하나요?", "answer": "AWS, Azure, GCP 등 주요 퍼블릭 클라우드를 지원합니다."},
      {"question": "도입까지 얼마나 걸리나요?", "answer": "평균 2~3일 내에 연동 완료 후 즉시 사용 가능합니다."},
      {"question": "기존 데이터를 마이그레이션할 수 있나요?", "answer": "네, 온보딩 과정에서 전담 엔지니어가 지원합니다."},
      {"question": "계약 기간은 얼마인가요?", "answer": "월 단위 구독과 연간 구독 중 선택 가능합니다."},
      {"question": "무료 체험 기간이 있나요?", "answer": "14일 무료 체험을 제공합니다. 신용카드 없이 시작하세요."}
    ]',
    NULL,
    '{"email": "", "phone": "", "address": ""}',
    true
  ),
  -- Final CTA (발행)
  (
    'c0000001-0000-0000-0000-000000000005',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'final_cta',
    '지금 바로 혜택을 받아보세요',
    '전문 컨설턴트가 귀사의 클라우드 비용 현황을 무료로 분석해 드립니다.',
    NULL,
    '무료 상담 신청하기',
    '{"email": "", "phone": "", "address": ""}',
    true
  ),
  -- Footer / Contact Info (발행)
  (
    'c0000001-0000-0000-0000-000000000006',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'footer',
    'CloudSave',
    NULL,
    NULL,
    NULL,
    '{"email": "contact@cloudsave.test", "phone": "02-0000-0001", "address": "서울특별시 강남구 테헤란로 123, 테스트빌딩 5층"}',
    true
  ),
  -- Terms (초안 — Fallback 로직 검증용)
  (
    'c0000001-0000-0000-0000-000000000007',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'terms',
    '이용약관',
    NULL,
    '{{business_name}} 이용약관 본문입니다. (CloudSave 커스텀 버전)',
    NULL,
    '{"email": "", "phone": "", "address": ""}',
    false  -- 초안 상태 — global_contents fallback 테스트용
  ),
  -- Privacy (발행)
  (
    'c0000001-0000-0000-0000-000000000008',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'privacy',
    '개인정보 처리방침',
    NULL,
    '{{business_name}}은 고객의 개인정보를 소중히 여깁니다. (CloudSave 커스텀 버전)',
    NULL,
    '{"email": "", "phone": "", "address": ""}',
    true
  )
ON CONFLICT (partner_id, section_type) DO UPDATE SET
  title      = EXCLUDED.title,
  subtitle   = EXCLUDED.subtitle,
  body       = EXCLUDED.body,
  cta_text   = EXCLUDED.cta_text,
  contact_info = EXCLUDED.contact_info,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

-- [ Partner B: DataFlow ] — 최소 데이터 (Fallback 시나리오 집중 검증)
INSERT INTO public.contents (
  id, partner_id, section_type, title, subtitle, body, cta_text, contact_info, is_published
) VALUES
  -- Hero (발행)
  (
    'c0000002-0000-0000-0000-000000000001',
    '9309979b-9211-457e-ad01-68e843c7687b',
    'hero',
    '데이터가 흐르는 곳에 {PartnerName:이/가} 있습니다.',
    '클라우드 인프라 비용을 실시간으로 추적하고 최적화하세요.',
    NULL,
    '무료 체험 시작하기',
    '{"email": "", "phone": "", "address": ""}',
    true
  ),
  -- Footer (발행)
  (
    'c0000002-0000-0000-0000-000000000002',
    '9309979b-9211-457e-ad01-68e843c7687b',
    'footer',
    'DataFlow',
    NULL,
    NULL,
    NULL,
    '{"email": "contact@dataflow.test", "phone": "02-0000-0002", "address": "서울특별시 서초구 서초대로 456, 테스트센터 3층"}',
    true
  )
  -- 나머지 섹션(stats, how_it_works 등)은 미등록 → global_contents Fallback 로직 검증
ON CONFLICT (partner_id, section_type) DO UPDATE SET
  title      = EXCLUDED.title,
  subtitle   = EXCLUDED.subtitle,
  body       = EXCLUDED.body,
  contact_info = EXCLUDED.contact_info,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

-- [ Partner C: GreenSave ] — Green 테마 검증용 (hero + footer)
INSERT INTO public.contents (
  id, partner_id, section_type, title, subtitle, body, cta_text, contact_info, is_published
) VALUES
  -- Hero (발행)
  (
    'c0000003-0000-0000-0000-000000000001',
    'c3000000-0000-4000-8000-000000000002',
    'hero',
    '지속 가능한 클라우드 운영, {PartnerName:과/와} 함께',
    '환경을 생각하는 FinOps로 비용과 탄소발자국을 동시에 줄이세요.',
    NULL,
    '무료 상담 신청하기',
    '{"email": "", "phone": "", "address": ""}',
    true
  ),
  -- Footer (발행)
  (
    'c0000003-0000-0000-0000-000000000002',
    'c3000000-0000-4000-8000-000000000002',
    'footer',
    'GreenSave',
    NULL,
    NULL,
    NULL,
    '{"email": "contact@greensave.test", "phone": "02-0000-0003", "address": "서울특별시 마포구 월드컵북로 789, 그린타워 7층"}',
    true
  )
ON CONFLICT (partner_id, section_type) DO UPDATE SET
  title      = EXCLUDED.title,
  subtitle   = EXCLUDED.subtitle,
  body       = EXCLUDED.body,
  cta_text   = EXCLUDED.cta_text,
  contact_info = EXCLUDED.contact_info,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

-- [ Partner D: OrangeCloud ] — Orange 테마 검증용 (hero + footer)
INSERT INTO public.contents (
  id, partner_id, section_type, title, subtitle, body, cta_text, contact_info, is_published
) VALUES
  -- Hero (발행)
  (
    'c0000004-0000-0000-0000-000000000001',
    'd4000000-0000-4000-8000-000000000002',
    'hero',
    '클라우드 비용, {PartnerName:이/가} 새롭게 정의합니다',
    '에너지 넘치는 FinOps 플랫폼으로 낭비를 없애고 성장을 가속하세요.',
    NULL,
    '지금 시작하기',
    '{"email": "", "phone": "", "address": ""}',
    true
  ),
  -- Footer (발행)
  (
    'c0000004-0000-0000-0000-000000000002',
    'd4000000-0000-4000-8000-000000000002',
    'footer',
    'OrangeCloud',
    NULL,
    NULL,
    NULL,
    '{"email": "contact@orangecloud.test", "phone": "02-0000-0004", "address": "서울특별시 송파구 올림픽로 321, 오렌지빌딩 9층"}',
    true
  )
ON CONFLICT (partner_id, section_type) DO UPDATE SET
  title      = EXCLUDED.title,
  subtitle   = EXCLUDED.subtitle,
  body       = EXCLUDED.body,
  cta_text   = EXCLUDED.cta_text,
  contact_info = EXCLUDED.contact_info,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();


-- -----------------------------------------------------------------------------
-- [Step 5] Global Contents (공통 섹션 — Master Admin 전용 편집)
-- 모든 파트너에 동일하게 노출. 파트너 미등록 섹션의 Fallback 소스.
-- section_type은 WL-40 기준: pain_points, finops_automation, core_engines,
--                              role_based_value, features, trust_badges
-- -----------------------------------------------------------------------------
INSERT INTO public.global_contents (id, section_type, title, subtitle, body, meta) VALUES
  -- Pain Points
  (
    '00000000-0000-0000-0000-000000000001',
    'pain_points',
    '아직도 엑셀로 클라우드 비용을 관리하시나요?',
    '수작업 관리의 한계를 넘어, 이제는 자동화된 인텔리전스로 비용을 통제하세요.',
    NULL,
    '{
      "cards": [
        {"icon": "table", "title": "엑셀 수작업", "description": "매월 수십 개의 시트를 손으로 정리하느라 시간을 낭비하고 있진 않으신가요?"},
        {"icon": "alert", "title": "예산 초과 알림 부재", "description": "클라우드 비용이 예산을 초과한 뒤에야 알게 되는 상황이 반복되나요?"},
        {"icon": "puzzle", "title": "멀티 클라우드 복잡성", "description": "AWS, Azure, GCP를 동시에 쓰면서 통합 현황 파악이 안 되고 있나요?"}
      ]
    }'
  ),
  -- FinOps Automation
  (
    '00000000-0000-0000-0000-000000000002',
    'finops_automation',
    '필요할 때 만드는 핵심 엔진',
    'FinOps 자동화로 비용 절감을 실현하세요.',
    NULL,
    '{
      "features": [
        {"title": "96%", "subtitle": "비용 가시성", "description": "전체 클라우드 지출의 96%를 태깅하고 추적합니다."},
        {"title": "27%", "subtitle": "평균 절감률", "description": "AI 권고안 적용 시 평균 27% 비용이 절감됩니다."},
        {"title": "3%", "subtitle": "예산 초과율", "description": "알림 자동화 도입 후 예산 초과율이 3% 이하로 감소합니다."}
      ]
    }'
  ),
  -- Core Engines
  (
    '00000000-0000-0000-0000-000000000003',
    'core_engines',
    '핵심 AI로 관리하다, 이제 AI로 지출운영하십시오.',
    'OpsNow의 3가지 핵심 엔진이 클라우드 비용을 혁신합니다.',
    NULL,
    '{
      "engines": [
        {"name": "Cost Intelligence", "description": "멀티클라우드 비용 데이터를 통합 수집·분석하여 실시간 현황판을 제공합니다.", "icon": "BrainCircuit"},
        {"name": "AI Optimizer", "description": "머신러닝 기반 사용 패턴 분석으로 과잉 프로비저닝을 자동 감지하고 최적화 권고안을 생성합니다.", "icon": "Zap"},
        {"name": "FinOps Governance", "description": "예산 정책, 태깅 규칙, 알림 임계값을 코드로 관리하여 거버넌스를 자동화합니다.", "icon": "Cloud"}
      ]
    }'
  ),
  -- Role-Based Value
  (
    '00000000-0000-0000-0000-000000000004',
    'role_based_value',
    '당신의 역할에 최적화된 대시보드',
    '직책별로 필요한 인사이트를 즉시 확인하세요.',
    NULL,
    '{
      "roles": [
        {"role": "CFO", "title": "CFO를 위한 재무 가시성", "description": "전사 클라우드 지출 현황과 예산 대비 실적을 한눈에 확인하고 재무 보고를 자동화합니다.", "metrics": ["월간 지출 트렌드", "예산 소진율", "부서별 비용 배분"]},
        {"role": "DevOps", "title": "DevOps를 위한 리소스 최적화", "description": "서비스별·환경별 리소스 효율성을 분석하고 낭비 리소스를 실시간으로 탐지합니다.", "metrics": ["유휴 인스턴스 감지", "스케줄링 최적화", "Reserved/Spot 활용률"]},
        {"role": "FinOps", "title": "FinOps 팀을 위한 자동화", "description": "태깅 정책 준수율, 비용 할당, 쇼백/차지백 보고서를 자동 생성합니다.", "metrics": ["태깅 준수율", "쇼백 보고서", "절감 기회 목록"]}
      ]
    }'
  ),
  -- Features (기존 OpsNow 핵심 기능)
  (
    '00000000-0000-0000-0000-000000000005',
    'features',
    'OpsNow가 선택받는 이유',
    '국내외 500+ 기업이 신뢰하는 클라우드 비용 최적화 플랫폼',
    NULL,
    '{
      "items": [
        {"title": "Multi-cloud 통합", "description": "AWS, Azure, GCP, NCP를 단일 인터페이스에서 통합 관리"},
        {"title": "AI 비용 예측", "description": "과거 사용 패턴 기반 30일 비용 예측 및 이상 감지"},
        {"title": "자동 절감 권고", "description": "Right-sizing, Reserved Instance 구매 최적화 자동 권고"},
        {"title": "거버넌스 자동화", "description": "태깅 정책, 예산 알림, 보안 규정 준수 자동 검사"}
      ]
    }'
  )
ON CONFLICT (section_type) DO UPDATE SET
  title    = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  body     = EXCLUDED.body,
  meta     = EXCLUDED.meta,
  updated_at = NOW();


-- -----------------------------------------------------------------------------
-- [Step 6] Leads (테스트 리드 — 다양한 status로 RLS 및 마스킹 뷰 검증)
-- ⚠️ 실제 개인정보 사용 금지. test-* 형식 더미 데이터만 허용.
-- -----------------------------------------------------------------------------
INSERT INTO public.leads (
  id, partner_id, customer_name, company_name, email,
  phone, cloud_usage_amount, message, status, created_at
) VALUES
  -- CloudSave (partner-a) 리드
  (
    'eeeeeeee-0000-0000-0000-000000000001',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    '테스트김', '테스트주식회사A', 'tester1@company-a.test',
    '010-0000-0001', '월 500만원 이상', '클라우드 비용 최적화 상담 희망합니다.',
    'new', NOW() - INTERVAL '2 days'
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000002',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    '테스트이', '테스트주식회사B', 'tester2@company-b.test',
    '010-0000-0002', '월 100~500만원', 'AWS와 Azure 동시 사용 중. 통합 관리 필요.',
    'in_progress', NOW() - INTERVAL '5 days'
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000003',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    '테스트박', '테스트스타트업C', 'tester3@startup-c.test',
    NULL, '월 100만원 미만', '스타트업 특가 플랜 문의드립니다.',
    'contacted', NOW() - INTERVAL '10 days'
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000004',
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    '테스트최', '테스트엔터프라이즈D', 'tester4@enterprise-d.test',
    '02-0000-0004', '월 1000만원 이상', '엔터프라이즈 계약 검토 완료.',
    'closed', NOW() - INTERVAL '20 days'
  ),
  -- DataFlow (partner-b) 리드
  (
    'eeeeeeee-0000-0000-0000-000000000005',
    '9309979b-9211-457e-ad01-68e843c7687b',
    '테스트정', '테스트주식회사E', 'tester5@company-e.test',
    '010-0000-0005', '월 500만원 이상', 'DataFlow 도입 관련 문의합니다.',
    'new', NOW() - INTERVAL '1 day'
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000006',
    '9309979b-9211-457e-ad01-68e843c7687b',
    '테스트강', '테스트솔루션F', 'tester6@solution-f.test',
    '010-0000-0006', '월 100~500만원', 'GCP 단독 사용. 비용 모니터링 필요.',
    'in_progress', NOW() - INTERVAL '3 days'
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000007',
    '9309979b-9211-457e-ad01-68e843c7687b',
    '테스트조', '테스트벤처G', 'tester7@venture-g.test',
    NULL, '월 100만원 미만', NULL,
    'new', NOW() - INTERVAL '6 hours'
  )
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- [Step 7] Partner Sections (섹션 노출 제어 및 순서 — WL-40)
-- is_visible=false: 숨김 (Fallback 시나리오 검증용)
-- display_order: 렌더링 순서
-- -----------------------------------------------------------------------------
INSERT INTO public.partner_sections (partner_id, section_type, is_visible, display_order) VALUES
  -- Partner A (CloudSave) — 전 섹션 활성화
  ('b03e99fd-9cec-4ab3-a2c5-3462562f84f2', 'pain_points',        true,  1),
  ('b03e99fd-9cec-4ab3-a2c5-3462562f84f2', 'stats',              true,  2),
  ('b03e99fd-9cec-4ab3-a2c5-3462562f84f2', 'how_it_works',       true,  3),
  ('b03e99fd-9cec-4ab3-a2c5-3462562f84f2', 'finops_automation',  true,  4),
  ('b03e99fd-9cec-4ab3-a2c5-3462562f84f2', 'core_engines',       true,  5),
  ('b03e99fd-9cec-4ab3-a2c5-3462562f84f2', 'role_based_value',   true,  6),
  ('b03e99fd-9cec-4ab3-a2c5-3462562f84f2', 'faq',                true,  7),
  ('b03e99fd-9cec-4ab3-a2c5-3462562f84f2', 'final_cta',          true,  8),
  -- Partner B (DataFlow) — 일부 OFF (Fallback 시나리오 검증용)
  ('9309979b-9211-457e-ad01-68e843c7687b', 'pain_points',        true,  1),
  ('9309979b-9211-457e-ad01-68e843c7687b', 'stats',              false, 2),  -- OFF: contents 미등록
  ('9309979b-9211-457e-ad01-68e843c7687b', 'how_it_works',       false, 3),  -- OFF: contents 미등록
  ('9309979b-9211-457e-ad01-68e843c7687b', 'finops_automation',  true,  4),
  ('9309979b-9211-457e-ad01-68e843c7687b', 'core_engines',       true,  5),
  ('9309979b-9211-457e-ad01-68e843c7687b', 'role_based_value',   true,  6),
  ('9309979b-9211-457e-ad01-68e843c7687b', 'faq',                false, 7),  -- OFF: contents 미등록
  ('9309979b-9211-457e-ad01-68e843c7687b', 'final_cta',          true,  8),
  -- Partner C (GreenSave) — 전 섹션 활성화 (Green 테마 검증용)
  ('c3000000-0000-4000-8000-000000000002', 'pain_points',        true,  1),
  ('c3000000-0000-4000-8000-000000000002', 'stats',              true,  2),
  ('c3000000-0000-4000-8000-000000000002', 'how_it_works',       true,  3),
  ('c3000000-0000-4000-8000-000000000002', 'finops_automation',  true,  4),
  ('c3000000-0000-4000-8000-000000000002', 'core_engines',       true,  5),
  ('c3000000-0000-4000-8000-000000000002', 'role_based_value',   true,  6),
  ('c3000000-0000-4000-8000-000000000002', 'faq',                true,  7),
  ('c3000000-0000-4000-8000-000000000002', 'final_cta',          true,  8),
  -- Partner D (OrangeCloud) — 전 섹션 활성화 (Orange 테마 검증용)
  ('d4000000-0000-4000-8000-000000000002', 'pain_points',        true,  1),
  ('d4000000-0000-4000-8000-000000000002', 'stats',              true,  2),
  ('d4000000-0000-4000-8000-000000000002', 'how_it_works',       true,  3),
  ('d4000000-0000-4000-8000-000000000002', 'finops_automation',  true,  4),
  ('d4000000-0000-4000-8000-000000000002', 'core_engines',       true,  5),
  ('d4000000-0000-4000-8000-000000000002', 'role_based_value',   true,  6),
  ('d4000000-0000-4000-8000-000000000002', 'faq',                true,  7),
  ('d4000000-0000-4000-8000-000000000002', 'final_cta',          true,  8)
ON CONFLICT (partner_id, section_type) DO UPDATE SET
  is_visible    = EXCLUDED.is_visible,
  display_order = EXCLUDED.display_order,
  updated_at    = NOW();
