# ARCHITECTURE.md — OpsNow White-label Site 시스템 구조

> **최종 업데이트**: 2026-04-08
> **기술 스택**: Next.js 15 App Router + Supabase + Vercel
> **상세 DB 스키마**: `docs/design/db-schema.md`
> **보안 정책**: `SECURITY.md`

---

## 1. 전체 시스템 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel Edge Network                       │
│                                                                  │
│  파트너A.opsnow.com  ──┐                                        │
│  파트너B.opsnow.com  ──┼──▶  proxy.ts  ──▶  App Router    │
│  cloud.partner.com  ──┘      (Edge Runtime)      (RSC/Actions)  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │        Supabase            │
                    │  PostgreSQL + Auth + RLS   │
                    └───────────────────────────┘
```

---

## 2. 멀티테넌트 라우팅 흐름

### Hostname 기반 파트너 식별

```
[요청] samsung.opsnow.com/
        │
        ▼
[proxy.ts] (Edge Runtime)
  1. request.headers.get('host') 로 hostname 추출
  2. Supabase anon client로 partners 테이블 조회
     - subdomain 또는 custom_domain 매칭
  3. partner_id를 request headers에 주입
     x-partner-id: <uuid>
  4. is_active = false 이면 404 또는 유지보수 페이지로 redirect
        │
        ▼
[layout.tsx] (Server Component)
  1. x-partner-id 헤더 읽기
  2. supabaseAdmin으로 파트너 테마 조회
     (primary_color, secondary_color, logo_url, favicon_url)
  3. CSS Variables를 style prop으로 주입:
     --primary: #0055FF
     --secondary: #F3F4F6
        │
        ▼
[page.tsx] (Server Component)
  파트너 컨텍스트를 활용한 콘텐츠 렌더링
```

### ⚠️ Edge Runtime 제약

`proxy.ts`는 Edge Runtime에서 실행되므로:
- Node.js 전용 모듈 (`fs`, `crypto`, `path`) 사용 불가
- `supabaseAdmin` (service_role key) 사용 불가 — anon client 사용
- 무거운 연산 불가 — 파트너 조회 후 즉시 headers에 주입하고 종료

---

## 3. 인증 레이어

```
┌─────────────────────────────────────────────────────┐
│                 클라이언트 요청                       │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │   Supabase Auth JWT      │
          │  (auth.uid() 추출)       │
          └────────────┬────────────┘
                       │
        ┌──────────────▼──────────────┐
        │      profiles 테이블        │
        │  get_my_role() 함수 조회    │
        └──────┬───────────┬──────────┘
               │           │
         master_admin  partner_admin
               │           │
               ▼           ▼
          전체 데이터    자사 데이터만
          (leads는      (RLS 자동 적용)
          masked_view)
```

---

## 4. Supabase 클라이언트 사용 경계

| 클라이언트 | 파일 | 사용 컨텍스트 | 비고 |
|-----------|------|------------|------|
| `createSessionClient()` (anon) | `src/lib/supabase/create-server-client.ts` | Server Components (쿠키 읽기 전용) | RLS 적용됨 |
| `createActionClient()` (anon) | `src/lib/supabase/create-server-client.ts` | Server Actions (쿠키 읽기+쓰기) | RLS 적용됨, 토큰 갱신 가능 |
| `supabaseAdmin` (service_role) | `src/lib/supabase/server.ts` | Route Handler 서버사이드 전용 | **RLS 우회** — 클라이언트에 절대 노출 금지 |

**`supabaseAdmin` 사용 허가 케이스**:
- `site_visits` Upsert (방문 카운터)
- `system_logs` INSERT (감사 로그 기록)
- 파트너 테마 조회 (layout.tsx — 성능 최적화 목적)
- 관리자용 대량 데이터 처리

---

## 5. 데이터 흐름

### 마케팅 사이트 (공개 — anon)

```
[방문자] → [middleware: 파트너 식별]
         → [layout.tsx: supabaseAdmin으로 테마 조회 (RLS 우회)]
         → [page.tsx: anon client로 published contents 조회]
         → [문의 폼 제출: anon으로 leads INSERT]
         → [Route Handler: site_visits Upsert (supabaseAdmin)]
```

### Admin 대시보드 (인증 필요)

```
[파트너 Admin 로그인] → [Supabase Auth JWT 발급]
                     → [Server Component: supabaseServer로 자사 데이터 조회]
                     → [RLS 자동 적용: 타사 데이터 차단]
                     → [Server Action: 콘텐츠 수정/리드 상태 변경]
```

### Master Admin 전용

```
[Master Admin 로그인] → [get_my_role() = 'master_admin' 확인]
                     → [leads 조회: leads_masked_view 경유 (PII 마스킹)]
                     → [파트너 관리: partners 전체 CRUD]
                     → [감사 로그: system_logs 조회]
```

---

## 6. 테마 주입 아키텍처

파트너별 브랜드 컬러는 **CSS Variables** 방식으로 전역 주입된다.

```tsx
// app/[...]/layout.tsx (Server Component)
const partner = await supabaseAdmin
  .from('partners')
  .select('primary_color, secondary_color, logo_url, favicon_url')
  .eq('id', partnerId)
  .single()

return (
  <html style={{
    '--primary': partner.primary_color,
    '--secondary': partner.secondary_color,
  } as React.CSSProperties}>
    {children}
  </html>
)
```

모든 UI 컴포넌트는 `var(--primary)`, `var(--secondary)`를 사용.
하드코딩된 컬러값 사용 금지.

---

## 7. 실시간 프리뷰 아키텍처 (예정)

Admin 대시보드에서 콘텐츠 수정 시 실시간으로 마케팅 사이트 프리뷰를 보여주는 기능.

```
[Admin 대시보드]  ──postMessage──▶  [iframe: 마케팅 사이트]
  (편집 UI)                          (프리뷰 렌더링)
       │                                    │
       └──── 저장 전 임시 상태 전달 ────────┘
             (DB 저장 없음, 메모리만)
```

**구현 시 주의사항**:
- iframe과 부모 창의 origin 검증 필수 (`postMessage` 수신 시 `event.origin` 확인)
- 프리뷰 상태는 메모리에만 존재 — 저장 버튼 클릭 시에만 Server Action 호출

---

## 8. 아키텍처 결정 기록 (ADR)

| 날짜 | 결정 | 근거 |
|------|------|------|
| 2026-04-08 | `partners_public_read`를 `anon` 전용으로 제한 | 파트너 어드민 간 경쟁사 정보 노출 차단 (WL-8) |
| 2026-04-08 | `site_visits` Upsert를 service_role 전용으로 제한 | 파트너 어드민의 방문 통계 임의 조작 방지 (WL-8) |
| 2026-04-08 | `get_my_role()` SECURITY DEFINER 함수 도입 | RLS 정책 내 profiles 재귀 조회 방지 (WL-8) |
| 2026-04-12 | Master Admin / Partner Admin **단일 도메인 + 역할 기반 분리** 채택 | 실질 보안은 RLS + `get_my_role()`이 담당하므로 URL 분리는 보안 이득 없이 복잡도만 증가. 모든 master_admin 전용 경로는 Server Component에서 역할 검증 후 렌더링 (WL-60) |
