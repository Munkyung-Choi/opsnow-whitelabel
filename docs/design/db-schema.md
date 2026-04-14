# DB 스키마 설계도

> **최종 업데이트**: 2026-04-14
> **기준 마이그레이션**: `20260408000001` ~ `20260408000004`, WL-62 (2026-04-12), WL-65 (2026-04-14)
> **연관 Confluence 문서**: [3. DB 스키마](https://opsnowinc.atlassian.net/wiki/spaces/WS/pages/289046572) (Page ID: 289046572)
>
> ⚠️ DB 스키마 변경 시 이 문서의 ERD와 테이블 설명을 반드시 함께 업데이트하라. (`CLAUDE.md [5. Design Documentation Sync]` 참조)

---

## ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    partners {
        uuid id PK
        uuid owner_id FK "auth.users(id)"
        text business_name
        text subdomain UK
        text custom_domain UK
        text custom_domain_status "none|pending|approved|active (TEXT + CHECK 제약)"
        boolean is_active
        text theme_key "gray|blue|green|orange DEFAULT 'blue'"
        text default_locale "ko|en DEFAULT 'ko'"
        text published_locales "ARRAY — 발행된 언어 목록"
        text logo_url
        text favicon_url
        jsonb notification_emails "리드 알림 이메일 최대 3개"
        timestamptz created_at
        timestamptz updated_at
    }

    profiles {
        uuid id PK "auth.users(id) 참조 — CASCADE DELETE"
        text role "master_admin | partner_admin"
        uuid partner_id FK "파트너 탈퇴 시 NULL로 SET"
        timestamptz created_at
    }

    contents {
        uuid id PK
        uuid partner_id FK
        text section_type "hero|about|contact|terms|privacy"
        text title
        text subtitle
        text body
        text cta_text
        jsonb contact_info "email·phone·address"
        boolean is_published "false=초안(비공개) | true=발행(공개)"
        timestamptz updated_at
    }

    global_contents {
        uuid id PK
        text section_type UK "features|trust_badges 등"
        text title
        text subtitle
        text body
        jsonb meta "섹션별 추가 데이터 (카드 목록 등)"
        timestamptz updated_at
        uuid updated_by FK "auth.users(id) — 마지막 수정자"
    }

    leads {
        uuid id PK
        uuid partner_id FK
        text customer_name
        text company_name
        text email
        text phone
        text cloud_usage_amount
        text message
        text status "new|in_progress|contacted|closed"
        timestamptz created_at
    }

    site_visits {
        uuid id PK
        uuid partner_id FK
        date visit_date "UNIQUE(partner_id, visit_date)"
        integer count "Upsert 방식 누적"
    }

    system_logs {
        uuid id PK
        uuid actor_id FK "auth.users(id) — 실제 행위자"
        uuid on_behalf_of FK "partners(id) — Impersonation 대상 (nullable)"
        text action "impersonate_start|partner_update 등"
        text target_table "영향받은 테이블명"
        uuid target_id "영향받은 row ID"
        jsonb diff "변경 전후 데이터 before/after"
        text ip "Master Admin 요청 IP (법적 증거)"
        timestamptz created_at
    }

    domain_requests {
        uuid id PK
        uuid partner_id FK "partners(id) CASCADE DELETE"
        text requested_domain
        text request_type "subdomain|custom_tld"
        domain_request_status status "pending|approved|active|rejected|expired (ENUM)"
        jsonb verification_record
        text rejection_reason
        timestamptz created_at
        timestamptz updated_at
        timestamptz reviewed_at
        timestamptz activated_at
    }

    leads_masked_view {
        uuid id
        uuid partner_id
        text customer_name "앞 2자 + * 마스킹"
        text company_name "마스킹 없음 (통계 목적)"
        text email "***@domain 마스킹"
        text phone "010-****-5678 마스킹"
        text cloud_usage_amount "마스킹 없음 (우선순위 판단)"
        text message "NULL — 완전 숨김"
        text status
        timestamptz created_at
    }

    partner_sections {
        uuid id PK
        uuid partner_id FK
        text section_type "pain_points|stats|how_it_works|finops_automation|core_engines|role_based_value|faq|final_cta (CHECK 제약)"
        boolean is_visible "true=노출 / false=숨김 (anon RLS가 false 행 필터링)"
        integer display_order "렌더링 순서 (ASC)"
        timestamptz created_at
        timestamptz updated_at
    }

    partners ||--o{ profiles : "소속"
    partners ||--o{ contents : "브랜드 콘텐츠"
    partners ||--o{ partner_sections : "섹션 노출 제어"
    partners ||--o{ leads : "수집된 리드"
    partners ||--o{ site_visits : "방문 통계"
    partners ||--o{ system_logs : "Impersonation 대상 (on_behalf_of)"
    partners ||--o{ domain_requests : "커스텀 도메인 신청 이력"
    leads ||--|| leads_masked_view : "마스킹 뷰"
```

---

## 테이블 설명

### 1. `partners` — 파트너사 (핵심 테넌트)

멀티테넌트 시스템의 기반. 모든 데이터는 `partner_id`를 통해 이 테이블과 연결된다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `owner_id` | UUID FK | 파트너사 오너 계정 (`auth.users` 참조) |
| `business_name` | TEXT | 파트너사 법인명 |
| `subdomain` | TEXT UK | 미들웨어 라우팅 기준 (예: `samsung.opsnow.com`) |
| `custom_domain` | TEXT UK | 파트너 전용 도메인 (예: `cloud.samsung.com`) |
| `custom_domain_status` | TEXT | `none` / `pending` / `approved` / `active` — CHECK 제약으로 허용 값 강제. 기존 RLS/함수 호환성을 위해 TEXT 타입 유지 |
| `theme_key` | TEXT | 파트너 테마 식별자. `src/lib/theme-presets.ts`의 19개 CSS 변수로 확장. DEFAULT `'blue'` |
| `default_locale` | TEXT | 로케일 감지 실패 시 폴백. `'ko'` \| `'en'`. DEFAULT `'ko'` |
| `published_locales` | TEXT[] | 실제 발행된 언어 목록. 미발행 언어 접근 시 `default_locale`로 soft-landing. DEFAULT `ARRAY['ko']` |
| `notification_emails` | JSONB | 리드 알림 수신 이메일 목록. **최대 3개** (앱 레벨 검증) |

**테마 프리셋 4종** (`src/lib/theme-presets.ts` → `themes[theme_key]` 참조):

| `theme_key` | 대표 hex | 용도 |
|-------------|---------|------|
| `gray`      | `#0D0C22` | 중립적·전문적 이미지 |
| `blue`      | `#0012B6` | 신뢰·기술 이미지 (기본값) |
| `green`     | `#1A5835` | 성장·친환경 이미지 |
| `orange`    | `#D23F01` | 에너지·혁신 이미지 |

> `layout.tsx`에서 `themes[theme_key]` 맵을 조회해 CSS Variables 19개를 `<div style={}>` 인라인 주입.
> 어드민 UI는 위 4종만 선택지로 제공한다.

---

### 2. `profiles` — 사용자 프로필

Supabase `auth.users`와 1:1 연결. `role`로 접근 권한을 구분한다.

| `role` 값 | 설명 |
|-----------|------|
| `master_admin` | OpsNow 내부 관리자. 전 파트너 데이터 접근 가능 (단, leads는 마스킹 뷰 경유 필수) |
| `partner_admin` | 파트너사 담당자. 자사 데이터만 접근 가능 |

> ⚠️ `partner_id`는 파트너사 탈퇴 시 `ON DELETE SET NULL` — 계정은 유지되나 파트너 소속이 해제됨.

---

### 3. `contents` — 파트너별 마케팅 콘텐츠

파트너사가 Admin 대시보드에서 직접 편집하는 섹션별 콘텐츠.

| 컬럼 | 설명 |
|------|------|
| `section_type` | `hero`, `stats`, `how_it_works`, `faq`, `final_cta`, `footer`, `terms`, `privacy`. **(partner_id, section_type) UNIQUE** — 섹션당 1행만 존재 |
| `body` | 텍스트 섹션은 i18n 문자열 / 배열 섹션(`stats`, `how_it_works`, `faq`)은 JSONB 배열 |
| `is_published` | `false`(초안, 비공개) / `true`(발행, 공개). RLS `contents_public_anon_read` 정책으로 미발행 콘텐츠는 마케팅 사이트에 노출되지 않음 |
| `contact_info` | `{"email": "", "phone": "", "address": ""}` 구조의 JSONB |

---

### 3-b. `partner_sections` — 파트너별 섹션 노출 제어 (WL-40 신규)

파트너가 마케팅 사이트에 표시할 섹션을 ON/OFF하고 순서를 지정하는 테이블.

| 컬럼 | 설명 |
|------|------|
| `section_type` | 토글 가능한 섹션 목록 (CHECK 제약). 고정 섹션(hero, footer, contact)은 미포함 |
| `is_visible` | `false`이면 마케팅 사이트에서 숨김. anon RLS가 `is_visible=true` 행만 반환 |
| `display_order` | 오름차순 정렬. DB rows가 없는 신규 파트너는 앱 레벨 DEFAULT_SECTIONS 폴백 적용 |

---

### 4. `global_contents` — 공통 마케팅 콘텐츠

OpsNow Master Admin이 관리하는 전 파트너 공통 콘텐츠. `section_type`이 UNIQUE이므로 섹션당 1행.

| 컬럼 | 설명 |
|------|------|
| `meta` | 섹션별 추가 데이터 (예: 기능 카드 목록 배열, 인증 배지 이미지 URL 등) |
| `updated_by` | 마지막 수정한 Master Admin의 `auth.uid()` — 감사 추적 용도 |

---

### 5. `leads` — 리드 (잠재 고객)

마케팅 사이트 방문자가 제출한 문의/상담 신청 데이터.

| `status` 값 | 설명 |
|-------------|------|
| `new` | 신규 접수 |
| `in_progress` | 검토 중 |
| `contacted` | 연락 완료 |
| `closed` | 종결 |

> **보안**: `master_admin`은 이 테이블에 **직접 접근 불가**. 반드시 `leads_masked_view`를 통해서만 조회.
> **스팸 방지**: `leads_public_insert` RLS 정책이 `is_active = true`인 파트너에만 INSERT 허용. 앱 레벨 Rate Limiting은 WL-30 참조.

---

### 6. `site_visits` — 방문자 통계

파트너별 일별 방문 횟수 집계. `(partner_id, visit_date)` UNIQUE 제약으로 중복 집계 방지.

> ⚠️ INSERT/UPDATE는 **Service Role Key를 사용하는 서버사이드에서만** 수행. RLS INSERT 정책 없음.

---

### 7. `system_logs` — 감사 로그 (Audit Log)

관리자 행위를 추적하는 불변 로그. Impersonation(대리 접속) 포함 모든 관리 작업 기록.

| 컬럼 | 설명 |
|------|------|
| `actor_id` | 실제 행위자 (항상 Master Admin의 `auth.uid()`) |
| `on_behalf_of` | Impersonation 중인 경우 대상 파트너 ID. 일반 작업은 `NULL` |
| `action` | 수행된 작업 (예: `impersonate_start`, `partner_update`, `global_content_publish`) |
| `target_table` | 영향받은 테이블명 |
| `target_id` | 영향받은 row의 UUID |
| `diff` | 변경 전후 데이터: `{"before": {...}, "after": {...}}` |
| `ip` | Master Admin 요청 IP — 법적 증거용 |

> ⚠️ INSERT는 **Service Role Key를 사용하는 서버사이드에서만** 수행. partner_admin은 본인 관련 로그도 조회 불가.

---

### 8. `domain_requests` — 커스텀 도메인 신청 이력 (WL-62, 2026-04-12)

파트너가 신청한 커스텀 도메인의 생애주기를 이력으로 관리하는 테이블.
`partners` 테이블의 현재 활성 상태(`custom_domain`, `custom_domain_status`)와 분리되어 여러 신청 이력을 누적 저장한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `partner_id` | UUID FK | 신청 파트너 (`partners.id` 참조, CASCADE DELETE) |
| `requested_domain` | TEXT | 신청된 도메인 (예: `cloud.partner-a.com`) |
| `request_type` | TEXT | `subdomain` (*.opsnow.com) / `custom_tld` (외부 도메인) |
| `status` | ENUM | `pending` → `approved` → `active` / `rejected` / `expired` |
| `verification_record` | JSONB | DNS 검증 레코드 `{"type": "CNAME", "target": "...", "verified": bool}` |
| `rejection_reason` | TEXT | 거절 사유 (nullable) |
| `reviewed_at` | TIMESTAMPTZ | 승인/거절 시각 — 트리거 자동 기록 |
| `activated_at` | TIMESTAMPTZ | `active` 전환 시각 — 트리거 자동 기록 |

**상태 전이:**
```
pending → approved → active   (성공 경로)
pending → rejected             (거절)
approved → expired             (DNS 검증 타임아웃)
```

**Sync Protocol**: `active` 전환 시 트리거(`trg_sync_domain_to_partner`)가 `partners.custom_domain` + `partners.custom_domain_status`를 원자 업데이트. `proxy.ts`는 `partners` 테이블을 직접 조회하므로 별도 캐시 무효화 불필요.

**Partial Unique Index** (`unique_active_request_per_partner`): `status IN ('pending', 'approved', 'active')` 조건으로 진행 중 신청은 파트너당 1개만 허용. `rejected`/`expired` 이력은 무제한 누적 가능.

---

### `leads_masked_view` — 리드 마스킹 뷰 (VIEW)

실제 테이블이 아닌 DB View. `master_admin` 전용. 개인정보(PII)를 자동 마스킹하여 반환.

| 컬럼 | 원본 예시 | 마스킹 결과 |
|------|----------|------------|
| `customer_name` | `홍길동` | `홍길*` |
| `email` | `hong@samsung.com` | `***@samsung.com` |
| `phone` | `010-1234-5678` | `010-****-5678` |
| `message` | `상담 내용...` | `NULL` (완전 숨김) |
| `company_name` | 그대로 노출 | 영업 통계 목적 |
| `cloud_usage_amount` | 그대로 노출 | 우선순위 판단 목적 |

> ⚠️ View 자체에 `WHERE EXISTS (master_admin 확인)` 필터 내장 — partner_admin이 조회하면 0건 반환.

---

## RLS 정책 요약

| 테이블 | `anon` | `partner_admin` | `master_admin` | 비고 |
|--------|--------|-----------------|----------------|------|
| `partners` | 활성 파트너 전체 조회 (Fix #1: anon만) | 본인 파트너만 조회 | 전체 CRUD | |
| `profiles` | 없음 | 본인 프로필만 CRUD | 전체 조회 | |
| `contents` | 발행된 콘텐츠만 조회 (Fix #3: anon만) | 자사만 CRUD | 전체 CRUD | |
| `global_contents` | 전체 조회 | 전체 조회 | 전체 CRUD | |
| `leads` | 자사 파트너에 INSERT (is_active 검증) | 자사만 SELECT·UPDATE | **직접 접근 불가** | master_admin은 masked_view 경유 |
| `site_visits` | 없음 | 자사만 조회 | 전체 조회 | Upsert: Service Role Key |
| `system_logs` | 없음 | **없음** | 조회 전용 | INSERT: Service Role Key |
| `domain_requests` | 없음 | 자사 요청만 SELECT·INSERT | 전체 CRUD | 트리거가 active 전환 시 partners 원자 업데이트 |

---

## 인덱스 목록

| 인덱스명 | 테이블 | 컬럼 | 목적 |
|---------|--------|------|------|
| `idx_partners_subdomain` | partners | subdomain | 미들웨어 도메인 라우팅 |
| `idx_partners_custom_domain` | partners | custom_domain | 미들웨어 도메인 라우팅 |
| `idx_contents_partner_id` | contents | partner_id | 파트너별 콘텐츠 조회 |
| `idx_leads_partner_id` | leads | partner_id | 파트너별 리드 조회 |
| `idx_leads_created_at` | leads | created_at DESC | 최신순 정렬 |
| `idx_leads_status` | leads | status | 상태별 필터링 |
| `idx_global_contents_section_type` | global_contents | section_type | 섹션 직접 조회 |
| `idx_site_visits_partner_date` | site_visits | (partner_id, visit_date DESC) | 날짜별 방문 집계 |
| `idx_system_logs_actor_id` | system_logs | actor_id | 행위자 기준 감사 |
| `idx_system_logs_on_behalf_of` | system_logs | on_behalf_of | Impersonation 대상 기준 감사 |
| `idx_system_logs_created_at` | system_logs | created_at DESC | 시간순 감사 로그 |
| `unique_active_request_per_partner` | domain_requests | partner_id (WHERE status IN 'pending','approved','active') | 진행 중 도메인 신청 중복 방지 |
