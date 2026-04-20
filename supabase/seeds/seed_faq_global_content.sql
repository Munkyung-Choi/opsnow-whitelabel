-- ================================================================
-- WL-97: global_contents FAQ 시딩 SQL
-- 실행 주체: Supabase SQL Editor (문경 님 직접 실행)
-- 작성일: 2026-04-16
-- ================================================================
--
-- ⚠️  실행 전 주의사항:
--   이 SQL은 section_type = 'faq' 인 기존 row의 meta를 덮어씁니다.
--   아래 롤백 쿼리로 현재 데이터를 먼저 확인 및 기록하세요.
--
-- ── 롤백 / 현재 데이터 확인 ─────────────────────────────────────
-- SELECT section_type, meta, updated_at
-- FROM global_contents
-- WHERE section_type = 'faq';
--
-- 복구 방법: 위 SELECT 결과의 meta JSON을 복사하여
--   ON CONFLICT DO UPDATE SET meta = '<복사한_JSON>'::jsonb
-- 형태로 아래 UPSERT를 재실행하면 원복됩니다.
-- ────────────────────────────────────────────────────────────────
--
-- ⚠️  slug 고유성 주의:
--   slug는 DB 레벨 제약이 없으므로 운영자가 고유값을 직접 보장해야 합니다.
--   새 항목 추가 시 기존 slug와 절대 중복하지 마세요.
--   권장 포맷: kebab-case 평문 슬러그 (예: how-billing-works)
--   WL-97 스펙 기준: flat slug (카테고리 prefix 없음)
-- ================================================================

INSERT INTO global_contents (section_type, meta, updated_at)
VALUES (
  'faq',
  $faq_meta${
    "categories": [
      { "id": "billing",     "label": {"ko": "결제/요금",    "en": "Billing"},      "order": 1 },
      { "id": "resources",   "label": {"ko": "리소스 최적화", "en": "Resources"},    "order": 2 },
      { "id": "governance",  "label": {"ko": "거버넌스",     "en": "Governance"},   "order": 3 },
      { "id": "autosavings", "label": {"ko": "AutoSavings",  "en": "AutoSavings"},  "order": 4 },
      { "id": "setup",       "label": {"ko": "초기 세팅",    "en": "Setup"},        "order": 5 }
    ],
    "items": [
      {
        "id": "pricing-model",
        "slug": "how-billing-works",
        "categoryId": "billing",
        "question": {
          "ko": "요금 구조는 어떻게 되나요?",
          "en": "How does the billing model work?"
        },
        "answer": {
          "ko": "성과 기반 요금제를 채택합니다.\n\n초기 세팅 비용은 없으며, **실제 절감된 비용의 일정 비율**만 청구합니다. 절감이 없으면 비용도 없습니다.",
          "en": "We use a performance-based billing model.\n\nThere are no setup fees. We only charge **a percentage of actual savings achieved**. No savings, no charge."
        },
        "isFeatured": true,
        "tags": ["pricing", "billing"],
        "updatedAt": "2026-04-16T00:00:00Z"
      },
      {
        "id": "multi-cloud-support",
        "slug": "multi-cloud-support",
        "categoryId": "billing",
        "question": {
          "ko": "AWS 외에 Azure, GCP도 동시에 지원하나요?",
          "en": "Do you support Azure and GCP in addition to AWS?"
        },
        "answer": {
          "ko": "AWS·Azure·GCP 세 플랫폼을 **단일 대시보드**에서 통합 관리합니다.\n\n벤더별 비용 비교와 워크로드 재배치 시뮬레이션도 지원합니다.",
          "en": "We support all three major cloud platforms — AWS, Azure, and GCP — in a **single unified dashboard**.\n\nVendor cost comparison and workload migration simulation are also available."
        },
        "isFeatured": true,
        "tags": ["multicloud", "aws", "azure", "gcp"],
        "updatedAt": "2026-04-16T00:00:00Z"
      },
      {
        "id": "cost-report",
        "slug": "cost-report-format",
        "categoryId": "billing",
        "question": {
          "ko": "비용 분석 리포트는 어떤 형태로 제공되나요?",
          "en": "What format are cost analysis reports provided in?"
        },
        "answer": {
          "ko": "역할별(CTO·CFO·DevOps) 맞춤 대시보드와 **월간 PDF 리포트**를 자동 생성합니다.\n\n이사회 보고용 KPI 요약본도 지원합니다.",
          "en": "Role-specific dashboards (CTO, CFO, DevOps) and **monthly PDF reports** are auto-generated.\n\nBoard-level KPI summaries are also available."
        },
        "isFeatured": true,
        "tags": ["reports", "dashboard"],
        "updatedAt": "2026-04-16T00:00:00Z"
      },
      {
        "id": "ec2-optimization",
        "slug": "ec2-instance-optimization",
        "categoryId": "resources",
        "question": {
          "ko": "EC2 인스턴스 최적화는 어떻게 진행되나요?",
          "en": "How does EC2 instance optimization work?"
        },
        "answer": {
          "ko": "AI가 사용 패턴을 분석해 **유휴 인스턴스·과도 프로비저닝 리소스**를 자동 탐지합니다.\n\n원클릭 최적화 실행 및 1분 이내 롤백을 지원합니다.",
          "en": "AI analyzes usage patterns to automatically detect **idle instances and over-provisioned resources**.\n\nOne-click optimization and rollback within 1 minute are supported."
        },
        "isFeatured": false,
        "tags": ["ec2", "optimization"],
        "updatedAt": "2026-04-16T00:00:00Z"
      },
      {
        "id": "unused-resources",
        "slug": "finding-unused-resources",
        "categoryId": "resources",
        "question": {
          "ko": "사용하지 않는 리소스는 어떻게 찾아내나요?",
          "en": "How do you identify unused cloud resources?"
        },
        "answer": {
          "ko": "실시간 스캔으로 **유휴 EC2·미사용 EBS 스냅샷·불필요한 EIP**를 자동 분류합니다.\n\n비용 영향도 순으로 우선순위를 정렬해 제공합니다.",
          "en": "Real-time scanning automatically classifies **idle EC2s, unused EBS snapshots, and unnecessary EIPs**.\n\nResults are ranked by cost impact."
        },
        "isFeatured": false,
        "tags": ["unused", "ebs", "eip", "ec2"],
        "updatedAt": "2026-04-16T00:00:00Z"
      },
      {
        "id": "tag-governance",
        "slug": "tag-policy-automation",
        "categoryId": "governance",
        "question": {
          "ko": "태그 정책을 자동화할 수 있나요?",
          "en": "Can I automate tag policies?"
        },
        "answer": {
          "ko": "통합 태그 정책으로 **팀/프로젝트/환경별 비용 배분**을 자동화합니다.\n\n태그 누락 리소스 알림과 강제 적용 정책도 설정할 수 있습니다.",
          "en": "A unified tag policy automates **cost allocation by team, project, and environment**.\n\nAlerts for untagged resources and enforcement policies are also configurable."
        },
        "isFeatured": false,
        "tags": ["governance", "tagging"],
        "updatedAt": "2026-04-16T00:00:00Z"
      },
      {
        "id": "auto-savings",
        "slug": "ri-savings-plan-automation",
        "categoryId": "autosavings",
        "question": {
          "ko": "RI/Savings Plan 자동 매매는 어떻게 작동하나요?",
          "en": "How does automated RI/Savings Plan management work?"
        },
        "answer": {
          "ko": "실시간 사용량 분석으로 **RI/SP 구매·판매 타이밍**을 자동 결정합니다.\n\n24시간 모니터링으로 100% 약정 커버리지를 유지합니다.",
          "en": "Real-time usage analysis automatically determines the optimal **RI/SP purchase and sale timing**.\n\n24/7 monitoring maintains 100% commitment coverage."
        },
        "isFeatured": false,
        "tags": ["ri", "savings-plan", "autosavings"],
        "updatedAt": "2026-04-16T00:00:00Z"
      },
      {
        "id": "initial-setup",
        "slug": "initial-setup-time",
        "categoryId": "setup",
        "question": {
          "ko": "처음 연동하는 데 얼마나 걸리나요?",
          "en": "How long does the initial setup take?"
        },
        "answer": {
          "ko": "**읽기 전용 IAM 권한 설정**만으로 5분 이내 연동이 완료됩니다.\n\n에이전트 설치나 코드 변경은 필요하지 않습니다.",
          "en": "Setup is complete in under 5 minutes with just **read-only IAM permission configuration**.\n\nNo agent installation or code changes are required."
        },
        "isFeatured": false,
        "tags": ["setup", "iam", "onboarding"],
        "updatedAt": "2026-04-16T00:00:00Z"
      }
    ]
  }$faq_meta$::jsonb,
  now()
)
ON CONFLICT (section_type) DO UPDATE
  SET meta = EXCLUDED.meta, updated_at = now();
