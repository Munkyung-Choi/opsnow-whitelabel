#!/usr/bin/env node
// =============================================================================
// scripts/run-rls-check.mjs — RLS 검증 자동화 (T-01 ~ T-10)
// =============================================================================
// 사용법:
//   npm run check:rls              — 터미널 출력만
//   npm run check:rls -- --report  — 터미널 출력 + JSON 리포트 저장
//
// 설계: supabase-js + 실제 Auth 세션으로 RLS 검증 (PostgREST 경로 = 프로덕션 동일)
//   - anon 테스트  : ANON_KEY 클라이언트 (T-05, T-09, T-10)
//   - 인증 테스트  : signInWithPassword() → 사용자 JWT (T-01~T-04, T-06~T-08)
//
// 방어적 클린업 (Gemini 피드백 반영):
//   INSERT 테스트(T-05, T-07)에 sentinel 값 사용.
//   테스트 전 pre-flight 클린업 + INSERT 성공(=RLS 뚫림) 시 즉시 DELETE.
//   클린업은 service_role 클라이언트로 RLS 우회 수행.
//
// 설정 파일 우선순위 (낮음 → 높음):
//   .env  →  .env.local  →  docs/exec-plans/rls-fixtures.env
// =============================================================================

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

// ── 플래그 파싱 ────────────────────────────────────────────────────────────
const REPORT_MODE = process.argv.includes('--report');

// ── sentinel 상수 (멱등성 보장용 고정값) ───────────────────────────────────
// 이 값들이 DB에 남아있으면 이전 실행에서 RLS가 뚫린 것을 의미함
const SENTINEL_LEADS_EMAIL   = 'rls-cleanup-sentinel@opsnotesting.invalid';
const SENTINEL_VISITS_COUNT  = 999_999_999;

// ── 색상 / 로거 ────────────────────────────────────────────────────────────
const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue:   (s) => `\x1b[34m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};
const log = {
  info:    (msg) => console.log(`${C.dim('[INFO]')}    ${msg}`),
  ok:      (msg) => console.log(`${C.green('[OK]')}      ${msg}`),
  warn:    (msg) => console.log(`${C.yellow('[WARN]')}    ${msg}`),
  error:   (msg) => console.log(`${C.red('[ERROR]')}   ${msg}`),
  cleanup: (msg) => console.log(`${C.cyan('[CLEANUP]')} ${msg}`),
  blank:   ()    => console.log(''),
};

// ── 설정 파일 로드 ─────────────────────────────────────────────────────────
const ENV_FILES = [
  { path: join(ROOT, '.env'),                              label: '.env'             },
  { path: join(ROOT, '.env.local'),                        label: '.env.local'       },
  { path: join(ROOT, 'docs/exec-plans/rls-fixtures.env'), label: 'rls-fixtures.env' },
];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return { loaded: false, count: 0 };
  const lines = readFileSync(filePath, 'utf-8').split('\n');
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    process.env[key] = val;
    count++;
  }
  return { loaded: true, count };
}

console.log('');
console.log(C.bold('── 설정 파일 로드 (우선순위: 낮음 → 높음) ──────────────────'));
for (const { path: filePath, label } of ENV_FILES) {
  process.stdout.write(`${C.dim('[INFO]')}    ${C.cyan(label)} 로드 시도 ... `);
  const { loaded, count } = loadEnvFile(filePath);
  if (loaded) console.log(`${C.green('성공')} ${C.dim(`(변수 ${count}개 적용)`)}`);
  else        console.log(`${C.yellow('스킵')} ${C.dim('(파일 없음)')}`);
}
log.blank();
log.info(`${C.bold('우선순위 규칙')}: rls-fixtures.env 값이 .env / .env.local 값을 덮어씁니다.`);

// ── 변수 검증 ──────────────────────────────────────────────────────────────
const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];
const OPTIONAL_VARS = [
  { key: 'RLS_TEST_PARTNER_A_ID',             tests: 'T-01, T-02, T-06, T-07, T-08' },
  { key: 'RLS_TEST_PARTNER_A_ADMIN_EMAIL',    tests: 'T-04, T-06, T-07, T-08'       },
  { key: 'RLS_TEST_PARTNER_A_ADMIN_PASSWORD', tests: 'T-04, T-06, T-07, T-08'       },
  { key: 'RLS_TEST_PARTNER_B_ID',             tests: 'T-01, T-02'                   },
  { key: 'RLS_TEST_PARTNER_B_ADMIN_EMAIL',    tests: 'T-01, T-02'                   },
  { key: 'RLS_TEST_PARTNER_B_ADMIN_PASSWORD', tests: 'T-01, T-02'                   },
  { key: 'RLS_TEST_MASTER_ADMIN_EMAIL',       tests: 'T-03'                         },
  { key: 'RLS_TEST_MASTER_ADMIN_PASSWORD',    tests: 'T-03'                         },
];

log.blank();
console.log(C.bold('── 변수 검증 ────────────────────────────────────────────────'));

const missingRequired = REQUIRED_VARS.filter((k) => !process.env[k]);
if (missingRequired.length > 0) {
  for (const key of missingRequired) log.error(`필수 변수 누락: ${C.bold(key)}`);
  log.blank();
  log.error('.env.local 에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.');
  process.exit(1);
}
log.ok(`${C.bold('NEXT_PUBLIC_SUPABASE_URL')} 설정됨 ${C.dim(`(${process.env.NEXT_PUBLIC_SUPABASE_URL})`)}`);
log.ok(`${C.bold('NEXT_PUBLIC_SUPABASE_ANON_KEY')} 설정됨`);

for (const { key } of OPTIONAL_VARS.filter(({ key }) =>  process.env[key])) {
  const display = key.toLowerCase().includes('password') ? '(설정됨)' : process.env[key];
  log.ok(`${C.bold(key)} ${C.dim(display)}`);
}
for (const { key, tests } of OPTIONAL_VARS.filter(({ key }) => !process.env[key])) {
  log.warn(`${C.bold(key)} 미설정 → ${C.yellow(tests)} SKIP 처리`);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  log.warn(`${C.bold('SUPABASE_SERVICE_ROLE_KEY')} 미설정 → INSERT 테스트 방어적 클린업 비활성`);
}

// ── 픽스처 ────────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const PARTNER_A_ID  = process.env.RLS_TEST_PARTNER_A_ID            ?? '';
const PA_EMAIL      = process.env.RLS_TEST_PARTNER_A_ADMIN_EMAIL    ?? '';
const PA_PASSWORD   = process.env.RLS_TEST_PARTNER_A_ADMIN_PASSWORD ?? '';
const PB_EMAIL      = process.env.RLS_TEST_PARTNER_B_ADMIN_EMAIL    ?? '';
const PB_PASSWORD   = process.env.RLS_TEST_PARTNER_B_ADMIN_PASSWORD ?? '';
const MA_EMAIL      = process.env.RLS_TEST_MASTER_ADMIN_EMAIL       ?? '';
const MA_PASSWORD   = process.env.RLS_TEST_MASTER_ADMIN_PASSWORD    ?? '';

// ── Supabase 클라이언트 팩토리 ─────────────────────────────────────────────
function anonClient() {
  return createClient(SUPABASE_URL, ANON_KEY);
}

function authedClient(accessToken) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// service_role 클라이언트 — RLS 우회, 클린업 전용
function serviceClient() {
  if (!SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

async function signIn(email, password, label) {
  const { data, error } = await anonClient().auth.signInWithPassword({ email, password });
  if (error) { log.error(`${label} 로그인 실패: ${error.message}`); return null; }
  return data.session.access_token;
}

// ── 방어적 클린업 ─────────────────────────────────────────────────────────
// service_role 없으면 경고 출력 후 건너뜀 (테스트 결과에는 영향 없음)
async function runCleanup(label, cleanupFn) {
  const svc = serviceClient();
  if (!svc) {
    log.warn(`클린업 스킵 (SUPABASE_SERVICE_ROLE_KEY 미설정): ${label}`);
    return;
  }
  const { error } = await cleanupFn(svc);
  if (error) log.warn(`클린업 오류 [${label}]: ${error.message}`);
  else       log.cleanup(`${label} sentinel 데이터 정리 완료`);
}

// ── 결과 추적 ─────────────────────────────────────────────────────────────
const results = [];
let PASS = 0, FAIL = 0, SKIP = 0;
const RUN_AT = new Date();

function record(testId, desc, status, detail = '') {
  results.push({ testId, desc, status, detail, timestamp: new Date().toISOString() });
  if      (status === 'PASS') PASS++;
  else if (status === 'FAIL') FAIL++;
  else                        SKIP++;
}

// ── 검증 헬퍼 ─────────────────────────────────────────────────────────────
async function testExpectCount(testId, desc, sb, queryFn, expectedCount) {
  const { data, error } = await queryFn(sb);
  if (error) {
    record(testId, desc, 'FAIL', `Error: ${error.message}`);
  } else if ((data ?? []).length === expectedCount) {
    record(testId, desc, 'PASS');
  } else {
    record(testId, desc, 'FAIL', `expected ${expectedCount}행, got ${(data ?? []).length}행`);
  }
}

// INSERT 차단 테스트 전용 — 성공 시(=RLS 뚫림) 즉시 클린업 실행
async function testInsertBlocked(testId, desc, sb, queryFn, errorPattern, cleanupFn) {
  const { error } = await queryFn(sb);
  if (error && new RegExp(errorPattern, 'i').test(error.message)) {
    record(testId, desc, 'PASS');
  } else if (error) {
    record(testId, desc, 'FAIL', `에러 패턴 불일치: ${error.message}`);
  } else {
    // INSERT가 성공했다 = RLS/FK 뚫림 → 즉시 클린업
    log.error(`[${testId}] INSERT 성공 감지 (RLS 뚫림). 긴급 클린업 실행...`);
    await runCleanup(`${testId} 긴급 클린업`, cleanupFn);
    record(testId, desc, 'FAIL', '에러 미발생 (RLS/FK 차단 실패) — sentinel 데이터 삭제 완료');
  }
}

async function testExpectNull(testId, desc, sb, queryFn) {
  const { data, error } = await queryFn(sb);
  if (error) { record(testId, desc, 'FAIL', `Error: ${error.message}`); return; }
  const val = Array.isArray(data) ? (data[0] ? Object.values(data[0])[0] : null) : data;
  if (val === null || val === undefined) {
    record(testId, desc, 'PASS');
  } else {
    record(testId, desc, 'FAIL', `expected NULL, got '${val}'`);
  }
}

function skipTest(testId, desc, reason) {
  record(testId, desc, 'SKIP', reason);
}

// ── JSON 리포트 저장 ───────────────────────────────────────────────────────
function saveReport() {
  const dateStr = RUN_AT.toISOString().split('T')[0].replace(/-/g, '');
  const auditDir = join(ROOT, 'docs/audits');
  const filePath = join(auditDir, `rls-report-${dateStr}.json`);

  if (!existsSync(auditDir)) mkdirSync(auditDir, { recursive: true });

  const report = {
    generatedAt: RUN_AT.toISOString(),
    summary: { pass: PASS, fail: FAIL, skip: SKIP, total: PASS + FAIL + SKIP },
    results: results.map(({ testId, desc, status, detail, timestamp }) => ({
      testId, desc, status, detail: detail || null, timestamp,
    })),
    environment: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      nodeVersion: process.version,
    },
  };

  writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  log.ok(`JSON 리포트 저장: ${C.cyan(filePath.replace(ROOT + '/', ''))}`);
}

// ── 메인 ──────────────────────────────────────────────────────────────────
async function main() {
  log.blank();
  console.log(C.bold('── RLS 검증 실행 (T-01 ~ T-10) ─────────────────────────────'));
  console.log(C.dim(`   실행 시각: ${RUN_AT.toLocaleString('ko-KR')}`));
  if (REPORT_MODE) log.info(`리포트 모드 활성 → docs/audits/rls-report-${RUN_AT.toISOString().split('T')[0].replace(/-/g, '')}.json 저장 예정`);
  log.blank();

  // ── Pre-flight 클린업: 이전 실패 실행에서 남은 sentinel 데이터 정리 ─────
  console.log(C.bold('── Pre-flight 클린업 ────────────────────────────────────────'));
  await runCleanup('leads sentinel',
    (svc) => svc.from('leads').delete().eq('email', SENTINEL_LEADS_EMAIL));
  await runCleanup('site_visits sentinel',
    (svc) => svc.from('site_visits').delete().eq('count', SENTINEL_VISITS_COUNT));
  log.blank();

  // ── JWT 사전 발급 ──────────────────────────────────────────────────────
  console.log(C.bold('── 인증 토큰 발급 ───────────────────────────────────────────'));
  let tokenPA = null, tokenPB = null, tokenMA = null;

  if (PA_EMAIL && PA_PASSWORD) {
    tokenPA = await signIn(PA_EMAIL, PA_PASSWORD, '파트너A admin');
    if (!tokenPA) { log.error('파트너A admin 로그인 실패. fixtures 이메일/패스워드를 확인하세요.'); process.exit(1); }
    log.ok('파트너A admin 토큰 발급 완료');
  }
  if (PB_EMAIL && PB_PASSWORD) {
    tokenPB = await signIn(PB_EMAIL, PB_PASSWORD, '파트너B admin');
    if (!tokenPB) { log.error('파트너B admin 로그인 실패. fixtures 이메일/패스워드를 확인하세요.'); process.exit(1); }
    log.ok('파트너B admin 토큰 발급 완료');
  }
  if (MA_EMAIL && MA_PASSWORD) {
    tokenMA = await signIn(MA_EMAIL, MA_PASSWORD, 'master admin');
    if (!tokenMA) { log.error('master admin 로그인 실패. fixtures 이메일/패스워드를 확인하세요.'); process.exit(1); }
    log.ok('master admin 토큰 발급 완료');
  }
  if (!tokenPA && !tokenPB && !tokenMA) log.warn('인증 토큰 없음 — anon 테스트(T-05, T-09, T-10)만 실행됩니다.');

  log.blank();
  console.log(C.bold('── 테스트 결과 ──────────────────────────────────────────────'));

  // T-01: 파트너B admin → 파트너A leads 조회 차단
  if (tokenPB && PARTNER_A_ID) {
    await testExpectCount('T-01', '파트너 간 leads 크로스테넌트 차단',
      authedClient(tokenPB),
      (sb) => sb.from('leads').select('*').eq('partner_id', PARTNER_A_ID),
      0);
  } else {
    skipTest('T-01', '파트너 간 leads 크로스테넌트 차단', 'PARTNER_B admin 자격증명 / PARTNER_A_ID 미설정');
  }

  // T-02: 파트너B admin → 파트너A 미발행 contents 조회 차단
  if (tokenPB && PARTNER_A_ID) {
    await testExpectCount('T-02', '파트너 간 미발행 contents 차단',
      authedClient(tokenPB),
      (sb) => sb.from('contents').select('*').eq('partner_id', PARTNER_A_ID).eq('is_published', false),
      0);
  } else {
    skipTest('T-02', '파트너 간 미발행 contents 차단', 'PARTNER_B admin 자격증명 / PARTNER_A_ID 미설정');
  }

  // T-03: master_admin → leads 직접 조회 차단
  if (tokenMA) {
    await testExpectCount('T-03', 'master_admin leads 직접 접근 차단',
      authedClient(tokenMA),
      (sb) => sb.from('leads').select('*'),
      0);
  } else {
    skipTest('T-03', 'master_admin leads 직접 접근 차단', 'MASTER_ADMIN 자격증명 미설정');
  }

  // T-04: 파트너A admin → leads_masked_view 조회 차단
  if (tokenPA) {
    await testExpectCount('T-04', 'leads_masked_view partner_admin 접근 차단',
      authedClient(tokenPA),
      (sb) => sb.from('leads_masked_view').select('*'),
      0);
  } else {
    skipTest('T-04', 'leads_masked_view partner_admin 접근 차단', 'PARTNER_A admin 자격증명 미설정');
  }

  // T-05: anon → FK 위반 INSERT 차단 (sentinel email 사용, 클린업 포함)
  await testInsertBlocked('T-05', 'anon FK 위반 INSERT 차단',
    anonClient(),
    (sb) => sb.from('leads').insert({
      partner_id:    '00000000-0000-0000-0000-000000000000',
      customer_name: 'RLS-Test-Sentinel',
      email:         SENTINEL_LEADS_EMAIL,
    }),
    'foreign key|violates|row.level security|RLS|not found',
    (svc) => svc.from('leads').delete().eq('email', SENTINEL_LEADS_EMAIL),
  );

  // T-06: 파트너A admin → 타 파트너 partners 조회 차단
  if (tokenPA && PARTNER_A_ID) {
    await testExpectCount('T-06', 'partner_admin 타 파트너 조회 차단',
      authedClient(tokenPA),
      (sb) => sb.from('partners').select('id').eq('is_active', true).neq('id', PARTNER_A_ID),
      0);
  } else {
    skipTest('T-06', 'partner_admin 타 파트너 조회 차단', 'PARTNER_A admin 자격증명 / PARTNER_A_ID 미설정');
  }

  // T-07: 파트너A admin → site_visits INSERT 차단 (sentinel count 사용, 클린업 포함)
  if (tokenPA && PARTNER_A_ID) {
    await testInsertBlocked('T-07', 'partner_admin site_visits INSERT 차단',
      authedClient(tokenPA),
      (sb) => sb.from('site_visits').insert({
        partner_id: PARTNER_A_ID,
        visit_date: new Date().toISOString().split('T')[0],
        count:      SENTINEL_VISITS_COUNT,
      }),
      'row.level security|RLS|violates|policy|not authorized',
      (svc) => svc.from('site_visits').delete().eq('count', SENTINEL_VISITS_COUNT),
    );
  } else {
    skipTest('T-07', 'partner_admin site_visits INSERT 차단', 'PARTNER_A admin 자격증명 / PARTNER_A_ID 미설정');
  }

  // T-08: 파트너A admin → system_logs 조회 차단
  if (tokenPA) {
    await testExpectCount('T-08', 'partner_admin system_logs 접근 차단',
      authedClient(tokenPA),
      (sb) => sb.from('system_logs').select('*'),
      0);
  } else {
    skipTest('T-08', 'partner_admin system_logs 접근 차단', 'PARTNER_A admin 자격증명 미설정');
  }

  // T-09: anon → 미발행 contents 조회 차단
  await testExpectCount('T-09', 'anon 미발행 contents 조회 차단',
    anonClient(),
    (sb) => sb.from('contents').select('*').eq('is_published', false),
    0);

  // T-10: anon → get_my_role() NULL 반환
  await testExpectNull('T-10', 'anon get_my_role() NULL 반환',
    anonClient(),
    (sb) => sb.rpc('get_my_role'));

  // ── 결과 출력 ────────────────────────────────────────────────────────────
  log.blank();
  for (const { testId, desc, status, detail } of results) {
    const badge   = status === 'PASS' ? C.green('PASS') : status === 'FAIL' ? C.red('FAIL') : C.yellow('SKIP');
    const idColor = status === 'PASS' ? C.green : status === 'FAIL' ? C.red : C.yellow;
    const detailStr = detail ? C.dim(` (${detail})`) : '';
    console.log(`  ${idColor(`[${testId}]`)} ${desc} ... ${badge}${detailStr}`);
  }

  log.blank();
  console.log('────────────────────────────────────────────────────────────');
  console.log(
    `결과: ${C.green(`${PASS} PASS`)} / ${C.red(`${FAIL} FAIL`)} / ${C.yellow(`${SKIP} SKIP`)}` +
    C.dim(`  (총 ${PASS + FAIL + SKIP}개)`)
  );
  log.blank();

  // ── JSON 리포트 저장 ────────────────────────────────────────────────────
  if (REPORT_MODE) saveReport();

  // ── 종료 코드 ────────────────────────────────────────────────────────────
  if (FAIL > 0) {
    console.log(C.red('⚠️  FAIL 감지. RLS 정책을 확인하세요.'));
    process.exit(1);
  } else if (SKIP > 0) {
    console.log(C.yellow('ℹ️  일부 테스트 SKIP. docs/exec-plans/rls-fixtures.env.example 참조.'));
  } else {
    console.log(C.green('✅ 모든 테스트 PASS'));
  }
}

main().catch((err) => {
  log.blank();
  log.error(`예기치 않은 오류: ${err.message}`);
  process.exit(1);
});
