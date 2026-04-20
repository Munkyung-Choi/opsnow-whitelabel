-- ================================================================
-- WL-103: global_contents.pain_points i18n 재시딩
-- 기존 Korean 단일 문자열 → {"ko":…, "en":…, "ja":…, "zh":…} 형식으로 교체
-- 실행 주체: Supabase SQL Editor (문경 님 직접 실행)
-- 작성일: 2026-04-16
--
-- ⚠️  ON CONFLICT (section_type) DO UPDATE — 멱등성 보장.
--
-- 검증:
--   SELECT section_type, meta->'cards'->0->'title', updated_at
--   FROM global_contents
--   WHERE section_type = 'pain_points';
-- ================================================================

INSERT INTO global_contents (section_type, meta, updated_at)
VALUES (
  'pain_points',
  '{
    "cards": [
      {
        "icon": "EyeOff",
        "tag":         {"ko": "PROBLEM 01", "en": "PROBLEM 01", "ja": "問題 01",   "zh": "问题 01"},
        "title":       {"ko": "가시성 부족",  "en": "Lack of Visibility",         "ja": "可視性の欠如",       "zh": "可见性不足"},
        "description": {"ko": "AWS, Azure, GCP 비용이 각기 다른 콘솔에 분산되어 있어 통합 현황을 파악하는 것 자체가 하루 업무가 됩니다. 어느 팀이 얼마를 쓰는지조차 알 수 없죠.", "en": "AWS, Azure, and GCP costs are scattered across separate consoles, making it a full day''s work just to understand the overall picture. You can''t even tell which team is spending what.", "ja": "AWS、Azure、GCPのコストが別々のコンソールに散在しており、全体像を把握するだけで丸一日かかります。どのチームがいくら使っているかさえわかりません。", "zh": "AWS、Azure和GCP的费用分散在不同的控制台中，仅了解整体情况就需要花费一整天。您甚至无法知道哪个团队花了多少钱。"},
        "pain":        {"ko": "평균 3개 이상의 콘솔을 매일 오가는 팀", "en": "Teams navigating 3+ consoles daily", "ja": "毎日3つ以上のコンソールを行き来するチーム", "zh": "每天切换3个以上控制台的团队"}
      },
      {
        "icon": "Clock",
        "tag":         {"ko": "PROBLEM 02", "en": "PROBLEM 02", "ja": "問題 02",   "zh": "问题 02"},
        "title":       {"ko": "대응 지연",   "en": "Delayed Response",           "ja": "対応遅延",           "zh": "响应滞后"},
        "description": {"ko": "이달 말에야 청구서를 받아보는 구조에서는 이미 낭비가 일어난 뒤입니다. 경고 알림 하나 설정하는 데도 수동 작업이 수반됩니다.", "en": "In a system where you only receive invoices at month end, waste has already occurred. Even setting up a single alert requires manual effort.", "ja": "月末になってようやく請求書を受け取る仕組みでは、すでに無駄が発生しています。アラートの設定一つにも手作業が伴います。", "zh": "在月底才收到账单的体系下，浪费早已发生。即使设置一个警报也需要手动操作。"},
        "pain":        {"ko": "이상 지출 탐지까지 평균 18일 소요", "en": "Average 18 days to detect anomalous spend", "ja": "異常な支出の検出まで平均18日", "zh": "平均需要18天才能检测到异常支出"}
      },
      {
        "icon": "Puzzle",
        "tag":         {"ko": "PROBLEM 03", "en": "PROBLEM 03", "ja": "問題 03",   "zh": "问题 03"},
        "title":       {"ko": "최적화 난제", "en": "Optimization Complexity",    "ja": "最適化の難題",       "zh": "优化难题"},
        "description": {"ko": "Reserved Instance, Savings Plan, Spot Instance의 복잡한 조합은 클라우드 전문가도 최적 선택이 어렵습니다. 잘못된 선택은 오히려 비용을 늘립니다.", "en": "The complex combinations of Reserved Instances, Savings Plans, and Spot Instances are difficult to optimize even for cloud experts. Wrong choices can actually increase costs.", "ja": "Reserved Instance、Savings Plan、Spot Instanceの複雑な組み合わせは、クラウドの専門家でも最適な選択が難しいです。間違った選択はコストを増加させます。", "zh": "预留实例、储蓄计划和竞价实例的复杂组合即使对云专家也难以优化。错误的选择反而会增加成本。"},
        "pain":        {"ko": "RI/SP 활용률 평균 34%에 그치는 현실", "en": "RI/SP utilization averaging only 34%", "ja": "RI/SP活用率が平均34%にとどまる現実", "zh": "RI/SP利用率平均仅34%的现实"}
      }
    ]
  }'::jsonb,
  now()
)
ON CONFLICT (section_type) DO UPDATE
  SET meta = EXCLUDED.meta, updated_at = now();
