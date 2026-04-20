-- ================================================================
-- WL-103: partner-a stats + how_it_works i18n 재시딩
-- 기존 Korean 단일 문자열 → {"ko":…, "en":…, "ja":…, "zh":…} 형식으로 교체
-- 실행 주체: Supabase SQL Editor (문경 님 직접 실행)
-- 작성일: 2026-04-16
--
-- ⚠️  ON CONFLICT DO UPDATE — 멱등성 보장. 중복 실행 안전.
--
-- 검증:
--   SELECT section_type, left(body, 120), updated_at
--   FROM contents
--   WHERE partner_id = (SELECT id FROM partners WHERE subdomain = 'partner-a')
--     AND section_type IN ('stats', 'how_it_works')
--   ORDER BY section_type;
-- ================================================================

-- ── 1. stats (i18n) ────────────────────────────────────────────────────────────
INSERT INTO contents (partner_id, section_type, body, is_published, updated_at)
SELECT
  p.id,
  'stats',
  '[
    {
      "value": "30%",
      "unit":   {"ko": "평균",    "en": "avg",  "ja": "平均",  "zh": "平均"},
      "label":  {"ko": "월 클라우드 비용 절감",    "en": "Monthly Cloud Cost Reduction",    "ja": "月次クラウドコスト削減",    "zh": "每月云成本节省"},
      "detail": {"ko": "고객사 전체 평균 기준 (최대 47% 달성)", "en": "Based on all customer averages (up to 47% achieved)", "ja": "全顧客の平均ベース（最大47%達成）", "zh": "基于所有客户平均（最高实现47%）"}
    },
    {
      "value": "5",
      "unit":   {"ko": "분 이내",  "en": "min",  "ja": "分以内", "zh": "分钟内"},
      "label":  {"ko": "초기 설정 완료",            "en": "Initial Setup Complete",           "ja": "初期設定完了",              "zh": "初始设置完成"},
      "detail": {"ko": "API 키 입력만으로 즉시 연동 시작",    "en": "Start instantly with just your API key", "ja": "APIキーを入力するだけで即時連携開始", "zh": "只需API密钥即可立即连接"}
    },
    {
      "value": "99.9%",
      "unit":   {"ko": "SLA",     "en": "SLA",  "ja": "SLA",   "zh": "SLA"},
      "label":  {"ko": "서비스 가용성 보장",          "en": "Service Availability Guarantee",   "ja": "サービス可用性保証",        "zh": "服务可用性保障"},
      "detail": {"ko": "엔터프라이즈급 인프라 운영",         "en": "Enterprise-grade infrastructure operations", "ja": "エンタープライズグレードのインフラ運営", "zh": "企业级基础设施运营"}
    }
  ]',
  true,
  now()
FROM partners p
WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type)
  DO UPDATE SET body = EXCLUDED.body, updated_at = now();

-- ── 2. how_it_works (i18n) ──────────────────────────────────────────────────────
INSERT INTO contents (partner_id, section_type, body, is_published, updated_at)
SELECT
  p.id,
  'how_it_works',
  '[
    {
      "step": 1,
      "title": "Connect",
      "subtitle":    {"ko": "클라우드 계정 연결",   "en": "Cloud Account Connection",  "ja": "クラウドアカウント接続",  "zh": "云账户连接"},
      "description": {"ko": "AWS, Azure, GCP의 읽기 전용 API 권한만으로 5분 이내에 연동을 완료합니다. 에이전트 설치나 코드 변경은 전혀 필요 없습니다.", "en": "Complete integration in under 5 minutes using read-only API access for AWS, Azure, and GCP. No agent installation or code changes required.", "ja": "AWS、Azure、GCPの読み取り専用API権限のみで5分以内に連携を完了します。エージェントのインストールやコード変更は不要です。", "zh": "仅需AWS、Azure、GCP的只读API权限，5分钟内完成集成。无需安装Agent或修改代码。"},
      "details": [
        {"ko": "읽기 전용 IAM 역할 사용",   "en": "Read-only IAM role",          "ja": "読み取り専用IAMロール使用",  "zh": "使用只读IAM角色"},
        {"ko": "SOC2 Type II 인증 완료",    "en": "SOC2 Type II certified",      "ja": "SOC2 Type II認証済み",      "zh": "SOC2 Type II认证"},
        {"ko": "VPC 내 데이터 이탈 없음",    "en": "No data egress outside VPC",  "ja": "VPC外へのデータ流出なし",    "zh": "VPC内无数据外泄"}
      ],
      "iconName": "Link"
    },
    {
      "step": 2,
      "title": "Diagnose",
      "subtitle":    {"ko": "AI 비용 진단",           "en": "AI Cost Diagnosis",         "ja": "AIコスト診断",            "zh": "AI成本诊断"},
      "description": {"ko": "연결 즉시 AI가 전체 리소스를 스캔합니다. 유휴 인스턴스, 과도 프로비저닝, 미사용 스토리지를 자동으로 분류하고 절감 금액을 예측합니다.", "en": "AI immediately scans all resources upon connection. Idle instances, over-provisioned resources, and unused storage are automatically categorized with predicted savings.", "ja": "接続後すぐにAIが全リソースをスキャン。アイドルインスタンス、過剰プロビジョニング、未使用ストレージを自動分類し節約金額を予測します。", "zh": "连接后AI立即扫描所有资源，自动分类闲置实例、过度配置和未使用存储，并预测可节省金额。"},
      "details": [
        {"ko": "100% 자동 리소스 스캔",            "en": "100% automated resource scan",       "ja": "100%自動リソーススキャン",        "zh": "100%自动化资源扫描"},
        {"ko": "절감 가능 금액 실시간 산출",          "en": "Real-time savings calculation",      "ja": "節約可能金額のリアルタイム算出",    "zh": "实时计算可节省金额"},
        {"ko": "우선순위별 권고 목록 생성",           "en": "Priority-ranked recommendation list","ja": "優先順位付き推奨リスト生成",        "zh": "按优先级生成建议列表"}
      ],
      "iconName": "ScanSearch"
    },
    {
      "step": 3,
      "title": "Automate",
      "subtitle":    {"ko": "자동 절감 실행",          "en": "Automated Savings Execution","ja": "自動節約実行",             "zh": "自动节省执行"},
      "description": {"ko": "승인된 정책에 따라 자동으로 절감 조치를 실행합니다. 모든 변경 사항은 로그에 기록되며 원클릭 롤백을 지원합니다.", "en": "Automatically execute savings actions based on approved policies. All changes are logged with one-click rollback support.", "ja": "承認されたポリシーに基づいて自動的に節約措置を実行。すべての変更はログに記録され、ワンクリックでロールバックできます。", "zh": "根据批准的策略自动执行节省措施。所有变更均有日志记录，支持一键回滚。"},
      "details": [
        {"ko": "정책 기반 자동 실행",      "en": "Policy-based automated execution", "ja": "ポリシーベースの自動実行",       "zh": "基于策略的自动执行"},
        {"ko": "전체 변경 이력 감사 로그",  "en": "Full change audit log",           "ja": "全変更履歴の監査ログ",           "zh": "完整变更审计日志"},
        {"ko": "슬랙·이메일 실시간 알림",  "en": "Slack & email real-time alerts",  "ja": "SlackとメールのリアルタイムAlert","zh": "Slack和邮件实时通知"}
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
