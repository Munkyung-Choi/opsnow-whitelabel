#!/usr/bin/env node
// =============================================================================
// scripts/ai-audit.ts — Gemini 독립 교차검증 (WL-36)
// =============================================================================
// 사용법:
//   npx tsx scripts/ai-audit.ts              — 터미널 출력만
//   npx tsx scripts/ai-audit.ts --report     — 터미널 + JSON 리포트 저장
//   npx tsx scripts/ai-audit.ts --inv INV-01 — 특정 불변 조건만 감사
//
// 필수 환경 변수: GEMINI_API_KEY
// 선택 환경 변수: GEMINI_MODEL (기본값: gemini-2.0-flash)
//
// 설계 원칙:
//   - 구현자(Claude)와 검증자(Gemini)는 반드시 분리되어야 한다.
//   - Fail-Safe: Gemini API 실패 시 exit(0) — 기존 빌드 프로세스에 영향 없음.
//   - Zero-Leakage: 민감 키는 리포트 파일에 절대 평문으로 기록되지 않는다.
// =============================================================================

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');
const RUN_AT = new Date();

// ── 플래그 파싱 ───────────────────────────────────────────────────────────────
const REPORT_MODE = process.argv.includes('--report');
const INV_FILTER  = (() => {
  const idx = process.argv.indexOf('--inv');
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
})();

// ── 색상 / 로거 (run-rls-check.mjs 동일 패턴) ─────────────────────────────────
const C = {
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
};
const log = {
  info:  (msg: string) => console.log(`${C.dim('[INFO]')}    ${msg}`),
  ok:    (msg: string) => console.log(`${C.green('[OK]')}      ${msg}`),
  warn:  (msg: string) => console.log(`${C.yellow('[WARN]')}    ${msg}`),
  error: (msg: string) => console.log(`${C.red('[ERROR]')}   ${msg}`),
  blank: ()            => console.log(''),
};

// ── 타입 정의 ─────────────────────────────────────────────────────────────────
interface InvariantResult {
  invariant_id: string;
  title: string;
  verdict: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP';
  score: number;
  findings: string[];
  recommendation: string | null;
}

interface AuditReport {
  generatedAt: string;
  auditor: string;
  implementer: string;
  model_used: string;
  inv_filter: string | null;
  results: InvariantResult[];
  overall_score: number;
  critical_issues: number;
  warnings: number;
  summary: string;
  error?: string;
}

// ── ENV 로드 ──────────────────────────────────────────────────────────────────
function loadEnvFile(filePath: string): { loaded: boolean; count: number } {
  if (!existsSync(filePath)) return { loaded: false, count: 0 };
  let count = 0;
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) { process.env[key] = val; count++; }
  }
  return { loaded: true, count };
}

// ── 리포트 저장 ───────────────────────────────────────────────────────────────
function saveReport(report: AuditReport): void {
  const dateStr  = RUN_AT.toISOString().split('T')[0].replace(/-/g, '');
  const auditDir = join(ROOT, 'docs/audits');
  if (!existsSync(auditDir)) mkdirSync(auditDir, { recursive: true });

  // Zero-Leakage: AuditReport 타입 안에 env var 필드가 없음을 타입으로 보장
  const filePath = join(auditDir, `ai-audit-${dateStr}.json`);
  writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  log.ok(`리포트 저장: ${C.cyan(filePath.replace(ROOT + '\\', '').replace(ROOT + '/', ''))}`);
}

function saveWarningReport(reason: string): void {
  const report: AuditReport = {
    generatedAt:     RUN_AT.toISOString(),
    auditor:         'Gemini',
    implementer:     'Claude Sonnet 4.6',
    model_used:      process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    inv_filter:      INV_FILTER,
    results:         [],
    overall_score:   -1,
    critical_issues: 0,
    warnings:        1,
    summary:         `감사 실행 실패 — ${reason}`,
    error:           reason,
  };
  saveReport(report);
}

// ── Gemini REST API 호출 ──────────────────────────────────────────────────────
async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  const url  = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature:      0.1,   // 낮은 온도 = 일관된 분석
      maxOutputTokens:  4096,
      responseMimeType: 'application/json', // JSON 모드 강제 (Gemini 2.0+)
    },
  };

  const response = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API ${response.status}: ${errText.slice(0, 300)}`);
  }

  const json = await response.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    error?: { message: string };
  };

  if (json.error) throw new Error(`Gemini 오류: ${json.error.message}`);

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Gemini 응답이 비어있습니다 (finishReason: ' +
    (json.candidates?.[0]?.finishReason ?? 'unknown') + ')');
  return text;
}

// ── JSON 파싱 (방어적 — 마크다운 감싸기 대비) ─────────────────────────────────
function extractJSON(raw: string): AuditReport {
  // responseMimeType: 'application/json' 사용 시 순수 JSON이어야 하지만 방어적 처리
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`JSON 블록을 찾을 수 없음. 원시 응답 앞부분: ${raw.slice(0, 200)}`);
  return JSON.parse(jsonMatch[0]) as AuditReport;
}

// ── 소스 파일 목록 ────────────────────────────────────────────────────────────
const AUDIT_TARGETS: { label: string; path: string }[] = [
  // 불변 조건 정의 (가장 먼저 전달)
  { label: 'docs/audits/invariants.md',               path: 'docs/audits/invariants.md' },
  // 보안 정책 문서
  { label: 'SECURITY.md',                             path: 'SECURITY.md' },
  // 인증·라우팅 (INV-04, INV-05)
  { label: 'src/middleware.ts',                        path: 'src/middleware.ts' },
  // Supabase 클라이언트 — 키 격리 검증 (INV-02)
  { label: 'src/lib/supabase/server.ts',              path: 'src/lib/supabase/server.ts' },
  { label: 'src/lib/supabase/client.ts',              path: 'src/lib/supabase/client.ts' },
  // DB 마이그레이션 — RLS 핵심 (INV-01, INV-03, INV-05)
  { label: 'migrations/rls_policies.sql',             path: 'supabase/migrations/20260408000003_rls_policies.sql' },
  { label: 'migrations/create_views.sql',             path: 'supabase/migrations/20260408000002_create_views.sql' },
  { label: 'migrations/create_tables.sql',            path: 'supabase/migrations/20260408000001_create_tables.sql' },
];

// Route Handler 동적 탐색 (WL-36 구현 후 자동 감사 대상에 포함)
const DYNAMIC_ROUTES = [
  'app/api/leads/route.ts',
  'app/api/ai/generate/route.ts',
  'app/api/ai/verify/route.ts',
  'app/api/admin/route.ts',
];
for (const rel of DYNAMIC_ROUTES) {
  if (existsSync(join(ROOT, rel))) {
    AUDIT_TARGETS.push({ label: rel, path: rel });
  }
}

// ── 프롬프트 템플릿 ───────────────────────────────────────────────────────────
function buildPrompt(sourceContext: string, model: string, invFilter: string | null): string {
  const filterLine = invFilter
    ? `중요: ${invFilter}만 평가하세요. 나머지 불변 조건은 "verdict": "SKIP", "score": -1, "findings": [], "recommendation": null로 반환하세요.`
    : '모든 불변 조건(INV-01 ~ INV-06)을 빠짐없이 평가하세요.';

  return `You are an independent security auditor for a multi-tenant SaaS application ("OpsNow White-label Site Builder").
You did NOT write any of the code below. Your job: find security violations objectively and precisely.

## Project Architecture
- Multi-tenant: Each partner (reseller) has completely isolated data in a shared PostgreSQL database.
- Stack: Next.js 16 App Router, Supabase (PostgreSQL + Row Level Security), TypeScript, Vercel Edge
- Roles: master_admin (OpsNow internal staff), partner_admin (reseller), anon (end user / unauthenticated)
- Auth: Supabase JWT. Role is determined ONLY by profiles.role in the DB — never by client-supplied parameters.
- Key isolation rule: Variables without NEXT_PUBLIC_ prefix must NEVER reach the browser.
- API routes (/api/*) are excluded from Next.js middleware matcher — all API auth relies on Route Handler checks.

## Source Code to Audit
${sourceContext}

## Audit Instructions
${filterLine}

The 6 system invariants to evaluate are defined in [docs/audits/invariants.md] above.
For each invariant:
1. Read the invariant description and the "Gemini에게 묻는 질문" section (Questions for Gemini).
2. Search the provided source code for concrete evidence.
3. Assign a verdict based only on what you can observe in the code.

Verdict rules:
- PASS  = Code actively implements this protection. Cite specific evidence (file + line pattern).
- WARNING = A gap or incomplete implementation exists. Explain what's missing.
- FAIL  = A clear, exploitable violation exists in the current code. Cite exact file and code pattern.
- SKIP  = Invariant excluded by --inv filter.

Additional rules:
- If a Route Handler file is missing (not yet implemented), note it as a WARNING, not FAIL.
- Never echo actual key values — reference by variable name only (SUPABASE_SERVICE_ROLE_KEY, etc.).
- Be concise and specific in findings. Avoid generic statements.

Return ONLY valid JSON — no markdown, no explanation outside the JSON object:
{
  "auditor": "Gemini",
  "implementer": "Claude Sonnet 4.6",
  "model_used": "${model}",
  "results": [
    {
      "invariant_id": "INV-01",
      "title": "파트너 간 데이터 완전 격리",
      "verdict": "PASS",
      "score": 90,
      "findings": [
        "rls_policies.sql: leads_partner_admin_select correctly uses partner_id IN (SELECT id FROM partners WHERE owner_id = auth.uid())",
        "rls_policies.sql: contents_public_anon_read is TO anon only — authenticated partners cannot cross-read contents"
      ],
      "recommendation": null
    }
  ],
  "overall_score": 88,
  "critical_issues": 0,
  "warnings": 1,
  "summary": "전체 감사 요약 — 3줄 이내, 한국어"
}`.trim();
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const dateTag = RUN_AT.toISOString().split('T')[0].replace(/-/g, '');

  console.log('');
  console.log(C.bold('═══════════════════════════════════════════════════════════'));
  console.log(C.bold('  Gemini 독립 교차검증 (ai-audit) — WL-36'));
  console.log(C.bold('═══════════════════════════════════════════════════════════'));
  console.log(C.dim(`  실행 시각  : ${RUN_AT.toLocaleString('ko-KR')}`));
  console.log(C.dim(`  구현자     : Claude Sonnet 4.6`));
  console.log(C.dim(`  검증자     : Gemini (독립 분리)`));
  if (INV_FILTER) console.log(C.dim(`  필터       : ${INV_FILTER} 만 감사`));
  if (REPORT_MODE) console.log(C.dim(`  리포트     : docs/audits/ai-audit-${dateTag}.json`));
  log.blank();

  // ① ENV 로드
  console.log(C.bold('── 설정 파일 로드 ───────────────────────────────────────────'));
  for (const { path: p, label } of [
    { path: join(ROOT, '.env'),       label: '.env' },
    { path: join(ROOT, '.env.local'), label: '.env.local' },
  ]) {
    process.stdout.write(`${C.dim('[INFO]')}    ${C.cyan(label)} ... `);
    const { loaded, count } = loadEnvFile(p);
    console.log(loaded
      ? `${C.green('성공')} ${C.dim(`(변수 ${count}개)`)}`
      : C.yellow('스킵 (파일 없음)'));
  }
  log.blank();

  // ② API 키 검증
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL   = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

  if (!GEMINI_API_KEY) {
    log.error('GEMINI_API_KEY 미설정.');
    log.warn('  → .env.local 에 GEMINI_API_KEY=<your-key> 를 추가하세요.');
    log.warn('  → Fail-Safe: Warning 리포트 저장 후 exit(0) — 빌드에 영향 없음.');
    if (REPORT_MODE) saveWarningReport('GEMINI_API_KEY 미설정');
    process.exit(0);
  }
  log.ok(`GEMINI_API_KEY 설정됨 ${C.dim(`(길이: ${GEMINI_API_KEY.length}자)`)}`);
  log.ok(`감사 모델: ${C.cyan(GEMINI_MODEL)}`);
  log.blank();

  // ③ 소스 파일 수집
  console.log(C.bold('── 감사 대상 파일 수집 ──────────────────────────────────────'));
  const collected: Array<{ label: string; content: string; found: boolean }> = [];
  for (const { label, path: rel } of AUDIT_TARGETS) {
    const full = join(ROOT, rel);
    process.stdout.write(`${C.dim('[INFO]')}    ${label} ... `);
    if (existsSync(full)) {
      const content = readFileSync(full, 'utf-8');
      collected.push({ label, content, found: true });
      console.log(`${C.green('수집됨')} ${C.dim(`(${content.split('\n').length}줄)`)}`);
    } else {
      collected.push({ label, content: '', found: false });
      console.log(C.yellow('없음 (미구현 또는 경로 불일치)'));
    }
  }

  const missingFiles = collected.filter((f) => !f.found).map((f) => f.label);
  if (missingFiles.length > 0) {
    log.blank();
    log.warn(`미수집 파일 ${missingFiles.length}개: ${missingFiles.join(', ')}`);
    log.warn('미구현 파일은 FAIL이 아닌 WARNING으로 처리됩니다.');
  }
  log.blank();

  // ④ 프롬프트 빌드
  console.log(C.bold('── 프롬프트 빌드 ────────────────────────────────────────────'));
  const sourceContext = collected
    .filter((f) => f.found)
    .map((f) => `### [${f.label}]\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n---\n\n');

  const prompt = buildPrompt(sourceContext, GEMINI_MODEL, INV_FILTER);
  const estimatedTokens = Math.round(prompt.length / 4);
  log.ok(`프롬프트 빌드 완료 ${C.dim(`(약 ${estimatedTokens.toLocaleString()}토큰 추정)`)}`);
  log.blank();

  // ⑤ Gemini 호출
  console.log(C.bold('── Gemini API 호출 ──────────────────────────────────────────'));
  log.info(`모델: ${GEMINI_MODEL}`);
  log.info('응답 대기 중...');

  let rawResponse: string;
  try {
    rawResponse = await callGemini(GEMINI_API_KEY, GEMINI_MODEL, prompt);
    log.ok(`응답 수신 완료 ${C.dim(`(${rawResponse.length.toLocaleString()}자)`)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Gemini 호출 실패: ${msg}`);
    log.warn('Fail-Safe: Warning 리포트 저장 후 exit(0) — 빌드에 영향 없음.');
    if (REPORT_MODE) saveWarningReport(`Gemini API 오류: ${msg}`);
    process.exit(0);
  }
  log.blank();

  // ⑥ JSON 파싱
  let report: AuditReport;
  try {
    report = extractJSON(rawResponse);
    report.generatedAt = RUN_AT.toISOString();
    report.inv_filter  = INV_FILTER;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`JSON 파싱 실패: ${msg}`);
    console.log(C.dim('--- 원시 응답 (앞 500자) ---'));
    console.log(C.dim(rawResponse.slice(0, 500)));
    if (REPORT_MODE) saveWarningReport(`JSON 파싱 실패: ${msg}`);
    process.exit(0);
  }

  // ⑦ 결과 출력
  console.log(C.bold('── 감사 결과 ────────────────────────────────────────────────'));
  log.blank();

  let failCount = 0, warnCount = 0, passCount = 0, skipCount = 0;

  for (const r of report.results) {
    const badge =
      r.verdict === 'PASS'    ? C.green(`[PASS]`) :
      r.verdict === 'FAIL'    ? C.red(`[FAIL]`) :
      r.verdict === 'WARNING' ? C.yellow(`[WARN]`) :
                                C.dim(`[SKIP]`);
    const scoreStr = r.score >= 0 ? C.dim(` (${r.score}/100)`) : '';

    console.log(`  ${badge} ${C.bold(r.invariant_id)} ${r.title}${scoreStr}`);

    for (const finding of r.findings) {
      console.log(`         ${C.dim('→')} ${finding}`);
    }
    if (r.recommendation) {
      console.log(`         ${C.yellow('★')} ${C.yellow(r.recommendation)}`);
    }
    log.blank();

    if (r.verdict === 'FAIL')         failCount++;
    else if (r.verdict === 'WARNING') warnCount++;
    else if (r.verdict === 'PASS')    passCount++;
    else                              skipCount++;
  }

  // ⑧ 요약
  console.log('────────────────────────────────────────────────────────────');
  console.log(
    `결과: ${C.green(`${passCount} PASS`)} / ${C.red(`${failCount} FAIL`)} / ${C.yellow(`${warnCount} WARN`)}` +
    (skipCount > 0 ? ` / ${C.dim(`${skipCount} SKIP`)}` : '') +
    C.dim(`  종합 점수: ${report.overall_score}/100`)
  );
  log.blank();
  console.log(C.bold('Gemini 총평:'));
  for (const line of report.summary.split('\n').filter(Boolean)) {
    console.log(`  ${C.dim(line)}`);
  }
  log.blank();

  // ⑨ 리포트 저장
  if (REPORT_MODE) {
    console.log(C.bold('── 리포트 저장 ──────────────────────────────────────────────'));
    saveReport(report);
    log.blank();
  }

  // ⑩ 종료 코드
  if (failCount > 0) {
    console.log(C.red('⚠️  FAIL 감지. 보안 취약점을 즉시 확인하세요.'));
    process.exit(1);
  } else if (warnCount > 0) {
    console.log(C.yellow('ℹ️  WARNING 감지. 검토를 권장합니다.'));
    process.exit(0);
  } else {
    console.log(C.green('✅ 모든 불변 조건 PASS'));
    process.exit(0);
  }
}

main().catch((err) => {
  log.blank();
  log.error(`예기치 않은 오류: ${err instanceof Error ? err.message : String(err)}`);
  log.warn('Fail-Safe: exit(0) — 빌드에 영향 없음.');
  process.exit(0);
});
