import { describe } from 'vitest';

/**
 * WL-118 — RLS 격리 자동 검증 스위트
 *
 * 설계 결정 (Test Contract):
 * - Vitest 서버사이드 (Playwright 기각, RLS는 DB 레이어)
 * - Triangular Assertion: positive-control(master) / negative-control(self) / target(cross)
 * - setSession() 전용 (헤더 주입 금지) — auth.uid=JWT.sub ∧ get_my_role≠NULL 불변
 * - Shadow Data Preflight: 타겟 row 존재 + master_admin 접근 가능 사전 검증
 * - 로컬 DB 전용 (SUPABASE_URL이 localhost/127.0.0.1이 아니면 globalSetup에서 throw)
 *
 * 연관 티켓:
 * - WL-121: system_logs partner_admin_select_own 정책 추가 (해결 전까지 baseline 기록)
 * - WL-122: contents_partner_admin_write WITH CHECK 명시 (해결 전까지 defense-in-depth 공백)
 *
 * 차단 원인 레이블:
 * - policy-deny: 정책이 명시적으로 차단
 * - no-policy: 정책 부재로 인한 0건 (미래 정책 추가 시 baseline 깨짐으로 경고)
 * - with-check-fail: WITH CHECK 절로 INSERT/UPDATE 차단
 */

describe.todo('Shadow Data Preflight — partner-b에 타겟 row 존재 + master_admin 접근 가능 (suite abort 가드)');

describe.todo('Session 정합성 self-check — auth.uid()=JWT.sub ∧ get_my_role()≠NULL');

describe.todo('RLS 격리 — contents (Triangular × Read/WriteInject/UpdateHijack/Delete)');

describe.todo('RLS 격리 — leads (Triangular × Read/WriteInject/UpdateHijack, DELETE는 Policy Absence Baseline)');

describe.todo('RLS 격리 — partners (Triangular × Read/UpdateHijack/Delete, INSERT는 master-only)');

describe.todo('RLS 격리 — domain_requests (Triangular × Read/WriteInject/UpdateHijack/Delete)');

describe.todo('Policy Absence Baseline — system_logs partner_admin SELECT (WL-121 완료 시 Triangular로 전환)');

describe.todo('Unauthenticated 접근 차단 — 5개 테이블 전체에 대해 anon 세션 SELECT/INSERT 시도');

describe.todo('정책 OR 결합 교차 검증 — partner_admin 세션 SELECT 결과가 전부 자기 partner_id (master 경로 누출 없음)');
