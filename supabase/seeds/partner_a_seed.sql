-- ================================================================
-- supabase/seeds/partner_a_seed.sql
-- Partner-A (CloudSave) 전체 상태 동기화
--
-- ⚠️  임시 조치 안내 (2026-04-16)
-- 이 파일은 Admin UI 파트너 온보딩 기능 완성 전까지만 사용하는 임시 수단입니다.
-- Admin UI 완성 후에는 파트너 생성 → 트리거 자동 초기화 → Admin에서 콘텐츠 편집
-- 으로 대체됩니다. 관련 티켓: WL-106
--
-- 목적: 로컬 ↔ 클라우드 데이터 미러링.
--       이 파일 하나를 SQL Editor에서 실행하면 partner-a가 완전한 상태가 됨.
--
-- 멱등성: ON CONFLICT DO UPDATE — 몇 번 실행해도 안전.
-- 전제: partners 테이블에 subdomain='partner-a' 행이 이미 존재할 것.
--       (최초 생성은 Supabase Dashboard → Authentication → Users 에서 owner 계정 생성 후 INSERT)
--
-- 실행 순서: 1 → 2 → 3 (각 블록을 순서대로 실행하거나 전체를 한 번에 실행)
-- ================================================================


-- ================================================================
-- 1. partners — 파트너 기본 설정
-- ================================================================

UPDATE public.partners
SET
  business_name     = 'CloudSave',
  theme_key         = 'gray',
  default_locale    = 'ko',
  published_locales = ARRAY['ko', 'en', 'ja', 'zh']::TEXT[],
  is_active         = true
WHERE subdomain = 'partner-a';

-- 확인
SELECT subdomain, business_name, theme_key, default_locale, published_locales
FROM public.partners
WHERE subdomain = 'partner-a';


-- ================================================================
-- 2. partner_sections — 섹션 노출 설정
--    is_visible: 어드민이 개별 변경 가능 (ON CONFLICT DO UPDATE로 재동기화)
-- ================================================================

INSERT INTO public.partner_sections (partner_id, section_type, is_visible, display_order)
SELECT
  p.id,
  s.section_type,
  s.is_visible,
  s.display_order
FROM public.partners p
CROSS JOIN (VALUES
  ('pain_points'::text,     true::boolean, 1::int),
  ('stats',                 true,          2),
  ('how_it_works',          true,          3),
  ('finops_automation',     true,          4),
  ('core_engines',          true,          5),
  ('role_based_value',      true,          6),
  ('faq',                   true,          7),
  ('final_cta',             true,          8)
) AS s(section_type, is_visible, display_order)
WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET is_visible    = EXCLUDED.is_visible,
      display_order = EXCLUDED.display_order;


-- ================================================================
-- 3. contents — 섹션별 콘텐츠
--    title/subtitle: {"ko": "...", "en": "...", "ja": "...", "zh": "..."} i18n JSON
--    body: 배열 JSON (stats, how_it_works)
--    {PartnerName}: 앱 레이어(interpolateString)에서 business_name으로 치환됨
-- ================================================================

-- ── 3-1. hero ──────────────────────────────────────────────────────────────────
INSERT INTO public.contents (partner_id, section_type, title, subtitle, is_published)
SELECT
  p.id,
  'hero',
  '{"ko": "클라우드 비용, {PartnerName}으로 절감하세요", "en": "Reduce Cloud Costs with {PartnerName}", "ja": "クラウドコストを{PartnerName}で削減", "zh": "用{PartnerName}降低云成本"}'::jsonb,
  '{"ko": "{PartnerName}가 숨겨진 낭비를 찾아내 매월 청구서를 최대 40%까지 자동 삭감해드립니다", "en": "{PartnerName} finds hidden waste and automatically cuts your monthly bill by up to 40%", "ja": "{PartnerName}が隠れた無駄を発見し、毎月の請求を最大40%自動削減します", "zh": "{PartnerName}找出隐藏的浪费，每月自动削减最多40%的账单"}'::jsonb,
  true
FROM public.partners p
WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET title      = EXCLUDED.title,
      subtitle   = EXCLUDED.subtitle,
      is_published = true,
      updated_at = now();

-- ── 3-2. stats ─────────────────────────────────────────────────────────────────
INSERT INTO public.contents (partner_id, section_type, title, body, is_published)
SELECT
  p.id,
  'stats',
  '{"ko": "데이터가 증명하는 {PartnerName}의 실제 성과", "en": "{PartnerName} Results by Numbers", "ja": "{PartnerName}の実績をデータで証明", "zh": "数据证明的{PartnerName}实际成果"}'::jsonb,
  '[
    {
      "value": "30%",
      "unit":   {"ko": "평균",    "en": "avg",   "ja": "平均",  "zh": "平均"},
      "label":  {"ko": "월 클라우드 비용 절감",    "en": "Monthly Cloud Cost Reduction",    "ja": "月次クラウドコスト削減",    "zh": "每月云成本节省"},
      "detail": {"ko": "고객사 전체 평균 기준 (최대 47% 달성)", "en": "Based on all customer averages (up to 47% achieved)", "ja": "全顧客の平均ベース（最大47%達成）", "zh": "基于所有客户平均（最高实现47%）"}
    },
    {
      "value": "5",
      "unit":   {"ko": "분 이내",  "en": "min",   "ja": "分以内", "zh": "分钟内"},
      "label":  {"ko": "초기 설정 완료",            "en": "Initial Setup Complete",           "ja": "初期設定完了",              "zh": "初始设置完成"},
      "detail": {"ko": "API 키 입력만으로 즉시 연동 시작",    "en": "Start instantly with just your API key", "ja": "APIキーを入力するだけで即時連携開始", "zh": "只需API密钥即可立即连接"}
    },
    {
      "value": "99.9%",
      "unit":   {"ko": "SLA",     "en": "SLA",   "ja": "SLA",   "zh": "SLA"},
      "label":  {"ko": "서비스 가용성 보장",          "en": "Service Availability Guarantee",   "ja": "サービス可用性保証",        "zh": "服务可用性保障"},
      "detail": {"ko": "엔터프라이즈급 인프라 운영",   "en": "Enterprise-grade infrastructure operations", "ja": "エンタープライズグレードのインフラ運営", "zh": "企业级基础设施运营"}
    }
  ]'::jsonb,
  true
FROM public.partners p
WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET title      = EXCLUDED.title,
      body       = EXCLUDED.body,
      is_published = true,
      updated_at = now();

-- ── 3-3. how_it_works ──────────────────────────────────────────────────────────
INSERT INTO public.contents (partner_id, section_type, title, subtitle, body, is_published)
SELECT
  p.id,
  'how_it_works',
  '{"ko": "{PartnerName} 시작하기", "en": "How {PartnerName} Works", "ja": "{PartnerName}の始め方", "zh": "{PartnerName}使用方法"}'::jsonb,
  '{"ko": "설치부터 절감까지, 단 하루면 충분합니다. 복잡한 설정 없이 세 단계로 비용 최적화를 시작하세요.", "en": "From setup to savings in just one day. Start cost optimization in three steps — no complex configuration required.", "ja": "セットアップから削減まで、わずか1日で。複雑な設定なしに、3ステップでコスト最適化を始めましょう。", "zh": "从安装到节省，只需一天。无需复杂配置，三步开始成本优化。"}'::jsonb,
  '[
    {
      "step": 1, "title": "Connect",
      "subtitle":    {"ko": "클라우드 계정 연결",   "en": "Cloud Account Connection",   "ja": "クラウドアカウント接続",  "zh": "云账户连接"},
      "description": {"ko": "AWS, Azure, GCP의 읽기 전용 API 권한만으로 5분 이내에 연동을 완료합니다. 에이전트 설치나 코드 변경은 전혀 필요 없습니다.", "en": "Complete integration in under 5 minutes using read-only API access for AWS, Azure, and GCP. No agent installation or code changes required.", "ja": "AWS、Azure、GCPの読み取り専用API権限のみで5分以内に連携を完了します。エージェントのインストールやコード変更は不要です。", "zh": "仅需AWS、Azure、GCP的只读API权限，5分钟内完成集成。无需安装Agent或修改代码。"},
      "details": [
        {"ko": "읽기 전용 IAM 역할 사용",   "en": "Read-only IAM role",         "ja": "読み取り専用IAMロール使用",  "zh": "使用只读IAM角色"},
        {"ko": "SOC2 Type II 인증 완료",    "en": "SOC2 Type II certified",     "ja": "SOC2 Type II認証済み",      "zh": "SOC2 Type II认证"},
        {"ko": "VPC 내 데이터 이탈 없음",    "en": "No data egress outside VPC", "ja": "VPC外へのデータ流出なし",    "zh": "VPC内无数据外泄"}
      ],
      "iconName": "Link"
    },
    {
      "step": 2, "title": "Diagnose",
      "subtitle":    {"ko": "AI 비용 진단",    "en": "AI Cost Diagnosis",          "ja": "AIコスト診断",            "zh": "AI成本诊断"},
      "description": {"ko": "연결 즉시 AI가 전체 리소스를 스캔합니다. 유휴 인스턴스, 과도 프로비저닝, 미사용 스토리지를 자동으로 분류하고 절감 금액을 예측합니다.", "en": "AI immediately scans all resources upon connection. Idle instances, over-provisioned resources, and unused storage are automatically categorized with predicted savings.", "ja": "接続後すぐにAIが全リソースをスキャン。アイドルインスタンス、過剰プロビジョニング、未使用ストレージを自動分類し節約金額を予測します。", "zh": "连接后AI立即扫描所有资源，自动分类闲置实例、过度配置和未使用存储，并预测可节省金额。"},
      "details": [
        {"ko": "100% 자동 리소스 스캔",      "en": "100% automated resource scan",        "ja": "100%自動リソーススキャン",      "zh": "100%自动化资源扫描"},
        {"ko": "절감 가능 금액 실시간 산출",  "en": "Real-time savings calculation",       "ja": "節約可能金額のリアルタイム算出", "zh": "实时计算可节省金额"},
        {"ko": "우선순위별 권고 목록 생성",   "en": "Priority-ranked recommendation list", "ja": "優先順位付き推奨リスト生成",    "zh": "按优先级生成建议列表"}
      ],
      "iconName": "ScanSearch"
    },
    {
      "step": 3, "title": "Automate",
      "subtitle":    {"ko": "자동 절감 실행",   "en": "Automated Savings Execution", "ja": "自動節約実行",             "zh": "自动节省执行"},
      "description": {"ko": "승인된 정책에 따라 자동으로 절감 조치를 실행합니다. 모든 변경 사항은 로그에 기록되며 원클릭 롤백을 지원합니다.", "en": "Automatically execute savings actions based on approved policies. All changes are logged with one-click rollback support.", "ja": "承認されたポリシーに基づいて自動的に節約措置を実行。すべての変更はログに記録され、ワンクリックでロールバックできます。", "zh": "根据批准的策略自动执行节省措施。所有变更均有日志记录，支持一键回滚。"},
      "details": [
        {"ko": "정책 기반 자동 실행",      "en": "Policy-based automated execution", "ja": "ポリシーベースの自動実行",    "zh": "基于策略的自动执行"},
        {"ko": "전체 변경 이력 감사 로그",  "en": "Full change audit log",           "ja": "全変更履歴の監査ログ",        "zh": "完整变更审计日志"},
        {"ko": "슬랙·이메일 실시간 알림",  "en": "Slack & email real-time alerts",  "ja": "SlackとメールのリアルタイムAlert", "zh": "Slack和邮件实时通知"}
      ],
      "iconName": "Zap"
    }
  ]'::jsonb,
  true
FROM public.partners p
WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET title      = EXCLUDED.title,
      subtitle   = EXCLUDED.subtitle,
      body       = EXCLUDED.body,
      is_published = true,
      updated_at = now();

-- ── 3-4. faq ───────────────────────────────────────────────────────────────────
INSERT INTO public.contents (partner_id, section_type, title, is_published)
SELECT
  p.id, 'faq',
  '{"ko": "자주 묻는 질문", "en": "Frequently Asked Questions", "ja": "よくある質問", "zh": "常见问题"}'::jsonb,
  true
FROM public.partners p WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET title = EXCLUDED.title, is_published = true, updated_at = now();

-- ── 3-5. final_cta ─────────────────────────────────────────────────────────────
INSERT INTO public.contents (partner_id, section_type, title, subtitle, is_published)
SELECT
  p.id, 'final_cta',
  '{"ko": "{PartnerName}와 함께 시작하세요", "en": "Get Started with {PartnerName}", "ja": "{PartnerName}で始めましょう", "zh": "与{PartnerName}一起开始"}'::jsonb,
  '{"ko": "지금 바로 무료로 연동해보세요", "en": "Connect for free today", "ja": "今すぐ無料で連携してみましょう", "zh": "立即免费连接"}'::jsonb,
  true
FROM public.partners p WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, is_published = true, updated_at = now();

-- ── 3-6. about ─────────────────────────────────────────────────────────────────
INSERT INTO public.contents (partner_id, section_type, title, is_published)
SELECT
  p.id, 'about',
  '{"ko": "{PartnerName} 소개", "en": "About {PartnerName}", "ja": "{PartnerName}について", "zh": "关于{PartnerName}"}'::jsonb,
  true
FROM public.partners p WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET title = EXCLUDED.title, is_published = true, updated_at = now();

-- ── 3-7. contact ───────────────────────────────────────────────────────────────
INSERT INTO public.contents (partner_id, section_type, title, is_published)
SELECT
  p.id, 'contact',
  '{"ko": "문의하기", "en": "Contact Us", "ja": "お問い合わせ", "zh": "联系我们"}'::jsonb,
  true
FROM public.partners p WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type) DO UPDATE
  SET title = EXCLUDED.title, is_published = true, updated_at = now();

-- ── 3-8. footer ────────────────────────────────────────────────────────────────
INSERT INTO public.contents (partner_id, section_type, is_published)
SELECT p.id, 'footer', true
FROM public.partners p WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type) DO NOTHING;

-- ── 3-9. 법적 고지 (초안 — 어드민이 본문 작성 후 직접 발행) ─────────────────────
INSERT INTO public.contents (partner_id, section_type, title, is_published)
SELECT
  p.id,
  s.section_type,
  s.title::jsonb,
  false
FROM public.partners p
CROSS JOIN (VALUES
  ('terms'::text,       '{"ko": "{PartnerName} 이용약관",             "en": "{PartnerName} Terms of Service",  "ja": "{PartnerName} 利用規約",         "zh": "{PartnerName}服务条款"}'),
  ('privacy',           '{"ko": "{PartnerName} 개인정보 처리방침",      "en": "{PartnerName} Privacy Policy",    "ja": "{PartnerName} プライバシーポリシー", "zh": "{PartnerName}隐私政策"}'),
  ('cookie_policy',     '{"ko": "{PartnerName} 쿠키 정책",             "en": "{PartnerName} Cookie Policy",    "ja": "{PartnerName} クッキーポリシー",  "zh": "{PartnerName}Cookie政策"}')
) AS s(section_type, title)
WHERE p.subdomain = 'partner-a'
ON CONFLICT (partner_id, section_type) DO NOTHING;
-- 법적 고지는 어드민이 작성한 본문을 덮어쓰지 않도록 DO NOTHING 유지


-- ================================================================
-- 4. 검증 쿼리
-- ================================================================

SELECT
  p.subdomain,
  p.business_name,
  p.theme_key,
  p.published_locales,
  (SELECT COUNT(*) FROM partner_sections ps WHERE ps.partner_id = p.id) AS sections,
  (SELECT COUNT(*) FROM contents c WHERE c.partner_id = p.id AND c.is_published = true) AS published_contents,
  (SELECT COUNT(*) FROM contents c WHERE c.partner_id = p.id AND c.is_published = false) AS draft_contents
FROM public.partners p
WHERE p.subdomain = 'partner-a';
-- 기대:
--   business_name = 'CloudSave', theme_key = 'gray'
--   published_locales = {ko,en,ja,zh}
--   sections > 0, published_contents > 0, draft_contents = 3 (법적 고지)
