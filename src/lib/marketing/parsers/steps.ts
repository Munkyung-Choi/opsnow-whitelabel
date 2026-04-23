import type { Json } from '@/types/supabase';
import type { Locale } from '@/lib/i18n/locales';

export interface Step {
  step: number;
  title: string;
  subtitle?: string;       // 카드 대제목 (DB iconName 미입력 시 title 폴백)
  description: string;
  details?: string[];      // 카드 하단 체크리스트
  iconName?: string;       // Lucide 아이콘 이름 (IconRenderer에 전달)
}

export const DEFAULT_STEPS: Record<Locale, Step[]> = {
  ko: [
    {
      step: 1, title: 'Connect', subtitle: '클라우드 계정 연결', iconName: 'Link',
      description: 'AWS, Azure, GCP의 읽기 전용 API 권한만으로 5분 이내에 연동을 완료합니다. 에이전트 설치나 코드 변경은 전혀 필요 없습니다.',
      details: ['읽기 전용 IAM 역할 사용', 'SOC2 Type II 인증 완료', 'VPC 내 데이터 이탈 없음'],
    },
    {
      step: 2, title: 'Diagnose', subtitle: 'AI 비용 진단', iconName: 'ScanSearch',
      description: '연결 즉시 AI가 전체 리소스를 스캔합니다. 유휴 인스턴스, 과도 프로비저닝, 미사용 스토리지를 자동으로 분류하고 절감 금액을 예측합니다.',
      details: ['100% 자동 리소스 스캔', '절감 가능 금액 실시간 산출', '우선순위별 권고 목록 생성'],
    },
    {
      step: 3, title: 'Automate', subtitle: '자동 절감 실행', iconName: 'Zap',
      description: '승인된 정책에 따라 자동으로 절감 조치를 실행합니다. 모든 변경 사항은 로그에 기록되며 원클릭 롤백을 지원합니다.',
      details: ['정책 기반 자동 실행', '전체 변경 이력 감사 로그', '슬랙·이메일 실시간 알림'],
    },
  ],
  en: [
    {
      step: 1, title: 'Connect', subtitle: 'Connect Cloud Accounts', iconName: 'Link',
      description: 'Complete integration with AWS, Azure, and GCP in under 5 minutes using read-only API credentials. No agent installation or code changes required.',
      details: ['Read-only IAM role usage', 'SOC2 Type II certified', 'No data egress from VPC'],
    },
    {
      step: 2, title: 'Diagnose', subtitle: 'AI Cost Diagnosis', iconName: 'ScanSearch',
      description: 'The moment you connect, AI scans all your resources. Idle instances, over-provisioning, and unused storage are automatically categorized with savings projections.',
      details: ['100% automated resource scanning', 'Real-time savings potential calculation', 'Priority-ordered recommendation list'],
    },
    {
      step: 3, title: 'Automate', subtitle: 'Automated Savings Execution', iconName: 'Zap',
      description: 'Savings actions execute automatically based on approved policies. All changes are logged and support one-click rollback.',
      details: ['Policy-driven automated execution', 'Full change history audit log', 'Real-time Slack & email notifications'],
    },
  ],
  ja: [
    {
      step: 1, title: 'Connect', subtitle: 'クラウドアカウントの連携', iconName: 'Link',
      description: 'AWS、Azure、GCPの読み取り専用API権限のみで、5分以内に連携を完了します。エージェントのインストールやコード変更は一切不要です。',
      details: ['読み取り専用IAMロールを使用', 'SOC2 Type II認証済み', 'VPC内からのデータ流出なし'],
    },
    {
      step: 2, title: 'Diagnose', subtitle: 'AIコスト診断', iconName: 'ScanSearch',
      description: '連携直後からAIが全リソースをスキャンします。アイドルインスタンス、過剰プロビジョニング、未使用ストレージを自動分類し、節約金額を予測します。',
      details: ['100%自動リソーススキャン', '節約可能金額のリアルタイム算出', '優先度順の推奨リスト生成'],
    },
    {
      step: 3, title: 'Automate', subtitle: '自動節約の実行', iconName: 'Zap',
      description: '承認されたポリシーに従って節約措置を自動実行します。すべての変更はログに記録され、ワンクリックでロールバックできます。',
      details: ['ポリシーベースの自動実行', '全変更履歴の監査ログ', 'Slack・メールリアルタイム通知'],
    },
  ],
  zh: [
    {
      step: 1, title: 'Connect', subtitle: '连接云账户', iconName: 'Link',
      description: '仅需AWS、Azure、GCP的只读API权限，5分钟内完成连接。无需安装代理或修改任何代码。',
      details: ['使用只读IAM角色', '通过SOC2 Type II认证', '数据不离开VPC'],
    },
    {
      step: 2, title: 'Diagnose', subtitle: 'AI成本诊断', iconName: 'ScanSearch',
      description: '连接完成后，AI立即扫描所有资源。自动分类闲置实例、过度配置和未使用存储，并预测可节省金额。',
      details: ['100%自动资源扫描', '实时计算潜在节省金额', '按优先级排列的建议清单'],
    },
    {
      step: 3, title: 'Automate', subtitle: '自动节省执行', iconName: 'Zap',
      description: '根据已批准的策略自动执行节省措施。所有变更均有日志记录，支持一键回滚。',
      details: ['基于策略的自动执行', '完整变更历史审计日志', 'Slack及邮件实时通知'],
    },
  ],
};

export function parseSteps(bodyJson: Json | null, locale: Locale = 'ko'): Step[] {
  if (!Array.isArray(bodyJson)) return DEFAULT_STEPS[locale];

  const parsed = bodyJson.flatMap((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const s = item as Record<string, Json>;
    if (typeof s.title !== 'string' || typeof s.description !== 'string') return [];
    return [{
      step: typeof s.step === 'number' ? s.step : idx + 1,
      title: s.title,
      subtitle: typeof s.subtitle === 'string' ? s.subtitle : undefined,
      description: s.description,
      details: Array.isArray(s.details)
        ? s.details.flatMap((d) => (typeof d === 'string' ? [d] : []))
        : undefined,
      iconName: typeof s.iconName === 'string' ? s.iconName : undefined,
    }];
  });

  return parsed.length > 0 ? parsed : DEFAULT_STEPS[locale];
}
