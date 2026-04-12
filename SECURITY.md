# SECURITY.md — OpsNow White-label Site 보안 헌법

> **최종 업데이트**: 2026-04-08 (WL-8 작업 반영)
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
| `system_logs` | ❌ | ❌ | 조회 전용 | RLS 우회 (INSERT) |

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

### Traceability 원칙

**모든 service_role 사용은 `system_logs`에 해당 행위를 기록해야 한다.**
"누가, 언제, 어떤 목적으로 슈퍼 파워를 사용했는지" 항상 추적 가능해야 한다.

- 면제 대상: `site_visits` Upsert (고빈도 통계 집계 — 기록 시 system_logs 폭증)
- 향후 배치 처리 등 신규 service_role 사용처 추가 시: 반드시 이 목록을 업데이트하고 Auditor 검토 후 병합

> ⚠️ **화이트리스트 확장 절차**: CLAUDE.md Breakpoint #2(Security & Auth 정책 결정)에 해당.
> 문경 님 명시적 승인 없이 목록 추가 금지.
