---
version: v1.0
created: 2026-04-09
owner: 최문경 (munkyung.choi@opsnow.com)
auditor_target: Gemini (독립 교차검증 모델)
related_ticket: WL-36
---

# 시스템 불변 조건 (System Invariants)

> **용도**: `scripts/ai-audit.ts`가 Gemini에 전달하는 핵심 감사 기준.
> 이 파일은 어떤 태스크가 완료되든 **항상 참이어야 하는 조건**만 기록한다.
> 태스크별 단언(Task Assertions)은 `docs/audits/{WL-XX}.md`에 별도 기록한다.
>
> **작성 원칙**: 구현 방식이 아닌 **결과(What)**를 기술한다.
> Gemini는 이 조건들을 읽고, 현재 코드베이스에서 위반 가능성을 독립적으로 판단한다.

---

## INV-01 파트너 간 데이터 완전 격리 (Multi-tenant Isolation)

**한 줄 요약**: 파트너 A의 데이터는 파트너 B가 어떤 경로로도 읽거나 쓸 수 없다.

**상세 조건**:
- `partner_id`가 다른 파트너의 `leads`, `contents`, `site_visits`, `profiles` 데이터는
  인증된 상태(JWT 보유)라도 타 파트너의 계정으로 단 1건도 조회·수정·삭제할 수 없어야 한다.
- API 호출, DB 직접 쿼리, ISR 캐시, URL 파라미터 조작 등 **모든 접근 경로에 동일하게 적용**된다.
- Middleware의 `revalidatePath` 호출이 잘못된 범위로 실행되어
  파트너 A의 캐시가 파트너 B에게 서빙되는 상황도 위반이다.

**예외 (의도적 공유)**:
- `global_contents` 테이블은 Master Admin이 관리하는 공통 섹션으로,
  모든 파트너 마케팅 사이트가 동일한 데이터를 참조하도록 설계되었다. **위반이 아니다.**

**현행 방어 수단**: RLS (Row Level Security), Middleware 이중 분기
**검증 테스트**: `run-rls-check.mjs` T-01, T-02, T-06

**Gemini에게 묻는 질문**:
> 현재 코드베이스(RLS 정책, Route Handler, Middleware)에서
> 파트너 B의 인증 토큰으로 파트너 A의 데이터에 접근할 수 있는 경로가 존재하는가?
> ISR 캐시 키 설계에 파트너 간 격리 취약점이 있는가?

---

## INV-02 민감 키의 외부 노출 금지 (Secret Non-Exposure)

**한 줄 요약**: RLS를 우회하거나 외부 서비스에 접근하는 모든 비밀 키는
브라우저, 클라이언트 번들, 공개 로그 어디에도 평문으로 존재해서는 안 된다.

**상세 조건**:
- 아래 키들은 서버사이드 실행 환경(Node.js Route Handler, Edge Middleware 제외)
  에서만 참조되어야 하며, 클라이언트 번들에 포함되거나
  브라우저 Network 탭에서 확인 가능한 응답에 포함되어서는 안 된다:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`
  - `RESEND_API_KEY`
  - 그 외 `*_KEY`, `*_SECRET` 패턴을 가진 모든 환경 변수
- `docs/audits/` 경로에 저장되는 감사 로그(JSON, MD)에 위 키들이 평문으로 기록되어서는 안 된다.
- `NEXT_PUBLIC_` 접두사가 붙은 변수만 클라이언트 번들에 포함될 수 있다.

**현행 방어 수단**: Next.js 환경 변수 접두사 규칙, `supabaseAdmin` 서버사이드 격리
**검증 테스트**: 클라이언트 번들 정적 분석

**Gemini에게 묻는 질문**:
> `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`가
> `'use client'` 컴포넌트, Client Component에서 import되거나
> API 응답 body에 포함될 수 있는 코드 경로가 존재하는가?
> `docs/audits/` 디렉토리의 로그 파일에 민감 정보가 평문으로 기록될 가능성은?

---

## INV-03 Master Admin의 고객 개인정보 원문 열람 영구 차단 (PII Masking)

**한 줄 요약**: Master Admin은 최상위 권한자이더라도, 고객의 원문 개인정보를
어떤 절차·경로·API를 통해서도 열람할 수 없다. 이는 영구적이며 예외가 없다.

**상세 조건**:
- Master Admin이 `leads` 테이블에 **직접** 접근하는 RLS 정책이 없어야 한다.
- Master Admin은 반드시 `leads_masked_view`를 통해서만 리드 데이터를 조회할 수 있으며,
  이 뷰에서 아래 필드는 항상 마스킹된 상태로 반환되어야 한다:
  - `customer_name`: 앞 2자만 노출, 나머지 `*` 처리
  - `email`: 도메인 부분만 노출 (`***@acme.com`)
  - `phone`: 중간 자리 마스킹 (`010-****-5678`)
  - `message`: `NULL`로 완전 숨김 (상세 문의 내용)
- 어떤 API Route Handler도 Master Admin 세션으로 `leads` 원본을 반환해서는 안 된다.
- 마스킹 해제 기능은 설계상 존재하지 않으며, 이를 우회하는 코드도 없어야 한다.

**현행 방어 수단**: `leads_masked_view` (DB 레벨 마스킹), RLS (leads 직접 접근 정책 부재)
**검증 테스트**: `run-rls-check.mjs` T-03, T-04

**Gemini에게 묻는 질문**:
> Master Admin 세션(JWT)으로 `leads` 테이블 원본에 접근할 수 있는
> API Route Handler나 Server Action이 존재하는가?
> `leads_masked_view`의 마스킹 로직에서 `message` 필드가 완전히 숨겨지지 않는 엣지 케이스가 있는가?

---

## INV-04 미인증 사용자의 관리자 기능 접근 차단 (Unauthenticated Access Prevention)

**한 줄 요약**: 로그인하지 않은 익명(anon) 사용자는 관리자 전용 API와 페이지에
URL 추측이나 직접 호출을 통해 접근할 수 없다.

**상세 조건**:
- 아래 경로들은 유효한 Supabase JWT가 없는 요청을 모두 거부해야 한다:
  - `/api/ai/*` (AI 감사 파이프라인)
  - `/api/admin/*` (관리자 전용 API)
  - `/api/leads` (리드 수집 — INSERT는 anon 허용, 그 외 거부)
  - `/admin/**` (어드민 UI 페이지 전체)
- JWT가 없거나 만료된 요청에 대해 데이터를 반환하거나 수정이 이루어져서는 안 된다.
- `401 Unauthorized` 또는 `/auth/login` 리다이렉트가 일관되게 적용되어야 한다.

**현행 방어 수단**: Middleware 인증 체크, Route Handler `auth.getUser()`, RLS anon 정책
**검증 테스트**: `run-rls-check.mjs` T-05, T-09, T-10

**Gemini에게 묻는 질문**:
> `/api/ai/*`, `/api/admin/*` Route Handler에서 `auth.getUser()` 검증이
> 모든 HTTP 메서드(POST, GET, DELETE 등)에 일관되게 적용되어 있는가?
> Middleware `matcher` 설정에서 보호되지 않고 노출되는 관리자 경로가 있는가?

---

## INV-05 역할 권한 수직 상승 차단 (Vertical Privilege Escalation Prevention)

**한 줄 요약**: 인증된 partner_admin은 자신의 역할을 벗어나 master_admin 전용 기능에
접근하거나 자신의 권한을 스스로 상승시킬 수 없다.

**상세 조건**:
- `partner_admin` 세션으로 아래 작업을 시도할 경우 차단되어야 한다:
  - `profiles.role`을 `master_admin`으로 변경
  - `global_contents` 수정 (조회는 허용)
  - `system_logs` 조회 (본인 관련 로그 포함)
  - 타 파트너의 `contents`, `partners` 수정
  - Master Admin 전용 API endpoint 호출
- `master_admin` 권한 판단은 반드시 DB의 `profiles.role` 서브쿼리로 이루어져야 하며,
  클라이언트가 전달한 파라미터(쿼리스트링, 요청 바디)로 역할을 판단해서는 안 된다.

**현행 방어 수단**: RLS `profiles` 서브쿼리 방식, Route Handler 역할 검증
**검증 테스트**: `run-rls-check.mjs` T-08

**Gemini에게 묻는 질문**:
> partner_admin 세션으로 `profiles.role`을 직접 UPDATE하거나
> master_admin 전용 RLS 정책을 우회할 수 있는 경로가 있는가?
> 역할 판단이 클라이언트 입력값에 의존하는 코드 경로가 존재하는가?

---

## INV-06 AI 비용 통제 및 프롬프트 조작 방어 (AI Cost Control & Prompt Injection)

**한 줄 요약**: 사용자 입력값이 AI 프롬프트를 조작하거나,
단시간 반복 호출로 API 비용을 비정상적으로 발생시키는 상황이 차단되어야 한다.

**상세 조건**:
- 파트너가 `business_name`, `industry` 등 입력 필드에 프롬프트 지시문을 삽입해도
  Gemini의 시스템 프롬프트가 변조되거나 의도치 않은 콘텐츠가 생성되어서는 안 된다.
  - 모든 사용자 입력값은 프롬프트 삽입 전 길이 제한(최대 100자) 및
    허용 문자 필터링을 거쳐야 한다.
- 파트너당 AI API 호출은 **분당 또는 시간당 정해진 횟수를 초과**할 수 없어야 한다.
  (단시간 폭발적 호출이 실제 위협이며, serverless 타임아웃으로 단일 무한루프는 제한됨)
- AI가 생성한 콘텐츠는 텍스트로만 취급되며, 시스템 설정 변경이나 코드 실행으로
  이어질 수 없어야 한다.
- `GEMINI_API_KEY`는 서버사이드에서만 사용되며, 응답 바디나 로그에 포함되어서는 안 된다.
  (INV-02와 중복 적용)

**현행 방어 수단**: `sanitizeContext()` 함수, Rate Limiting 로직 (WL-36 구현 예정)
**검증 테스트**: WL-36 태스크 단언(Task Assertions) 참조

**Gemini에게 묻는 질문**:
> `/api/ai/generate` Route Handler에서 사용자 입력값 sanitize 없이
> 프롬프트에 직접 삽입되는 경로가 있는가?
> Rate Limiting 구현에서 동시 요청(race condition) 시 한도를 초과할 수 있는가?

---

## 불변 조건 매핑 (Invariant Coverage Matrix)

| 불변 조건 | 기존 자동 테스트 | Gemini 정적 감사 | 위험 등급 |
|-----------|---------------|----------------|---------|
| INV-01 파트너 간 격리 | T-01, T-02, T-06 | RLS 정책, Middleware | 🚨 HIGH |
| INV-02 민감 키 노출 | 없음 | 번들 분석, 코드 grep | 🚨 HIGH |
| INV-03 PII 마스킹 | T-03, T-04 | View 정의, Route Handler | 🚨 HIGH |
| INV-04 미인증 접근 차단 | T-05, T-09, T-10 | Middleware matcher | ⚠️ MEDIUM |
| INV-05 수직 권한 상승 | T-08 | RLS 정책, 역할 판단 로직 | 🚨 HIGH |
| INV-06 AI 비용·프롬프트 | 없음 (WL-36 예정) | sanitize, rate limit 코드 | ⚠️ MEDIUM |
