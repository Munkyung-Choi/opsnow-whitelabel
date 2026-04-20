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
 * GoTrue에서 이메일로 사용자 ID를 찾는다. listUsers를 전 페이지 순회.
 * deleteUser가 소프트 삭제 또는 FK 제약으로 실패하는 경우에 대비해
 * "삭제 후 재생성" 대신 "생성 또는 패스워드 리셋"으로 ID를 확보한다.
 */
async function findUserIdByEmail(
  admin: AdminClient,
  email: string
): Promise<string | null> {
  let page = 1
  while (true) {
    const {
      data: { users },
    } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    const found = users.find((u) => u.email === email)
    if (found) return found.id
    if (users.length < 1000) break
    page++
  }
  return null
}

/**
 * 사용자를 생성하거나, 이미 존재하면 비밀번호를 재설정하여 ID를 반환한다.
 *
 * 배경: deleteUser가 성공 응답을 반환해도 GoTrue 레벨에서 소프트 삭제되거나
 * FK 제약으로 실제 행이 남아 있는 경우 createUser가 "already registered"로
 * 실패한다. 삭제 기반 멱등성은 이 케이스에서 불안정하므로 upsert 패턴으로
 * 전환한다.
 */
async function ensureUser(
  admin: AdminClient,
  email: string,
  password: string
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (!error && data.user) {
    return data.user.id
  }

  if (!error?.message.includes('already been registered')) {
    throw new Error(`[ensureUser] ${email} 생성 실패: ${error?.message}`)
  }

  // "already registered" — 기존 유저의 ID를 찾아 패스워드만 재설정
  console.warn(`[ensureUser] ${email} 이미 존재 — ID 탐색 후 password 리셋`)
  const existingId = await findUserIdByEmail(admin, email)
  if (!existingId) {
    throw new Error(
      `[ensureUser] ${email}: createUser "already registered"이나 listUsers에서도 찾지 못함 — 수동 확인 필요`
    )
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(existingId, {
    password,
    email_confirm: true,
  })
  if (updateError) {
    throw new Error(`[ensureUser] ${email} password 리셋 실패: ${updateError.message}`)
  }

  return existingId
}

/**
 * 테스트 auth 유저의 연관 데이터(FK 참조)를 정리한다.
 * auth.users 자체는 삭제하지 않는다.
 *
 * 이유: GoTrue auth.admin.deleteUser()는 소프트 삭제를 수행한다.
 * 소프트 삭제된 유저는 listUsers에서 보이지 않지만 이메일은 계속 "점유"
 * 상태로 남아 다음 createUser 시 "already registered" 오류를 유발한다.
 * auth 유저는 CI 사이에 재사용(ensureUser)하고 연관 데이터만 초기화한다.
 *
 * 정리 대상:
 *   - global_contents.updated_by → SET NULL (ON DELETE RESTRICT)
 *   - system_logs.actor_id       → DELETE
 *   - partners.owner_id          → DELETE
 *   - profiles.id                → DELETE (ON DELETE CASCADE이나 명시 정리)
 */
async function purgeTestUsers(admin: AdminClient): Promise<void> {
  const testEmails = [
    TEST_ADMIN_CREDENTIALS.master.email,
    TEST_ADMIN_CREDENTIALS.partner.email,
  ]

  // 소속 파트너를 subdomain 기준으로도 정리 (owner_id가 이미 사라진 고아 파트너 대응)
  await admin.from('partners').delete().eq('subdomain', TEST_ADMIN_PARTNER_SLUG)

  // listUsers는 페이지네이션 API. 전 페이지를 순회해 테스트 유저 ID를 수집한다.
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

  if (testUserIds.length === 0) return

  // FK 참조를 역순으로 정리 — 각 단계 에러를 명시적으로 검증한다
  const { error: gcErr } = await admin
    .from('global_contents')
    .update({ updated_by: null })
    .in('updated_by', testUserIds)
  if (gcErr) throw new Error(`[purgeTestUsers] global_contents 정리 실패: ${gcErr.message}`)

  const { error: logErr } = await admin.from('system_logs').delete().in('actor_id', testUserIds)
  if (logErr) throw new Error(`[purgeTestUsers] system_logs 정리 실패: ${logErr.message}`)

  const { error: partnerErr } = await admin.from('partners').delete().in('owner_id', testUserIds)
  if (partnerErr) throw new Error(`[purgeTestUsers] partners 정리 실패: ${partnerErr.message}`)

  const { error: profileErr } = await admin.from('profiles').delete().in('id', testUserIds)
  if (profileErr) throw new Error(`[purgeTestUsers] profiles 정리 실패: ${profileErr.message}`)

  // auth.users 삭제 생략 — GoTrue 소프트 삭제 회피. ensureUser가 재사용 처리.
}

/**
 * E2E Admin 테스트용 사용자 seed.
 *
 * - master_admin: 파트너 없음, 전체 관리 권한
 * - partner_admin: partner-e2e-admin 소속, 자신 파트너만 관리
 *
 * 멱등성: ensureUser(create-or-update) + profiles upsert로 보장.
 * purgeTestUsers가 선행하지만, deleteUser가 실패해도 ensureUser가 복구한다.
 */
export async function seedAdminTestUsers(): Promise<void> {
  const admin = createAdminClient()

  // ── Step 1: 기존 테스트 사용자 삭제 시도 (best-effort) ─────────────────────
  await purgeTestUsers(admin)

  // ── Step 2: master_admin 사용자 생성 (또는 기존 유저 재활용) ───────────────
  const masterId = await ensureUser(
    admin,
    TEST_ADMIN_CREDENTIALS.master.email,
    TEST_ADMIN_CREDENTIALS.master.password
  )

  await admin.from('profiles').upsert({
    id: masterId,
    role: 'master_admin',
    partner_id: null,
  })

  // ── Step 3: partner_admin 사용자 + 전용 파트너 생성 ──────────────────────
  const partnerId = await ensureUser(
    admin,
    TEST_ADMIN_CREDENTIALS.partner.email,
    TEST_ADMIN_CREDENTIALS.partner.password
  )

  const { data: e2ePartner, error: partnerError } = await admin
    .from('partners')
    .insert({
      business_name: 'E2E Admin Test Partner',
      subdomain: TEST_ADMIN_PARTNER_SLUG,
      owner_id: partnerId,
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

  await admin.from('profiles').upsert({
    id: partnerId,
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
