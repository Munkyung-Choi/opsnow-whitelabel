-- =============================================================================
-- marketing-seed.sql — 마케팅 사이트 UI 로컬 테스트용 샘플 데이터
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 대상: WL-40 개발 검증 (Partner A: 신뢰형 / Partner B: 혁신형)
-- =============================================================================
-- ⚠️  멱등성 보장: ON CONFLICT DO UPDATE 사용 — 중복 실행 안전
-- =============================================================================


-- -----------------------------------------------------------------------------
-- [1] partners — 테마 색상 및 브랜딩 업데이트
-- -----------------------------------------------------------------------------

-- Partner A: ACME Cloud (신뢰형 — Deep Blue)
UPDATE public.partners SET
  business_name   = 'ACME Cloud',
  primary_color   = '#1E40AF',
  secondary_color = '#EFF6FF',
  logo_url        = NULL,          -- 텍스트 Fallback → business_name 표시
  favicon_url     = NULL,
  notification_emails = '["contact@acmecloud.kr"]'
WHERE id = 'b03e99fd-9cec-4ab3-a2c5-3462562f84f2';

-- Partner B: NovaTech Solutions (혁신형 — Bright Orange)
UPDATE public.partners SET
  business_name   = 'NovaTech Solutions',
  primary_color   = '#EA580C',
  secondary_color = '#FFF7ED',
  logo_url        = 'https://placehold.co/160x44/EA580C/FFFFFF?text=NovaTech',
  favicon_url     = 'https://placehold.co/32x32/EA580C/FFFFFF?text=N',
  notification_emails = '["hello@novatech.io"]'
WHERE id = '9309979b-9211-457e-ad01-68e843c7687b';


-- -----------------------------------------------------------------------------
-- [2] contents — 파트너별 섹션 콘텐츠
--     UNIQUE (partner_id, section_type) → ON CONFLICT DO UPDATE
-- -----------------------------------------------------------------------------

INSERT INTO public.contents
  (partner_id, section_type, title, subtitle, body, cta_text, contact_info, is_published)
VALUES

  -- ── Partner A: ACME Cloud ─────────────────────────────────────────────────

  -- Hero
  (
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'hero',
    '안정적인 클라우드 관리의 시작',
    '15년 인프라 노하우와 OpsNow AI가 만나 만들어낸 가장 신뢰할 수 있는 클라우드 비용 최적화 솔루션입니다.',
    NULL,
    '지금 무료 진단 받기',
    '{}',
    true
  ),

  -- About (Partner Specialization)
  (
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'about',
    'ACME Cloud가 특별한 이유',
    '우리는 단순한 클라우드 리셀러가 아닙니다',
    '국내 금융·공공·제조 분야 300개 이상의 기업 고객에게 검증된 클라우드 보안 관제 및 비용 절감 서비스를 제공합니다. 24/7 전담 엔지니어가 귀사의 클라우드 환경을 실시간으로 모니터링합니다.',
    NULL,
    '{}',
    true
  ),

  -- Footer
  (
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'footer',
    NULL,
    NULL,
    NULL,
    NULL,
    '{"email": "contact@acmecloud.kr", "phone": "02-1234-5678", "address": "서울시 강남구 테헤란로 123, ACME빌딩 8층"}',
    true
  ),

  -- Terms
  (
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'terms',
    'ACME Cloud 이용약관',
    NULL,
    '제1조 (목적)\n본 약관은 ACME Cloud(이하 "회사")가 제공하는 클라우드 관리 서비스(이하 "서비스")의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.\n\n제2조 (정의)\n"서비스"란 회사가 제공하는 OpsNow 기반 클라우드 비용 최적화 및 관제 서비스를 의미합니다.\n\n제3조 (약관의 효력 및 변경)\n본 약관은 서비스 화면에 게시하거나 기타 방법으로 고객에게 공지함으로써 효력이 발생합니다.',
    NULL,
    '{}',
    true
  ),

  -- Privacy
  (
    'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
    'privacy',
    'ACME Cloud 개인정보 처리방침',
    NULL,
    '제1조 (개인정보의 처리 목적)\nACME Cloud는 다음의 목적을 위하여 개인정보를 처리합니다.\n① 서비스 제공 및 계약 이행\n② 고객 상담 및 불만 처리\n③ 마케팅 및 광고 활용 (별도 동의 시)\n\n제2조 (개인정보의 처리 및 보유기간)\n회사는 법령에 따른 개인정보 보유·이용기간 또는 정보 주체로부터 개인정보를 수집 시 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.\n\n제3조 (개인정보 보호책임자)\n이름: 홍길동 / 이메일: privacy@acmecloud.kr / 전화: 02-1234-5678',
    NULL,
    '{}',
    true
  ),

  -- ── Partner B: NovaTech Solutions ─────────────────────────────────────────

  -- Hero
  (
    '9309979b-9211-457e-ad01-68e843c7687b',
    'hero',
    '가장 빠르게 가속하는 클라우드 혁신',
    '속도가 경쟁력입니다. NovaTech의 AI 자동화 엔진으로 클라우드 비용을 즉시 줄이고, 서비스 속도는 극한까지 높이세요.',
    NULL,
    '지금 바로 시작하기',
    '{}',
    true
  ),

  -- About
  (
    '9309979b-9211-457e-ad01-68e843c7687b',
    'about',
    'NovaTech가 다른 이유',
    '혁신은 슬로건이 아니라 기술입니다',
    'AI 기반 자동 스케일링과 비용 예측 알고리즘으로 스타트업부터 엔터프라이즈까지 평균 34%의 클라우드 비용을 절감해 드립니다. 설치 후 7일 이내에 효과를 체감하지 못하면 전액 환불을 보장합니다.',
    NULL,
    '{}',
    true
  ),

  -- Footer
  (
    '9309979b-9211-457e-ad01-68e843c7687b',
    'footer',
    NULL,
    NULL,
    NULL,
    NULL,
    '{"email": "hello@novatech.io", "phone": "070-9876-5432", "address": "서울시 성동구 왕십리로 50, NovaTech 스페이스 3층"}',
    true
  ),

  -- Terms
  (
    '9309979b-9211-457e-ad01-68e843c7687b',
    'terms',
    'NovaTech Solutions 이용약관',
    NULL,
    '제1조 (목적)\n본 약관은 NovaTech Solutions(이하 "회사")가 제공하는 AI 클라우드 자동화 서비스의 이용 조건을 규정합니다.\n\n제2조 (정의)\n"서비스"란 회사가 OpsNow 플랫폼 기반으로 제공하는 클라우드 속도 최적화 및 AI 자동화 관리 서비스를 의미합니다.\n\n제3조 (약관의 효력 및 변경)\n본 약관은 서비스 화면 게시 또는 이메일 공지로 효력이 발생하며, 변경 시 7일 전 사전 공지합니다.',
    NULL,
    '{}',
    true
  ),

  -- Privacy
  (
    '9309979b-9211-457e-ad01-68e843c7687b',
    'privacy',
    'NovaTech Solutions 개인정보 처리방침',
    NULL,
    '제1조 (개인정보의 처리 목적)\nNovaTech Solutions는 다음 목적으로 개인정보를 처리합니다.\n① 서비스 신청 및 계약 이행\n② 기술 지원 및 고객 상담\n③ 서비스 개선을 위한 통계 분석\n\n제2조 (수집하는 개인정보 항목)\n필수: 이름, 이메일, 회사명\n선택: 전화번호, 클라우드 월 사용량\n\n제3조 (개인정보 보호책임자)\n이름: 김혁신 / 이메일: privacy@novatech.io / 전화: 070-9876-5432',
    NULL,
    '{}',
    true
  )

ON CONFLICT (partner_id, section_type) DO UPDATE SET
  title        = EXCLUDED.title,
  subtitle     = EXCLUDED.subtitle,
  body         = EXCLUDED.body,
  cta_text     = EXCLUDED.cta_text,
  contact_info = EXCLUDED.contact_info,
  is_published = EXCLUDED.is_published,
  updated_at   = now();


-- -----------------------------------------------------------------------------
-- [3] global_contents — OpsNow 공통 Features 섹션 (Master Admin 전용)
--     모든 파트너 마케팅 사이트에 동일하게 노출
-- -----------------------------------------------------------------------------

INSERT INTO public.global_contents
  (section_type, title, subtitle, body, meta)
VALUES (
  'features',
  'OpsNow가 제공하는 글로벌 수준의 클라우드 관리',
  '전 세계 600개 이상의 기업이 신뢰하는 클라우드 비용 최적화 플랫폼',
  NULL,
  '{
    "cards": [
      {
        "icon": "cloud",
        "title": "Multi-cloud 통합 관리",
        "description": "AWS, Azure, GCP를 단 하나의 대시보드에서 통합 관리합니다. 벤더 종속 없이 자유롭게 멀티클라우드를 운영하세요."
      },
      {
        "icon": "brain",
        "title": "AI 기반 비용 예측",
        "description": "머신러닝 모델이 다음 달 클라우드 지출을 95% 정확도로 예측합니다. 예산 초과를 미리 방지하세요."
      },
      {
        "icon": "trending-down",
        "title": "자동 절감 권고",
        "description": "낭비 중인 리소스를 실시간으로 감지하고 즉시 실행 가능한 절감 액션을 자동으로 제안합니다."
      },
      {
        "icon": "shield",
        "title": "보안 컴플라이언스",
        "description": "ISO 27001, SOC 2 기준에 맞춘 보안 정책을 자동으로 적용하고 컴플라이언스 리포트를 생성합니다."
      }
    ]
  }'
)
ON CONFLICT (section_type) DO UPDATE SET
  title      = EXCLUDED.title,
  subtitle   = EXCLUDED.subtitle,
  body       = EXCLUDED.body,
  meta       = EXCLUDED.meta,
  updated_at = now();


-- -----------------------------------------------------------------------------
-- [검증] 삽입 결과 확인 쿼리 — 실행 후 아래로 결과 확인
-- -----------------------------------------------------------------------------
SELECT
  p.business_name,
  p.primary_color,
  p.secondary_color,
  p.logo_url IS NOT NULL AS has_logo,
  COUNT(c.id) AS content_count
FROM public.partners p
LEFT JOIN public.contents c ON c.partner_id = p.id AND c.is_published = true
WHERE p.id IN (
  'b03e99fd-9cec-4ab3-a2c5-3462562f84f2',
  '9309979b-9211-457e-ad01-68e843c7687b'
)
GROUP BY p.id, p.business_name, p.primary_color, p.secondary_color, p.logo_url
ORDER BY p.business_name;

SELECT section_type, title FROM public.global_contents WHERE section_type = 'features';
