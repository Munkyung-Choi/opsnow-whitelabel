-- ================================================================
-- WL-103: partner-a 전용 컨텐츠 시딩 SQL (contents 테이블)
-- 대상 섹션: stats, how_it_works
-- 실행 주체: Supabase SQL Editor (문경 님 직접 실행)
-- 작성일: 2026-04-16
--
-- ⚠️  contents.body 는 TEXT 컬럼입니다.
--      배열 JSON을 문자열로 삽입합니다 (::jsonb 캐스트 금지).
--
-- ⚠️  실행 전 파트너 확인:
--      SELECT id, subdomain FROM partners WHERE subdomain = 'partner-a';
--      결과가 0행이면 파트너 데이터 먼저 시딩 필요.
--
-- 롤백:
--      DELETE FROM contents
--      WHERE partner_id = (SELECT id FROM partners WHERE subdomain = 'partner-a')
--        AND section_type IN ('stats', 'how_it_works');
-- ================================================================

-- ── 1. stats ─────────────────────────────────────────────────────────────────
-- parsers.ts parseStats() 인터페이스: { value, label, unit?, detail? }[]

INSERT INTO contents (partner_id, section_type, body, is_published, updated_at)
SELECT
  p.id,
  'stats',
  '[
    {
      "value": "30%",
      "unit": "평균",
      "label": "월 클라우드 비용 절감",
      "detail": "고객사 전체 평균 기준 (최대 47% 달성)"
    },
    {
      "value": "5분",
      "unit": "이내",
      "label": "초기 설정 완료",
      "detail": "API 키 입력만으로 즉시 연동 시작"
    },
    {
      "value": "99.9%",
      "unit": "SLA",
      "label": "서비스 가용성 보장",
      "detail": "엔터프라이즈급 인프라 운영"
    }
  ]',
  true,
  now()
FROM partners p
WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type)
  DO UPDATE SET body = EXCLUDED.body, updated_at = now();

-- ── 2. how_it_works ───────────────────────────────────────────────────────────
-- parsers.ts parseSteps() 인터페이스: { step, title, subtitle?, description, details?, iconName? }[]

INSERT INTO contents (partner_id, section_type, body, is_published, updated_at)
SELECT
  p.id,
  'how_it_works',
  '[
    {
      "step": 1,
      "title": "Connect",
      "subtitle": "클라우드 계정 연결",
      "description": "AWS, Azure, GCP의 읽기 전용 API 권한만으로 5분 이내에 연동을 완료합니다. 에이전트 설치나 코드 변경은 전혀 필요 없습니다.",
      "details": [
        "읽기 전용 IAM 역할 사용",
        "SOC2 Type II 인증 완료",
        "VPC 내 데이터 이탈 없음"
      ],
      "iconName": "Link"
    },
    {
      "step": 2,
      "title": "Diagnose",
      "subtitle": "AI 비용 진단",
      "description": "연결 즉시 AI가 전체 리소스를 스캔합니다. 유휴 인스턴스, 과도 프로비저닝, 미사용 스토리지를 자동으로 분류하고 절감 금액을 예측합니다.",
      "details": [
        "100% 자동 리소스 스캔",
        "절감 가능 금액 실시간 산출",
        "우선순위별 권고 목록 생성"
      ],
      "iconName": "ScanSearch"
    },
    {
      "step": 3,
      "title": "Automate",
      "subtitle": "자동 절감 실행",
      "description": "승인된 정책에 따라 자동으로 절감 조치를 실행합니다. 모든 변경 사항은 로그에 기록되며 원클릭 롤백을 지원합니다.",
      "details": [
        "정책 기반 자동 실행",
        "전체 변경 이력 감사 로그",
        "슬랙·이메일 실시간 알림"
      ],
      "iconName": "Zap"
    }
  ]',
  true,
  now()
FROM partners p
WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type)
  DO UPDATE SET body = EXCLUDED.body, updated_at = now();

-- ── 검증 쿼리 ─────────────────────────────────────────────────────────────────
-- 실행 후 아래 SELECT로 삽입 결과 확인:
--
-- SELECT section_type, left(body::text, 80) AS body_preview, updated_at
-- FROM contents
-- WHERE partner_id = (SELECT id FROM partners WHERE subdomain = 'partner-a')
--   AND section_type IN ('stats', 'how_it_works')
-- ORDER BY section_type;
