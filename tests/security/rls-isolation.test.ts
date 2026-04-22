import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  assertLocalSupabaseUrl,
  assertSessionIntegrity,
  signIn,
  signOut,
  anonClient,
  serviceClient,
  MASTER,
  PARTNER_A,
  PARTNER_B,
  type RlsClient,
} from './rls-test-clients'

/**
 * WL-118 — RLS 격리 자동 검증 스위트
 *
 * 설계 결정 (Test Contract):
 * - Vitest 서버사이드 (Playwright 기각, RLS는 DB 레이어)
 * - Triangular Assertion: positive-control(master) / negative-control(self) / target(cross)
 * - setSession() 전용 (헤더 주입 금지) — auth.uid=JWT.sub ∧ get_my_role≠NULL 불변
 * - Shadow Data Preflight: 타겟 row 존재 + master_admin 접근 가능 사전 검증
 * - 로컬 DB 전용 (assertLocalSupabaseUrl으로 강제)
 *
 * 차단 원인 레이블:
 * - policy-deny: 정책이 명시적으로 차단
 * - no-policy: 정책 부재로 인한 0건 (WL-121/WL-122 관련)
 * - with-check-fail: WITH CHECK 절로 INSERT/UPDATE 차단
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const isLocalSupabase =
  !!SUPABASE_URL &&
  (SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1'))

describe.skipIf(!isLocalSupabase)('WL-118 — RLS 격리 자동 검증 스위트', () => {
let masterClient: RlsClient
let partnerAClient: RlsClient
let partnerBClient: RlsClient

// Shadow Data: 각 테이블의 partner-b 소속 row ID (Preflight에서 설정)
let targetContentId = ''
let targetLeadId = ''    // seed에 없으면 beforeAll에서 생성
// domain_requests: seed에 없으면 테스트는 0건 반환으로 동작

// 테스트 중 생성한 데이터 추적 (afterAll에서 정리)
let createdLeadId = ''
let createdSystemLogId = ''
let createdSystemLogIdWL123 = '' // WL-123: partner_id 기반 로그 (master 직편집 시뮬레이션)

beforeAll(async () => {
  assertLocalSupabaseUrl()

  ;[masterClient, partnerAClient, partnerBClient] = await Promise.all([
    signIn(MASTER.email, MASTER.password),
    signIn(PARTNER_A.adminEmail, PARTNER_A.adminPassword),
    signIn(PARTNER_B.adminEmail, PARTNER_B.adminPassword),
  ])

  // Shadow Data 수집: partner-b contents (trg_init_partner_defaults 트리거로 seed 시 자동 생성됨)
  const { data: contents } = await masterClient
    .from('contents')
    .select('id')
    .eq('partner_id', PARTNER_B.partnerId)
    .limit(1)
  if (contents && contents.length > 0) targetContentId = contents[0].id

  // Shadow Data 수집: partner-b leads (없으면 service_role로 생성)
  // ※ anon INSERT 미사용: leads_public_insert 정책이 로컬 DB에 미적용(드리프트)일 수 있음.
  //   setup 목적에는 service_role 사용, assertion은 반드시 session 클라이언트로만 수행.
  const { data: leads } = await masterClient
    .from('leads')
    .select('id')
    .eq('partner_id', PARTNER_B.partnerId)
    .limit(1)
  if (leads && leads.length > 0) {
    targetLeadId = leads[0].id
  } else {
    const svc = serviceClient()
    const { data: inserted } = await svc
      .from('leads')
      .insert({
        partner_id: PARTNER_B.partnerId,
        customer_name: '[WL-118 test]',
        email: 'rls-test-wl118@test.local',
      })
      .select('id')
      .single()
    if (inserted) {
      targetLeadId = inserted.id
      createdLeadId = inserted.id
    }
  }

  // domain_requests: seed 데이터 없으면 테스트는 0건 반환으로 동작

  // WL-121: system_logs Triangular 데이터 — partner-b impersonation 로그 생성
  const svc = serviceClient()
  const { data: sysLog } = await svc
    .from('system_logs')
    .insert({
      actor_id: MASTER.id,
      on_behalf_of: PARTNER_B.partnerId,
      action: 'impersonate_start',
    })
    .select('id')
    .single()
  if (sysLog) createdSystemLogId = sysLog.id

  // WL-123: partner_id 기반 로그 — master_admin 직편집 시뮬레이션 (on_behalf_of 없이 partner_id만)
  const { data: sysLogWL123 } = await svc
    .from('system_logs')
    .insert({
      actor_id: MASTER.id,
      partner_id: PARTNER_B.partnerId,
      action: 'partner.update',
      target_table: 'partners',
      target_id: PARTNER_B.partnerId,
    })
    .select('id')
    .single()
  if (sysLogWL123) createdSystemLogIdWL123 = sysLogWL123.id
})

afterAll(async () => {
  // 테스트 중 생성한 데이터 정리
  if (createdLeadId) {
    await masterClient.from('leads').delete().eq('id', createdLeadId)
  }
  if (createdSystemLogId) {
    const svc = serviceClient()
    await svc.from('system_logs').delete().eq('id', createdSystemLogId)
  }
  if (createdSystemLogIdWL123) {
    const svc = serviceClient()
    await svc.from('system_logs').delete().eq('id', createdSystemLogIdWL123)
  }
  await Promise.all([
    signOut(masterClient),
    signOut(partnerAClient),
    signOut(partnerBClient),
  ])
})


// =============================================================================
// 1. Shadow Data Preflight
// =============================================================================
describe('Shadow Data Preflight — partner-b에 타겟 row 존재 + master_admin 접근 가능 (suite abort 가드)', () => {
  it('master_admin이 partner-b contents를 1건 이상 조회할 수 있다', () => {
    expect(targetContentId).not.toBe('')
  })

  it('master_admin이 partner-b leads를 확보했다 (seed 또는 테스트 생성)', () => {
    expect(targetLeadId).not.toBe('')
  })
})


// =============================================================================
// 2. Session 정합성 self-check
// =============================================================================
describe('Session 정합성 self-check — auth.uid()=JWT.sub ∧ get_my_role()≠NULL', () => {
  it('master_admin 세션 정합성 통과', async () => {
    await expect(assertSessionIntegrity(masterClient, MASTER.id)).resolves.toBeUndefined()
  })

  it('partner-a admin 세션 정합성 통과', async () => {
    await expect(assertSessionIntegrity(partnerAClient, PARTNER_A.adminId)).resolves.toBeUndefined()
  })

  it('partner-b admin 세션 정합성 통과', async () => {
    await expect(assertSessionIntegrity(partnerBClient, PARTNER_B.adminId)).resolves.toBeUndefined()
  })
})


// =============================================================================
// 3. RLS 격리 — contents
// =============================================================================
describe('RLS 격리 — contents (Triangular × Read/WriteInject/UpdateHijack/Delete)', () => {
  // ── Read ──────────────────────────────────────────────────────────────────
  it('[positive-control] master_admin은 partner-b contents를 SELECT할 수 있다', async () => {
    const { data, error } = await masterClient
      .from('contents')
      .select('id')
      .eq('partner_id', PARTNER_B.partnerId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('[negative-control] partner-b admin은 자신의 contents를 SELECT할 수 있다', async () => {
    const { data, error } = await partnerBClient
      .from('contents')
      .select('id')
      .eq('partner_id', PARTNER_B.partnerId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('[target / policy-deny] partner-a admin은 partner-b contents를 SELECT할 수 없다', async () => {
    const { data, error } = await partnerAClient
      .from('contents')
      .select('id')
      .eq('partner_id', PARTNER_B.partnerId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  // ── Write Inject ──────────────────────────────────────────────────────────
  it('[with-check-fail] partner-a admin은 partner-b contents에 INSERT할 수 없다', async () => {
    const { error } = await partnerAClient
      .from('contents')
      .insert({ partner_id: PARTNER_B.partnerId, section_type: 'hero' })
    // WITH CHECK 명시 선언으로 차단 (WL-122) — role check + partner_id sub-select 이중 검증
    expect(error).not.toBeNull()
  })

  // ── Update Hijack ─────────────────────────────────────────────────────────
  it('[policy-deny] partner-a admin은 partner-b content row를 UPDATE할 수 없다 (0 affected)', async () => {
    const { data, error } = await partnerAClient
      .from('contents')
      .update({ is_published: false })
      .eq('id', targetContentId)
      .select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(0) // RLS가 row를 필터링하여 0건 업데이트
  })

  // ── Delete ────────────────────────────────────────────────────────────────
  it('[policy-deny] partner-a admin은 partner-b content row를 DELETE할 수 없다 (0 affected)', async () => {
    const { data, error } = await partnerAClient
      .from('contents')
      .delete()
      .eq('id', targetContentId)
      .select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})


// =============================================================================
// 4. RLS 격리 — leads
// =============================================================================
describe('RLS 격리 — leads (Triangular × Read/WriteInject/UpdateHijack)', () => {
  it('[design-intent] master_admin도 leads 직접 SELECT 불가 (leads_masked_view 경유 필수)', async () => {
    // 설계 결정: master_admin은 leads 테이블 직접 접근 정책 없음 (PII 마스킹 강제).
    // 반드시 leads_masked_view를 통해서만 조회 가능.
    const { data } = await masterClient
      .from('leads')
      .select('id')
      .eq('partner_id', PARTNER_B.partnerId)
    expect(data).toHaveLength(0) // 정책 없음 = 0건 (에러 없이 빈 배열)
  })

  it('[positive-control] partner-b admin은 자신의 leads를 SELECT할 수 있다 (data exists proof)', async () => {
    const { data, error } = await partnerBClient
      .from('leads')
      .select('id')
      .eq('partner_id', PARTNER_B.partnerId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('[target / policy-deny] partner-a admin은 partner-b leads를 SELECT할 수 없다', async () => {
    const { data, error } = await partnerAClient
      .from('leads')
      .select('id')
      .eq('partner_id', PARTNER_B.partnerId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[no-policy] partner-a admin은 partner-b leads에 INSERT할 수 없다 (authenticated INSERT 정책 없음)', async () => {
    // leads INSERT 정책은 anon 전용(leads_public_insert). authenticated는 INSERT 정책 없음.
    const { error } = await partnerAClient
      .from('leads')
      .insert({ partner_id: PARTNER_B.partnerId, customer_name: 'inject', email: 'x@x.com' })
    expect(error).not.toBeNull()
  })

  it('[policy-deny] partner-a admin은 partner-b lead를 UPDATE할 수 없다 (0 affected)', async () => {
    const { data, error } = await partnerAClient
      .from('leads')
      .update({ status: 'contacted' })
      .eq('id', targetLeadId)
      .select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})


// =============================================================================
// 5. RLS 격리 — partners
// =============================================================================
describe('RLS 격리 — partners (Triangular × Read/UpdateHijack, INSERT는 R-DI-2 제외)', () => {
  it('[positive-control] master_admin은 partner-b row를 SELECT할 수 있다', async () => {
    const { data, error } = await masterClient
      .from('partners')
      .select('id')
      .eq('id', PARTNER_B.partnerId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('[negative-control] partner-b admin은 자신의 partner row를 SELECT할 수 있다', async () => {
    const { data, error } = await partnerBClient
      .from('partners')
      .select('id')
      .eq('id', PARTNER_B.partnerId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('[target / policy-deny] partner-a admin은 partner-b row를 SELECT할 수 없다', async () => {
    const { data, error } = await partnerAClient
      .from('partners')
      .select('id')
      .eq('id', PARTNER_B.partnerId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[no-policy] partner-a admin은 partner-b row를 UPDATE할 수 없다 (partner_admin UPDATE 정책 없음)', async () => {
    // partners_partner_admin_select는 FOR SELECT 전용. UPDATE 정책 없어 0 affected.
    const { data, error } = await partnerAClient
      .from('partners')
      .update({ theme_key: 'injected' })
      .eq('id', PARTNER_B.partnerId)
      .select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})


// =============================================================================
// 6. RLS 격리 — domain_requests
// =============================================================================
describe('RLS 격리 — domain_requests (Triangular × Read)', () => {
  it('[positive-control] master_admin은 partner-b domain_requests를 SELECT할 수 있다', async () => {
    const { data, error } = await masterClient
      .from('domain_requests')
      .select('id')
      .eq('partner_id', PARTNER_B.partnerId)
    expect(error).toBeNull()
    // seed에 없으면 0건 — data 자체가 반환됨을 확인 (error 없음이 핵심)
    expect(Array.isArray(data)).toBe(true)
  })

  it('[target] partner-a admin은 partner-b domain_requests를 SELECT할 수 없다', async () => {
    const { data, error } = await partnerAClient
      .from('domain_requests')
      .select('id')
      .eq('partner_id', PARTNER_B.partnerId)
    // domain_requests RLS 정책 미정의 여부에 따라 결과가 달라짐:
    // RLS 미적용: data 반환 → 테스트 실패로 보안 취약점 노출
    // RLS 적용: data = [] → 격리 확인
    expect(error).toBeNull()
    expect(data).toHaveLength(0) // RLS가 없으면 이 assertion이 실패하여 취약점 노출
  })
})


// =============================================================================
// 7. Triangular — system_logs (WL-121 완료)
// =============================================================================
describe('Triangular — system_logs partner_admin SELECT (WL-121)', () => {
  it('[positive-control] partner-b admin은 자기 파트너 impersonation 로그를 SELECT할 수 있다', async () => {
    // createdSystemLogId: on_behalf_of = PARTNER_B.partnerId 로 beforeAll에서 생성
    expect(createdSystemLogId).not.toBe('')
    const { data, error } = await partnerBClient
      .from('system_logs')
      .select('id')
      .eq('on_behalf_of', PARTNER_B.partnerId)
      .limit(5)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('[negative-control] partner-a admin은 partner-b의 system_logs를 SELECT할 수 없다', async () => {
    const { data, error } = await partnerAClient
      .from('system_logs')
      .select('id')
      .eq('on_behalf_of', PARTNER_B.partnerId)
      .limit(5)
    expect(error).toBeNull()
    expect(data).toHaveLength(0) // policy-deny: 타 파트너 로그 격리
  })

  it('[target-isolation] partner-b admin은 특정 logId를 정확히 반환한다', async () => {
    const { data, error } = await partnerBClient
      .from('system_logs')
      .select('id')
      .eq('id', createdSystemLogId)
      .single()
    expect(error).toBeNull()
    expect(data!.id).toBe(createdSystemLogId)
  })

  it('[master-access] master_admin은 system_logs 전체를 SELECT할 수 있다', async () => {
    const { data, error } = await masterClient
      .from('system_logs')
      .select('id')
      .limit(5)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})


// =============================================================================
// 7.1. Triangular — system_logs partner_id 기반 (WL-123)
// =============================================================================
describe('Triangular — system_logs partner_id (WL-123)', () => {
  it('[positive-control] partner-b admin은 master 직편집 로그(partner_id 매칭)를 SELECT할 수 있다', async () => {
    expect(createdSystemLogIdWL123).not.toBe('')
    const { data, error } = await partnerBClient
      .from('system_logs')
      .select('id')
      .eq('partner_id', PARTNER_B.partnerId)
      .limit(5)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('[negative-control] partner-a admin은 partner-b의 partner_id 로그를 SELECT할 수 없다', async () => {
    const { data, error } = await partnerAClient
      .from('system_logs')
      .select('id')
      .eq('partner_id', PARTNER_B.partnerId)
      .limit(5)
    expect(error).toBeNull()
    expect(data).toHaveLength(0) // policy-deny: RLS 화이트리스트 격리
  })

  it('[target-isolation] partner-b admin은 WL-123 logId를 정확히 반환한다', async () => {
    const { data, error } = await partnerBClient
      .from('system_logs')
      .select('id')
      .eq('id', createdSystemLogIdWL123)
      .single()
    expect(error).toBeNull()
    expect(data!.id).toBe(createdSystemLogIdWL123)
  })
})


// =============================================================================
// 8. Unauthenticated 접근 차단
// =============================================================================
describe('Unauthenticated 접근 차단 — 5개 테이블 전체에 대해 anon 세션 SELECT/INSERT 시도', () => {
  it('anon은 contents에서 미발행(is_published=false) 콘텐츠를 SELECT할 수 없다', async () => {
    const anon = anonClient()
    const { data } = await anon
      .from('contents')
      .select('id')
      .eq('is_published', false)
    expect(data).toHaveLength(0) // contents_public_anon_read: is_published=true만 허용
  })

  it('anon은 leads를 SELECT할 수 없다', async () => {
    const anon = anonClient()
    const { data, error } = await anon
      .from('leads')
      .select('id')
      .limit(1)
    expect(error).toBeNull()
    expect(data).toHaveLength(0) // 정책 없음 = 0건
  })

  it('anon은 partners에서 비활성 파트너를 SELECT할 수 없다', async () => {
    const anon = anonClient()
    const { data } = await anon
      .from('partners')
      .select('id')
      .eq('is_active', false)
    expect(data).toHaveLength(0) // partners_public_anon_read: is_active=true만 허용
  })

  it('anon은 system_logs를 SELECT할 수 없다', async () => {
    const anon = anonClient()
    const { data, error } = await anon
      .from('system_logs')
      .select('id')
      .limit(1)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('anon은 contents에 INSERT할 수 없다 (authenticated 전용 정책)', async () => {
    const anon = anonClient()
    // contents INSERT 정책은 authenticated 전용(master_admin/partner_admin).
    // anon은 어떤 partner_id로도 INSERT 불가.
    const { error } = await anon
      .from('contents')
      .insert({ partner_id: PARTNER_A.partnerId, section_type: 'hero' })
    expect(error).not.toBeNull() // RLS 42501
  })
})


// =============================================================================
// 9. 정책 OR 결합 교차 검증
// =============================================================================
describe('정책 OR 결합 교차 검증 — partner_admin 세션 SELECT 결과가 전부 자기 partner_id', () => {
  it('partner-a admin의 contents SELECT 결과에 partner-b rows가 없다', async () => {
    const { data, error } = await partnerAClient
      .from('contents')
      .select('partner_id')
    expect(error).toBeNull()
    const leaked = data?.filter((row) => row.partner_id === PARTNER_B.partnerId)
    expect(leaked).toHaveLength(0)
  })

  it('partner-a admin의 leads SELECT 결과에 partner-b rows가 없다', async () => {
    const { data, error } = await partnerAClient
      .from('leads')
      .select('partner_id')
    expect(error).toBeNull()
    const leaked = data?.filter((row) => row.partner_id === PARTNER_B.partnerId)
    expect(leaked).toHaveLength(0)
  })

  it('partner-a admin의 partners SELECT 결과에 partner-b row가 없다', async () => {
    const { data, error } = await partnerAClient
      .from('partners')
      .select('id')
    expect(error).toBeNull()
    const leaked = data?.filter((row) => row.id === PARTNER_B.partnerId)
    expect(leaked).toHaveLength(0)
  })
})


// =============================================================================
// 10. leads_masked_view — 마스킹 접근 제어 검증 (WL-138 Scenario C)
// =============================================================================
describe('leads_masked_view — 마스킹 접근 제어 검증 (WL-138 Scenario C / WL-153)', () => {
  it('[access-control] partner_admin은 leads_masked_view를 조회할 수 없다 (0건)', async () => {
    // security_invoker=false(WL-153) 하에서도 동일:
    //   뷰 내부 WHERE EXISTS(role='master_admin') 필터가 partner_admin을 차단 → 0건
    const { data, error } = await partnerAClient
      .from('leads_masked_view')
      .select('email')
      .limit(5)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('[intended-design / WL-153] master_admin은 leads_masked_view에서 마스킹된 이메일(***@domain)을 조회할 수 있다', async () => {
    // WL-153으로 DEBT-007 Issue 1 해소:
    //   security_invoker=false → 뷰가 postgres superuser 권한으로 실행
    //   → leads 테이블 직접 접근 가능
    //   → WHERE EXISTS(role='master_admin')이 access control 담당
    //   → master_admin 세션에서 마스킹된 데이터 반환
    const { data, error } = await masterClient
      .from('leads_masked_view')
      .select('email')
      .eq('partner_id', PARTNER_B.partnerId)
      .limit(1)
    expect(error).toBeNull()
    expect(data).not.toHaveLength(0)
    // 이메일 로컬 파트가 '*' 로 치환되고 @domain 만 남음을 검증
    expect(data![0].email).toMatch(/^\*+@/)
  })
})


// =============================================================================
// 11. anon 크로스 테넌트 INSERT — RLS 갭 문서화 (WL-138 Scenario B / DEBT-007)
// =============================================================================
describe('anon 크로스 테넌트 INSERT — RLS 갭 문서화 (DEBT-007)', () => {
  let crossInsertedLeadId = ''

  afterAll(async () => {
    if (crossInsertedLeadId) {
      const svc = serviceClient()
      await svc.from('leads').delete().eq('id', crossInsertedLeadId)
    }
  })

  it('[rls-gap / DEBT-007] anon의 타 파트너 UUID로 leads INSERT: 로컬(드리프트) 차단 / 프로덕션(정책 적용) 허용 — 설계 갭 문서화', async () => {
    // ⚠️ DEBT-007 설계 갭:
    //   leads_public_insert: WITH CHECK (partner_id IN (SELECT id FROM partners WHERE is_active=true))
    //   is_active=true인 모든 파트너 UUID를 허용 → host 컨텍스트 검증 없음.
    //   프로덕션에서 정책이 적용된 경우 → Server Action 우회 시 cross-tenant INSERT 성공 가능.
    //   방어선: submitLead Server Action이 host 헤더에서 partner_id를 강제 도출함.
    //
    // 로컬 DB 주의: leads_public_insert 정책이 drift로 미적용되거나 partner-b가
    //   is_active=false인 경우 INSERT가 차단됨(RLS violation). 두 결과 모두 유효하게 처리.
    const anon = anonClient()
    const { data, error } = await anon
      .from('leads')
      .insert({
        partner_id: PARTNER_B.partnerId,
        customer_name: '[DEBT-007 gap test]',
        email: `debt-007-gap-${Date.now()}@test.local`,
      })
      .select('id')
      .single()

    if (error) {
      // 로컬 드리프트 또는 partner-b 비활성: INSERT 차단 (로컬은 안전)
      expect(error.message).toMatch(/row-level security|violates/)
    } else {
      // 프로덕션 환경: INSERT 성공 = DEBT-007 갭 실존 확인
      expect(data).toBeDefined()
      if (data) crossInsertedLeadId = data.id
    }
  })
})
}) // describe.skipIf(!isLocalSupabase)
