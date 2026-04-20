import { createAdminClient } from './supabase-admin'

export const TEST_ADMIN_CREDENTIALS = {
  master: {
    email: 'master-admin-e2e@test.local',
    password: 'MasterTest-E2E-2026!',
  },
  partner: {
    email: 'partner-admin-e2e@test.local',
    password: 'PartnerTest-E2E-2026!',
  },
} as const

export const TEST_ADMIN_PARTNER_SLUG = 'partner-e2e-admin'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * auth.users에 걸린 모든 FK 참조를 먼저 정리한 뒤 auth 유저를 삭제한다.
 * 참조 체인:
 *   - profiles.id          → auth.users.id
 *   - system_logs.actor_id → auth.users.id  (impersonation 테스트가 로그 기록)
 *   - partners.owner_id    → auth.users.id
 *
 * deleteUser 결과를 검증하여 실패 시 즉시 throw (silently failing 방지).
 */
async function purgeTestUsers(admin: AdminClient): Promise<void> {
  const testEmails = [
    TEST_ADMIN_CREDENTIALS.master.email,
    TEST_ADMIN_CREDENTIALS.partner.email,
  ]

  // listUsers is paginated (default 50/page). Paginate until all users are scanned.
  const testUserIds: string[] = []
  let page = 1
  while (true) {
    const {
      data: { users },
    } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    for (const u of users) {
      if (u.email && testEmails.includes(u.email)) testUserIds.push(u.id)
    }
    if (users.length < 1000) break
    page++
  }

  // 소속 파트너를 subdomain 기준으로도 정리 (owner_id가 이미 사라진 고아 파트너 대응)
  await admin.from('partners').delete().eq('subdomain', TEST_ADMIN_PARTNER_SLUG)

  if (testUserIds.length === 0) return

  // FK 참조를 역순으로 정리
  await admin.from('system_logs').delete().in('actor_id', testUserIds)
  await admin.from('partners').delete().in('owner_id', testUserIds)
  await admin.from('profiles').delete().in('id', testUserIds)

  for (const id of testUserIds) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) {
      throw new Error(
        `[purgeTestUsers] auth 유저 삭제 실패 (id=${id}): ${error.message}`
      )
    }
  }
}

/**
 * E2E Admin 테스트용 사용자 seed.
 *
 * - master_admin: 파트너 없음, 전체 관리 권한
 * - partner_admin: partner-e2e-admin 소속, 자신 파트너만 관리
 *
 * 멱등성: 기존 테스트 사용자 삭제 후 재생성
 */
export async function seedAdminTestUsers(): Promise<void> {
  const admin = createAdminClient()

  // ── Step 1: 기존 테스트 사용자 삭제 (재실행 안전) ─────────────────────────
  await purgeTestUsers(admin)

  // ── Step 2: master_admin 사용자 생성 ─────────────────────────────────────
  const { data: masterData, error: masterError } =
    await admin.auth.admin.createUser({
      email: TEST_ADMIN_CREDENTIALS.master.email,
      password: TEST_ADMIN_CREDENTIALS.master.password,
      email_confirm: true,
    })

  if (masterError || !masterData.user) {
    throw new Error(`[seedAdminTestUsers] master_admin 생성 실패: ${masterError?.message}`)
  }

  await admin.from('profiles').insert({
    id: masterData.user.id,
    role: 'master_admin',
    partner_id: null,
  })

  // ── Step 3: partner_admin 사용자 + 전용 파트너 생성 ──────────────────────
  const { data: partnerUserData, error: partnerUserError } =
    await admin.auth.admin.createUser({
      email: TEST_ADMIN_CREDENTIALS.partner.email,
      password: TEST_ADMIN_CREDENTIALS.partner.password,
      email_confirm: true,
    })

  if (partnerUserError || !partnerUserData.user) {
    throw new Error(
      `[seedAdminTestUsers] partner_admin 생성 실패: ${partnerUserError?.message}`
    )
  }

  const { data: e2ePartner, error: partnerError } = await admin
    .from('partners')
    .insert({
      business_name: 'E2E Admin Test Partner',
      subdomain: TEST_ADMIN_PARTNER_SLUG,
      owner_id: partnerUserData.user.id,
      default_locale: 'ko',
      published_locales: ['ko'],
      is_active: true,
      notification_emails: [],
    })
    .select('id')
    .single()

  if (partnerError || !e2ePartner) {
    throw new Error(
      `[seedAdminTestUsers] e2e 파트너 생성 실패: ${partnerError?.message}`
    )
  }

  await admin.from('profiles').insert({
    id: partnerUserData.user.id,
    role: 'partner_admin',
    partner_id: e2ePartner.id,
  })

  console.log('[globalSetup] Admin 테스트 사용자 2명 seed 완료')
}

/** E2E Admin 테스트 사용자 및 파트너 삭제 */
export async function cleanupAdminTestUsers(): Promise<void> {
  const admin = createAdminClient()
  await purgeTestUsers(admin)
  console.log('[globalTeardown] Admin 테스트 사용자 cleanup 완료')
}
