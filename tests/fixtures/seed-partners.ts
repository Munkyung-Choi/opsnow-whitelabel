import { createAdminClient } from './supabase-admin';

/**
 * E2E 테스트 픽스처 파트너 3종 정의
 *
 * S2: partner-test-hidden       — stats 섹션 is_visible=false
 * S3: partner-test-null-title   — stats 섹션 contents.title=null
 * S4: partner-test-empty-contents — contents rows 없음 → DEFAULT 데이터 폴백
 *
 * 중요: DB에 `trg_init_partner_defaults` 트리거가 존재하여 partners INSERT 시
 *       partner_sections(8개) + contents(11개)를 자동 생성한다.
 *       따라서 INSERT 후 UPDATE/DELETE로 원하는 상태를 만든다.
 *
 * 격리 원칙:
 *   - subdomain 프리픽스 'partner-test-*'로 prod 파트너와 물리적 분리
 *   - ON DELETE CASCADE: partners 삭제 시 partner_sections, contents 자동 삭제
 *   - 멱등성: globalSetup에서 cleanup → seed 순으로 호출 (재실행 안전)
 */

// partner-a의 owner_id 재사용 — auth.users FK 제약 충족용
// (auth.users에 실제 존재하는 ID; seed.sql 기준)
const TEST_OWNER_ID = '6adb5034-0a0e-4f60-bbd3-b1286a071473';

export const TEST_PARTNER_SLUGS = {
  hidden: 'partner-test-hidden',
  nullTitle: 'partner-test-null-title',
  emptyContents: 'partner-test-empty-contents',
} as const;

/** DB에 테스트 픽스처 파트너 3종을 삽입한다 */
export async function seedTestPartners(): Promise<void> {
  const admin = createAdminClient();

  // ── Step 1: partners 3종 삽입 ─────────────────────────────────────────────
  // 삽입 시 trg_init_partner_defaults 트리거가 자동 실행됨:
  //   - partner_sections 8개 (is_visible=true)
  //   - contents 11개 (마케팅 8개 is_published=true + 법적 고지 3개 is_published=false)
  const { data: insertedPartners, error: insertError } = await admin
    .from('partners')
    .insert([
      {
        business_name: 'TestHidden',
        subdomain: TEST_PARTNER_SLUGS.hidden,
        owner_id: TEST_OWNER_ID,
        theme_key: 'blue',
        default_locale: 'ko',
        published_locales: ['ko'],
        is_active: true,
        notification_emails: [],
      },
      {
        business_name: 'TestNullTitle',
        subdomain: TEST_PARTNER_SLUGS.nullTitle,
        owner_id: TEST_OWNER_ID,
        theme_key: 'blue',
        default_locale: 'ko',
        published_locales: ['ko'],
        is_active: true,
        notification_emails: [],
      },
      {
        business_name: 'TestEmptyContents',
        subdomain: TEST_PARTNER_SLUGS.emptyContents,
        owner_id: TEST_OWNER_ID,
        theme_key: 'blue',
        default_locale: 'ko',
        published_locales: ['ko'],
        is_active: true,
        notification_emails: [],
      },
    ])
    .select('id, subdomain');

  if (insertError) {
    throw new Error(`[seedTestPartners] partners 삽입 실패: ${insertError.message}`);
  }
  if (!insertedPartners || insertedPartners.length !== 3) {
    throw new Error(
      `[seedTestPartners] partners 3개 삽입 기대, 실제: ${insertedPartners?.length ?? 0}`,
    );
  }

  const hiddenId = insertedPartners.find(
    (p) => p.subdomain === TEST_PARTNER_SLUGS.hidden,
  )!.id;
  const nullTitleId = insertedPartners.find(
    (p) => p.subdomain === TEST_PARTNER_SLUGS.nullTitle,
  )!.id;
  const emptyContentsId = insertedPartners.find(
    (p) => p.subdomain === TEST_PARTNER_SLUGS.emptyContents,
  )!.id;

  // ── Step 2: partner-test-hidden — stats 섹션 is_visible=false로 업데이트 ───
  // 트리거가 생성한 stats 행을 service_role로 UPDATE
  const { error: hiddenUpdateError } = await admin
    .from('partner_sections')
    .update({ is_visible: false })
    .eq('partner_id', hiddenId)
    .eq('section_type', 'stats');

  if (hiddenUpdateError) {
    throw new Error(
      `[seedTestPartners] hidden stats is_visible 업데이트 실패: ${hiddenUpdateError.message}`,
    );
  }

  // ── Step 3: partner-test-null-title — stats contents.title=null로 업데이트 ─
  // 트리거가 생성한 stats 콘텐츠의 title을 null로 업데이트
  const { error: nullTitleUpdateError } = await admin
    .from('contents')
    .update({ title: null })
    .eq('partner_id', nullTitleId)
    .eq('section_type', 'stats');

  if (nullTitleUpdateError) {
    throw new Error(
      `[seedTestPartners] null-title stats title 업데이트 실패: ${nullTitleUpdateError.message}`,
    );
  }

  // ── Step 4: partner-test-empty-contents — 모든 contents 행 삭제 ────────────
  // partner_sections는 유지 (DEFAULT_SECTIONS 대신 트리거 생성 sections 사용 — 동일 효과)
  // contents가 없으므로 각 섹션은 DEFAULT_* 폴백 데이터를 사용함
  const { error: emptyDeleteError } = await admin
    .from('contents')
    .delete()
    .eq('partner_id', emptyContentsId);

  if (emptyDeleteError) {
    throw new Error(
      `[seedTestPartners] empty-contents 삭제 실패: ${emptyDeleteError.message}`,
    );
  }

  console.log('[globalSetup] 테스트 파트너 3종 seed 완료');
}

/** DB에서 테스트 픽스처 파트너를 모두 삭제한다 (ON DELETE CASCADE → 관련 rows 자동 삭제) */
export async function cleanupTestPartners(): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('partners')
    .delete()
    .like('subdomain', 'partner-test-%');

  if (error) {
    // cleanup 실패는 경고만 — teardown 실패가 테스트 결과를 오염시키지 않도록
    console.warn(`[globalTeardown] 테스트 파트너 cleanup 실패: ${error.message}`);
  } else {
    console.log('[globalTeardown] 테스트 파트너 cleanup 완료');
  }
}
