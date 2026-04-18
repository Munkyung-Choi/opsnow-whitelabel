/**
 * WL-118 — RLS 테스트용 authenticated Supabase client 헬퍼
 *
 * Impl 단계에서 구현 예정:
 * - authenticatedClient(email, password): signInWithPassword → setSession() → client 반환
 *   * 헤더 주입 방식 금지 — auth.uid() NULL fallback 위험 (R-SM-1)
 * - sessionSelfCheck(client, expected): auth.uid() + get_my_role() RPC 호출하여 기대값과 일치 검증
 *   * 불일치 시 throw — 거짓 양성 원천 차단
 * - serviceRoleClient(): preflight용 RLS 우회 클라이언트 (row 존재 확인)
 * - assertLocalSupabaseUrl(): SUPABASE_URL이 localhost/127.0.0.1이 아니면 throw
 *   * 프로덕션 DB에 테스트 실행 방지 (admin 계정 비밀번호 노출 위험)
 */

export function authenticatedClient(_email: string, _password: string): never {
  throw new Error('WL-118 Impl 단계에서 구현 예정 — setSession() 경로');
}

export function sessionSelfCheck(): never {
  throw new Error('WL-118 Impl 단계에서 구현 예정 — auth.uid/get_my_role 검증');
}

export function serviceRoleClient(): never {
  throw new Error('WL-118 Impl 단계에서 구현 예정 — preflight용 RLS 우회');
}

export function assertLocalSupabaseUrl(): never {
  throw new Error('WL-118 Impl 단계에서 구현 예정 — 로컬 DB 전용 가드');
}
