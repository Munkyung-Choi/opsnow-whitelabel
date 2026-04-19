# SECURITY.md — OpsNow White-label Site 보안 헌법

> **최종 업데이트**: 2026-04-19 (WL-123 system_logs.partner_id 추가 반영)
> **참조 문서**: `supabase/migrations/20260408000003_rls_policies.sql`
> **Auditor 역할**: 세션 시작 시 이 문서를 반드시 참조하라.

---

## 1. 핵심 보안 원칙

### Fail-safe Default (무조건 실패 원칙)
정책이 명시적으로 허용하지 않는 한 모든 접근은 차단된다. "허용 목록(Allow-list)" 방식만 사용하며, "차단 목록(Block-list)" 방식은 금지.

### Least Privilege (최소 권한 원칙)
각 역할에는 업무 수행에 필요한 최소한의 권한만 부여한다.

| 역할 | 원칙 |
|------|------|
| `anon` | 공개 마케팅 사이트 렌더링에 필요한 최소 데이터만 조회 |
| `partner_admin` | 자사 데이터만 접근. 타 파트너 데이터에 대한 접근은 어떤 경로로도 불가 |
| `master_admin` | 전체 데이터 접근 가능하나, leads PII는 반드시 마스킹 뷰를 통해서만 조회 |
| `service_role` | 서버사이드 Route Handler 전용. 클라이언트 코드에 절대 노출 금지 |

---

## 2. RLS 정책 설계 결정 기록 (WL-8)

### 2026-04-08 — 3가지 보안 취약점 수정 (Auditor 검토 완료)

#### [Fix #1] `partners_public_anon_read` — authenticated 제거

**변경 전**: `TO anon, authenticated` — 로그인한 파트너 어드민이 전체 활성 파트너 정보 조회 가능
**변경 후**: `TO anon` 전용

**근거**: `partners_public_read` 정책이 `authenticated`를 포함할 경우, 파트너 A의 어드민이 경쟁사인 파트너 B의 `business_name`, `notification_emails`, `primary_color` 등 브랜딩 정보 전체를 열람 가능. Multi-tenant SaaS의 핵심 격리 원칙 위반.

**회귀 없음**: 미들웨어/SSR은 `anon` key로 동작하므로 파트너 도메인 라우팅 기능 영향 없음.

---

#### [Fix #2] `leads_public_insert` — 활성 파트너 검증 추가

**변경 전**: `WITH CHECK (true)` — 아무 검증 없음
**변경 후**: `WITH CHECK (partner_id IN (SELECT id FROM partners WHERE is_active = true))`

**근거**: 실제 존재하는 활성 파트너의 `partner_id`를 알고 있는 공격자가 대량의 스팸 리드를 특정 파트너에게 주입 가능. `partners_public_anon_read`로 인해 `anon`이 파트너 목록 조회 가능하므로 공격 경로 완성됨.

**⚠️ 잔여 위험**: DB 레벨 1차 방어만 구축. 완전한 스팸 차단을 위해 앱 레벨 Rate Limiting 필요. → WL-30 참조.

---

#### [Fix #3] `contents_public_anon_read` — authenticated 제거

**변경 전**: `TO anon, authenticated` — 로그인한 파트너 어드민이 타 파트너의 발행 콘텐츠 조회 가능
**변경 후**: `TO anon` 전용

**근거**: 파트너 A의 어드민이 파트너 B의 마케팅 문구, CTA 텍스트, 연락처 정보를 Admin 대시보드에서 직접 열람 가능. 영업 비밀 보호 위반.

**회귀 없음**: 인증된 파트너 어드민의 본인 콘텐츠 접근은 `contents_partner_admin_write (FOR ALL)`이 처리.

---

## 2-1. Gemini 교차감사 추가 수정 (2026-04-08)

### [Fix #4] `profiles_self_select` — FOR ALL → FOR SELECT 변경 (권한 에스컬레이션 방지)

**발견**: Gemini 본부장 교차감사

**취약점**: `profiles_self_access FOR ALL` 정책이 `authenticated` 역할에게 `profiles.role` 컬럼 UPDATE 권한을 부여. `partner_admin`이 자신의 role 값을 `master_admin`으로 변경하면 `get_my_role()` 함수가 이를 그대로 반환하여 전체 시스템 권한 탈취 가능.

**수정**: `FOR ALL` → `FOR SELECT` 전용으로 변경. 정책명도 `profiles_self_access` → `profiles_self_select` 변경.

**중요 아키텍처 결정**: `profiles` 테이블의 INSERT/UPDATE는 반드시 `supabaseAdmin`(service_role)을 통한 서버사이드 Route Handler에서만 수행. 클라이언트에서 직접 프로필을 생성/수정하는 경로는 허용하지 않음.

---

### [Fix #5] `leads_masked_view` — security_invoker = true 명시화

**발견**: Gemini 본부장 교차감사

**내용**: PostgreSQL 15+의 `security_invoker = true` 옵션을 명시적으로 설정. 기본값이 SECURITY INVOKER이나, 향후 실수로 SECURITY DEFINER로 전환되는 것을 방지하고 뷰의 보안 컨텍스트를 명문화.

---

### WL-30 백로그 추가 항목 (Gemini 감사 결과)

1. **JWT Claim 최적화**: `leads_public_insert`의 `is_active` 체크를 서브쿼리 방식에서 `auth.jwt() ->> 'is_active'` 방식으로 전환하여 INSERT 성능 개선 (파트너 1,000개+ 스케일 대비)
2. **파트너 소유권 이전 플로우**: 현재 `owner_id` 변경 즉시 구 owner 접근 차단 → 승인 대기 상태가 필요한 경우 별도 상태 컬럼 또는 임시 권한 위임 로직 필요

---

## 3. 테이블별 접근 행렬

| 테이블 | `anon` | `partner_admin` | `master_admin` | `service_role` |
|--------|--------|-----------------|----------------|----------------|
| `partners` | 활성 파트너 전체 조회 | 본인만 조회 | 전체 CRUD | RLS 우회 |
| `profiles` | ❌ | 본인만 CRUD | 전체 조회 | RLS 우회 |
| `contents` | 발행된 것만 조회 | 자사만 CRUD | 전체 CRUD | RLS 우회 |
| `global_contents` | 전체 조회 | 전체 조회 | 전체 CRUD | RLS 우회 |
| `leads` | 자사에만 INSERT | 자사만 SELECT·UPDATE | **직접 접근 불가** | RLS 우회 |
| `site_visits` | ❌ | 자사만 조회 | 전체 조회 | RLS 우회 (Upsert) |
| `system_logs` | ❌ | 자기 파트너 `partner_id` 또는 `on_behalf_of` 매칭 로그 SELECT (WL-121 + WL-123) | 전체 SELECT | RLS 우회 (INSERT) |

---

## 4. PII 마스킹 규칙

`leads` 테이블의 개인정보는 `master_admin`에게 `leads_masked_view`를 통해서만 노출된다.

| 컬럼 | 마스킹 방식 | 예시 |
|------|------------|------|
| `customer_name` | 앞 2자 + `*` 반복 | `홍길동` → `홍길*` |
| `email` | 로컬 파트 전체 마스킹 | `hong@acme.com` → `***@acme.com` |
| `phone` | 중간 자리 마스킹 | `010-1234-5678` → `010-****-5678` |
| `message` | 완전 숨김 (NULL) | 영업 비밀 보호 |
| `company_name` | 노출 | 영업 통계 목적 |
| `cloud_usage_amount` | 노출 | 우선순위 판단 목적 |

**⚠️ 규칙**: 어떠한 API Route나 Server Action도 `leads` 테이블을 직접 조회하여 `master_admin`에게 반환해서는 안 된다. 반드시 `leads_masked_view`를 경유하라.

---

## 5. SECURITY DEFINER 함수 목록

| 함수명 | 목적 | 위험도 |
|--------|------|--------|
| `public.get_my_role()` | profiles 재귀 조회 방지. RLS 정책 내에서 현재 사용자의 role 조회 | ⚠️ RLS 우회 — 로직 변경 시 Auditor 검토 필수 |

---

## 6. 절대 금지 사항

1. `service_role` key를 클라이언트 컴포넌트(`use client`)나 브라우저에서 접근 가능한 코드에 노출하는 것.
2. `leads` 테이블에 `master_admin` 직접 접근 정책(`FOR SELECT TO authenticated`)을 추가하는 것.
3. `WITH CHECK (true)` 방식의 무검증 INSERT 정책을 추가하는 것.
4. RLS 없이 테이블을 생성하는 것 (`ENABLE ROW LEVEL SECURITY` 누락).
5. `get_my_role()` 함수 외의 SECURITY DEFINER 함수를 Auditor 검토 없이 추가하는 것.

---

## 7. 보안 관련 Human-in-the-loop 중단점

다음 작업은 반드시 문경 님의 명시적 승인 후 진행:
- RLS 정책 신규 생성 또는 수정
- `auth.*` 테이블 관련 로직 변경
- `service_role` 사용 범위 변경
- SECURITY DEFINER 함수 추가/수정

---

## 8. service_role 격리 패턴 (Allow-list)

> **원칙**: `supabaseAdmin`(service_role key)은 아래 **명시된 Route Handler에서만** 사용한다.
> 목록에 없는 위치에서의 사용은 **Auditor 즉시 검토** 대상이며, 승인 없이 병합 불가.

### Antipattern — 절대 금지

```ts
// ❌ API Route 어디서나 직접 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // 위치 불문 직접 호출 금지
)
```

### Best Practice — 단일 진입점 격리

```ts
// ✅ lib/supabase-admin.ts 에서만 export — 서버사이드 Route Handler 전용
import { supabaseAdmin } from '@/lib/supabase-admin'

// ❌ 클라이언트 컴포넌트('use client'), 브라우저 번들에 절대 포함 금지
// ❌ Server Actions에서도 직접 사용 금지 — Route Handler 경유 필수
```

### 허용 화이트리스트 (2026-04-10 확정)

| Route Handler | 대상 테이블·컬럼 | 이유 | system_logs 기록 |
|---|---|---|---|
| `/api/visits/upsert` | `site_visits` Upsert | `anon` INSERT 불가 구조 | 면제 (고빈도 통계 집계) |
| `/api/admin/logs` | `system_logs` INSERT | 감사 로그 불변성 보장 | 해당 없음 (자기 자신이 로그) |
| `/api/auth/provision` | `profiles` INSERT/UPDATE | 역할 변경 클라이언트 금지 | ✅ 필수 |
| `/api/admin/domain-approval` | `partners.custom_domain_status` | 도메인 승인 관리자 전용 | ✅ 필수 |
| `/api/admin/impersonate` | `system_logs` INSERT + 서명 쿠키 발급 | master_admin 대리 접속 감사 (WL-51) | ✅ 필수 |

**불변 법칙 (Invariant) — WL-51, 2026-04-18**:
> `/api/admin/impersonate`는 어떠한 경우에도 `master_admin` 권한 없이는 실행되지 않는다.
> `getCurrentUser()` 호출로 세션·role·invariant가 검증되며, 실패 시 redirect 또는 403 반환 이전에는 이후 로직에 진입할 수 없다. 이는 코드 변경 시에도 유지해야 하는 불변 조건이다.

### Traceability 원칙

**모든 service_role 사용은 `system_logs`에 해당 행위를 기록해야 한다.**
"누가, 언제, 어떤 목적으로 슈퍼 파워를 사용했는지" 항상 추적 가능해야 한다.

- 면제 대상: `site_visits` Upsert (고빈도 통계 집계 — 기록 시 system_logs 폭증)
- 향후 배치 처리 등 신규 service_role 사용처 추가 시: 반드시 이 목록을 업데이트하고 Auditor 검토 후 병합

> ⚠️ **화이트리스트 확장 절차**: CLAUDE.md Breakpoint #2(Security & Auth 정책 결정)에 해당.
> 문경 님 명시적 승인 없이 목록 추가 금지.

---

## 9. Auth 플로우 & RBAC (WL-53, 2026-04-18)

### 9.1 역할 모델

| 역할 | `profiles.role` | `profiles.partner_id` | 접근 범위 |
|------|----------------|---------------------|----------|
| `master_admin` | `'master_admin'` | **반드시 `null`** | 모든 파트너 데이터 (관리용) |
| `partner_admin` | `'partner_admin'` | **반드시 non-empty string (UUID)** | 자신 소속 파트너 데이터 한정 |

**Discriminated Union 타입 강제** (`src/lib/auth/get-current-user.ts`):

```ts
type CurrentUser =
  | { id: string; role: 'master_admin'; partner_id: null }
  | { id: string; role: 'partner_admin'; partner_id: string }
```

→ `withAdminAction({ requiredRole: 'partner_admin' }, ...)` callback에서 `user.partner_id`는 컴파일 타임에 `string`으로 좁혀져 WHERE 절 누락 방지.

### 9.2 역할 invariant 화이트리스트

```ts
const ROLE_INVARIANTS: Record<UserRole, (p: RawProfile) => string | null> = {
  master_admin: (p) => p.partner_id !== null ? '...' : null,
  partner_admin: (p) => !p.partner_id || p.partner_id.trim().length === 0 ? '...' : null,
}
```

- `Record<UserRole, ...>` 로 exhaustive 체크 — 새 역할 추가 시 컴파일 에러로 누락 감지
- 위반 시 **Silent Fail with Auditing**: `redirect('/auth/login?error=invalid_profile')` + `console.error` (향후 `/api/admin/logs` 연동)
- 500 스택 트레이스 노출 방지 (공격자에 힌트 제공 회피)

### 9.3 이중 SSOT 구조 (격리 키)

현재 파트너 격리는 **두 개의 기준**이 혼재한다. 동기화 유지가 필수 제약.

| 레이어 | 격리 기준 | 사용처 |
|-------|---------|--------|
| **앱 레이어** | `profiles.partner_id` (via `user.partner_id` in `getCurrentUser`) | `withAdminAction` callback, Server Action WHERE 절 |
| **DB RLS** | `partners.owner_id = auth.uid()` (via `partner_id IN (SELECT id FROM partners WHERE owner_id = auth.uid())`) | `contents_partner_admin_write`, `leads_partner_admin_select/update`, `site_visits_partner_admin_select` |

- **동기화 책임**: 파트너 `owner_id` 변경 시 반드시 해당 사용자의 `profiles.partner_id`도 동시에 업데이트할 것 (`/api/auth/provision` 구현 시 반영)
- **현재 보장**: `seedAdminTestUsers`(seed-admin-users.ts:86, 103-104)가 두 값을 동시에 설정하여 E2E 테스트 수준에서는 정합성 확보
- **구조 통합 백로그**: WL-30 (향후 `profiles.partner_id` 단일 SSOT로 통합 검토)

### 9.4 `next=` 파라미터 Open Redirect 방어 (R8-01)

`src/lib/auth/validate-next-url.ts`:

```
Whitelist prefix: ['/admin/', '/partner/']
Deny list:        ['/auth/', '/api/', '/__proxy_health']
Fallback:         '/admin/dashboard'
```

**3단계 방어**:
1. 재귀 디코딩 (`decodeURIComponent` 최대 3회) — 이중/삼중 인코딩 방지
2. NFKC 정규화 + 비-ASCII 차단 — Unicode homoglyph 방지
3. 백슬래시/프로토콜 상대(`//`)/스킴(`scheme:`) 차단 + `URL` 파싱으로 origin 변경 감지

### 9.5 요청 스코프 캐싱 (R9)

`getCurrentUser()`는 React `cache()`로 래핑되어 **동일 request 내 DB 쿼리 1회**로 dedup.
Server Component ↔ Server Action 간 캐시는 **공유되지 않음** (서로 다른 request 범위).

### 9.6 격리 실패 모드 매트릭스 (F1~F10 — `docs/audits/WL-53.md` 참조)

Auth/RBAC 작업 시 이 매트릭스를 기준으로 회귀 검토. 상세는 별도 Digest 참조.

---

## 10. Admin Impersonation (WL-51, 2026-04-18)

### 10.1 아키텍처 원칙 — 세션 사이드카

Master의 Supabase auth 세션은 **불변**. 별도 서명 쿠키 `opsnow_impersonate`로 대리 접속 컨텍스트만 병기한다.

- `getCurrentUser()` → 항상 master_admin 반환 (감사 무결성 유지)
- `getImpersonationContext()` → cookie 파싱 + `user.role` 재검증 (단방향 의존)
- `system_logs.actor_id` = master의 `auth.uid()` (불변), `on_behalf_of` = 대상 partner_id

### 10.2 쿠키 스펙

```
<partner_id>.<issued_at_ms>.<issued_for_user_id>.<kid>.<hmac_sha256_base64url>
```

- Secret: `IMPERSONATION_SIGNING_SECRET` (32+ bytes, `openssl rand -base64 32`)
- HMAC-SHA256 + `crypto.timingSafeEqual` 상수 시간 비교
- HttpOnly / Secure(prod) / SameSite=Lax / Max-Age=3600s
- Clock skew ±5초 leeway

### 10.3 Mutation Data Contract (HIGH-3 지연 처리)

> **정책**: Impersonation 상태에서 발생하는 모든 데이터 변경 Server Action은
> `system_logs` 작성 시 `on_behalf_of` 필드에 `target_partner_id`를 **반드시 명시적으로 전달**해야 한다.
> 자동 주입(withAdminAction 시그니처 통합)은 `/api/admin/logs` 연동 티켓(WL-53 follow-up #6)에서 수행한다.

### 10.4 방어 매트릭스 (G1~G8 — `docs/audits/WL-51.md` 참조)

| # | 실패 모드 | 방어 |
|---|-----------|------|
| G1 | 쿠키 서명 위조 | HMAC-SHA256 + timingSafeEqual |
| G2 | 만료 쿠키 재사용 | issued_at 서버 검증 (1h + ±5s) |
| G3 | partner_admin의 impersonate 엔드포인트 호출 | `getCurrentUser()` + role 체크 (10.1 불변 법칙) |
| G4 | 타인 세션에서 master 쿠키 탈취 | `issued_for_user_id` ↔ 현재 `auth.uid()` 대조 |
| G5 | CSRF | SameSite=Lax + Origin 검증 |
| G6 | 로그 기록과 쿠키 세팅 race | log INSERT 성공 후에만 cookie 세팅 |
| G7 | 비활성 파트너로 impersonation | `partners.is_active=true` 사전 검증 |
| G8 | 중첩 impersonation | 기존 쿠키 존재 시 409 반환 (명시적 stop 필요) + 최근 5초 dupe log 검사 |

## 11. Storage 정책 (Asset Upload — WL-125, 2026-04-19)

### 11.1 버킷 구조

| 버킷 ID | 용도 | 공개 | 크기 상한 | 허용 MIME |
|---------|------|------|----------|----------|
| `partner-logos` | 파트너 로고 | public | 2MB | `image/png`, `image/jpeg`, `image/webp` |
| `partner-favicons` | 파트너 파비콘 | public | 512KB | `image/x-icon`, `image/vnd.microsoft.icon`, `image/png` |

**버킷 분리 이유 (Defense in Depth)**: 단일 버킷으로는 Supabase가 버킷 단위 `file_size_limit`만 지원하므로 파비콘 512KB 제약을 DB 레벨로 강제할 수 없음. 버킷을 2개로 분리하여 Zod(App 레이어) + bucket limit(DB 레이어) 이중 방어.

**경로 규약**: `{partner_uuid}/{logo|favicon}.{ext}` 단일 레벨.  
예: `550e8400-e29b-41d4-a716-446655440000/logo.png`

**SVG 미허용 결정**: `image/svg+xml`은 Stored XSS 벡터로 제외. 필요 시 DOMPurify 서버사이드 sanitize를 선행하는 별도 티켓 생성.

### 11.2 Storage RLS 접근 행렬

| 작업 | `anon` | `partner_admin` | `master_admin` |
|------|--------|-----------------|----------------|
| SELECT | ✓ (public 읽기) | ✓ | ✓ |
| INSERT | ✗ | 자사 `{partner_id}/` 경로만 | 규약 준수 시 전체 |
| UPDATE | ✗ | 자사 경로만 (WITH CHECK) | 규약 준수 시 전체 |
| DELETE | ✗ | 자사 경로만 | 전체 |

**경로 정규식 강제** (INSERT/UPDATE `WITH CHECK`): `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(logo|favicon)\.(png|jpg|jpeg|webp|ico)$`  
→ master_admin도 예외 없음. 루트 업로드·비규약 확장자 원천 차단.

**UPDATE `WITH CHECK` 명시**: 크로스테넌트 rename 공격 차단 (WL-122 선례 준수). `USING`만 있으면 공격자가 `{A_uuid}/logo.png` → `{B_uuid}/logo.png`로 move 가능.

### 11.3 헬퍼 사용 규약

- `src/lib/storage/` 모듈은 **session-based Supabase 클라이언트 전용** (`supabaseAdmin` 사용 금지).
- RLS가 session으로 자연 적용되므로 `src/lib/storage/`는 §8 service_role 화이트리스트 대상이 아님.
- Server Action에서 호출 시 반드시 `withAdminAction` 내부에서 `createActionClient()` 클라이언트를 넘길 것.

### 11.4 MIME·확장자 SSOT

`src/lib/storage/partner-asset.schema.ts`가 단일 기준. 변경 시 마이그레이션 `20260419000009_partner_assets_storage.sql`의 `allowed_mime_types`도 동시 갱신 필수.
