@AGENTS.md

# CLAUDE.md - OpsNow White-label Site Builder - Operational Guide

## [0. Source of Truth & Context]

- **CLAUDE.md가 운영의 최상위 권위(SSOT)다.** Claude는 세션 시작 시 이 파일을 읽고 행동 지침으로 삼는다.
- Confluence Space `WS`는 **결과물 저장소(Archive)** 역할이다. 설계 배경·장기 히스토리 참조용이며, 운영 규칙 충돌 시 CLAUDE.md가 우선한다.
- **Space**: `WS` / **cloudId**: `opsnowinc.atlassian.net`
- **Space Homepage ID**: `290849306`
- 작업 전 배경 파악이 필요할 때만 `getConfluencePage`로 관련 문서를 선택적으로 조회하라.
- 세션이 길어지면 컨텍스트를 스스로 리프레시하라.
- **Confluence 이미지 보존**: `updateConfluencePage` 전 반드시 `getConfluencePage(contentFormat: "adf")`로 읽는다. ADF에 `mediaSingle` / `mediaGroup` 노드가 있으면 **ADF 형식으로 업데이트**하여 media 노드를 원문 그대로 유지한다. markdown 덮어쓰기 금지.
- **Confluence 작성 원칙**: 기술 스펙(컬럼명·타입·구현 상세)은 코드·`db-schema.md`가 SSOT. Confluence에는 AC(완료 기준)·설계 배경·동작 설명만 기록한다.

**Confluence Page ID 목록 및 Archive 보관 현황** → `docs/confluence-index.md` 참조. **Confluence 작업 전 반드시** 이 파일을 먼저 읽을 것. Archive 페이지(Deprecated/Superseded)는 신규 작업 참조 금지 — 목록은 동 파일 내 명시.

## 파급력·비가역성 기반 4트랙 워크플로우 (Harness Engineering v2.1)

모든 작업은 **파급력(Blast Radius)** 과 **비가역성(Irreversibility)** 두 축으로 트랙을 결정한다.  
등급 판단이 불확실하면 한 단계 높은 트랙을 적용한다 (Fail-safe 원칙).  
상세 판단 기준 및 Opus 업그레이드 조건 → `docs/model-matrix.md`

### 트랙 분류표

| 트랙 | Jira Tech Risk | 정의 | 프로젝트 특화 예시 | 권장 모델 | 단계 |
|------|---------------|------|-------------------|-----------|------|
| **Low** | `🟩Low` | 파급력 없음, 즉시 롤백 가능 | UI/CSS 수정, i18n 번역 문구, 문서화 | Sonnet | Impl → Verify → Deploy → Done |
| **Med** | `🟫Med` | 단일 도메인 기능 변경, 롤백 가능 | 신규 페이지·CRUD, API 연동, 상태 관리 로직 | Sonnet\* | Context → Design → Audit → Impl → Verify → Deploy → Report |
| **High** | `🟨High` | 전사 장애·데이터 유출 가능, 비가역적. 복구 경로 명확 | 기존 테이블 nullable 컬럼 추가, 신규 인덱스, CHECK 제약 확장 | **Opus** | Context → Design → Audit → Human(비동기) → Impl → Verify → Deploy → Report |
| **Critical** | `🟥Critical` | 권한 모델·데이터 파괴 가능, 비가역적 | DB Migration, RLS 정책, Auth Flow, 보안 헬퍼 신설 | **Opus** | Context → Design → Audit → Human(동기) → Impl → Verify → Deploy → Report |

> \* Med이라도 Opus로 자동 승격되는 조건이 있다 — `docs/model-matrix.md` §2 참조.

### 자동 Critical 승격 규칙

아래 파일·영역은 변경 내용과 무관하게 **무조건 Critical 트랙**으로 자동 승격한다.

- `src/proxy.ts` / `src/middleware.ts` 변경
- `src/lib/auth/` 하위 파일 변경
- Admin 쿠키·세션 격리 로직 수정

### 모델 미표기 시 기본값

작업 선언에 모델이 명시되지 않은 경우 **Opus를 기본값**으로 사용한다.

---

### Low 트랙 (자율 진행)

1. **Impl**: 구현. 테스트 코드를 함께 작성한다 (아래 테스트 원칙 참조).
2. **Verify**: `npm run lint` + `npx tsc --noEmit` 실행.
3. **Deploy**: `git push origin main` → CI 통과 → Vercel 자동 배포 완료 확인. Vercel 대시보드에서 배포 상태 green 확인.
4. **Done**: 필요 시 Jira 상태 업데이트.

---

### Med 트랙 (표준 절차)

1. **Context**: Jira 티켓 확인. 필요 시 Confluence 관련 문서 조회. **트랙 등급·스코프 항목·완료 기준(AC)·영향 파일을 즉시 선언한다 — 사람의 추가 지시를 기다리지 않는다.**
2. **Design**: 구현 방향 정리 (컴포넌트 구조, 데이터 흐름). 코드 작성 금지.
3. **Audit**: Self-Audit — 실제 발견된 위험 요소만 보고 (개수 무관, 없으면 "없음"으로 명시). 보고 형식: `"Audit 결과: [위험 요소 또는 '없음']. [수정 방향 또는 '다음 단계 진행']."`
4. **Test Contract**: Impl 착수 전 반드시 아래를 수행한다. **이 단계를 건너뛰고 구현 코드를 작성하는 것을 금지한다.**
   - **테스트 종류 판단**: 이 기능에 Unit(Vitest)과 E2E(Playwright) 중 무엇이 적합한지 근거와 함께 명시한다.
     - 파서/헬퍼/변환 로직 → Unit Test.
     - 브라우저에서 사용자에게 보이는 결과가 있는 기능 → E2E Test 필수.
     - 둘 다 해당하면 둘 다 작성.
   - **기존 테스트 영향 분석**: 이번 변경이 영향을 주는 기존 테스트 파일 목록을 제시한다. 없으면 "영향받는 기존 테스트 없음" 명시.
   - **Stub 생성**: `test.todo('시나리오')` (E2E) / `describe.todo('함수명 — 입출력 명세')` (Unit) 로 stub 파일 생성.
   - **데이터 변환 검증**: `TYPE ... USING` 또는 대량 `UPDATE ... SET`이 포함된 마이그레이션의 경우, 영향받는 컬럼의 실제 데이터 샘플 5행 이상의 변환 전/후 상태를 Test Contract에 명시한다. 샘플에 NULL, 빈 문자열(`''`), 특수문자, 예상치 못한 JSON 구조(평문 vs JSON-shaped 혼재 등)가 포함된 행을 반드시 포함하여 변환 로직의 무결성을 증명한다.
   - **Test Contract 없이 Impl 단계 진입 불가.**
5. **Impl**: 아래 3가지를 함께 수행한다.
   - (a) 기능 구현 코드 작성.
   - (b) Test Contract의 stub을 실제 passing 테스트로 교체.
   - (c) **기존 테스트 동기화**: 이번 변경으로 기존 테스트의 기대값/locator가 맞지 않게 된 경우 함께 수정한다. 새 테스트만 추가하고 기존 테스트를 방치하지 않는다.
   - 완료 후 보고: 추가된 새 테스트 목록 + 수정된 기존 테스트 목록.
6. **Verify**: **사람의 지시 없이 자율 실행한다.** 아래 4단계를 순서대로 실행한다. **4개 모두 에러 0개가 완료 기준이다.**
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npx vitest run`
   - `npx playwright test` — 기존 테스트 포함 전체 실행. 실패 시 A/B/C 버킷으로 원인 분류 후 보고.
   - **Verify 전 통과 시 git 커밋 + push를 한 세트로 제안한다.** (`git status`로 untracked·수정 파일 확인 후 적절한 커밋 단위 제시 → 커밋 후 `git log origin/main..HEAD --oneline` 확인 후 push 제안)
7. **Deploy**: CI 통과 + Vercel 자동 배포 완료 확인. 변경된 기능을 브라우저에서 smoke check. 이상 시 Vercel Instant Rollback.
8. **Report**: Jira 댓글 업데이트 (아래 양식 참조).

---

### High / Critical 트랙 (안전 우선)

1. **Context**: Jira 티켓 확인 + Confluence 설계 문서 인덱싱. **트랙 등급·스코프 항목·완료 기준(AC)·영향 파일을 즉시 선언한다 — 사람의 추가 지시를 기다리지 않는다.**
2. **Design**: 아키텍처 설계안 작성 (데이터 흐름, 파트너 격리 전략 포함).
3. **Audit**: Security Auditor를 **별도 sub-agent로 분리 스폰**하여 교차검증 수행. 스폰 프롬프트 → `docs/agents/auditor.md §6`.
   - sub-agent 결과를 메인 컨텍스트로 통합한 뒤 Auditor Digest 초안을 작성한다.
   - Admin 기능 변경이 포함된 경우: `/admin-security-check` 스킬을 추가로 실행한다.
4. **✋ Human Check**: 문경 님 승인 대기. **승인 없이 다음 단계로 진행 불가.**
5. **Test Contract**: Human Check 승인 후, MED 트랙 Step 4와 동일한 절차를 수행한다.
   - 테스트 종류 판단 (Unit vs E2E) + 기존 테스트 영향 분석 + stub 생성.
   - **Test Contract 없이 Impl 단계 진입 불가.**
6. **Impl**: MED 트랙 Step 5와 동일 — 구현 + stub 교체 + 기존 테스트 동기화.
7. **Verify**: MED 트랙 Step 6과 동일 — lint + tsc + vitest + **playwright** 4단계 전부 실행. Verify 전 통과 시 git 커밋 + push를 한 세트로 제안한다.
8. **Deploy**: CI 통과 + Vercel 배포 완료 확인. Admin·마케팅 사이트 양측 smoke check. DB 마이그레이션 포함 시 데이터 무결성 확인 쿼리 실행. 이상 시 Vercel Instant Rollback + DB 롤백 절차 실행.
9. **Report**: Jira 댓글 업데이트 + Auditor Digest를 `docs/audits/{ticket_id}.md`에 저장.

---

### High 트랙 vs Critical 트랙 — Human Check 방식

두 트랙은 **데이터 파괴 가능성**과 **권한 모델(RLS·Auth) 영향도**를 기준으로 나뉜다. 분류에 따라 Human Check 방식이 달라진다.

| 트랙 | Jira Tech Risk | 대상 작업 | Human Check 방식 |
|------|---------------|----------|-----------------|
| **Critical** | `🟥Critical` | RLS 정책 신규·변경, 신규 테이블 + RLS 정책 동반 설계, Column Type 변경, Data Update/Backfill 마이그레이션, Auth·Proxy·Session 로직, Column Drop, Table Drop | **동기식 승인** — 세션 내 설계안 대면 검토 후 명시적 승인. 승인 없이 Impl 진입 불가. |
| **High** | `🟨High` | 기존 테이블에 nullable Column 추가, 신규 Index(`CONCURRENTLY` 권장), CHECK 제약 확장(관용 방향), 단순 보조 인덱스 추가, 복구가 명확한 스키마 추가 | **비동기 승인** — Design + Audit 결과를 Jira 댓글로 보고하고 문경 님의 댓글 승인으로 대체 가능. 응답 대기 중에도 Test Contract 작성까지는 진행 가능, Impl은 승인 후. |

**판단 원칙**:
- **불확실하면 Critical** — Fail-safe. 분류가 모호한 경우 항상 상위 등급 적용.
- **High는 "덜 중요"가 아니라 "복구가 쉬움"을 의미** — 잘못 생성된 인덱스 하나가 쿼리 플랜을 꼬을 수 있다. High라고 방심하지 않는다.
- **Critical 자동 승격 조건**: 다음이 하나라도 포함되면 High 대상 작업이라도 Critical로 승격.
  - 기존 행(row)에 대한 UPDATE/변환이 포함된 마이그레이션
  - 신규 테이블이지만 RLS 정책이 미정인 상태
  - 여러 테이블을 가로지르는 FK·트리거 신설

---

### 테스트 원칙 (모든 트랙 공통)

- **테스트 레이어 기준**: 파서/헬퍼 로직 → Vitest 단위 테스트. UI 렌더링·라우팅·사용자 흐름 → Playwright E2E. 단순 presentational 컴포넌트는 파서 단위 테스트 + E2E 조합으로 충분하며 컴포넌트 렌더 단위 테스트를 강제하지 않는다.
- **Admin E2E 4대 필수 시나리오**: Admin 기능의 E2E 테스트는 아래 4가지를 모두 포함해야 한다.
  - (1) Happy Path — 정상 CRUD 동작 확인.
  - (2) 권한 차단 — 권한 없는 역할이 접근 시 차단 확인.
  - (3) 입력 검증 — 잘못된 입력 시 에러 표시 확인.
  - (4) 데이터 격리 — 파트너 간 데이터 분리 확인.

---

### Jira 댓글 양식 (Med·High·Critical 공통)

- 작업 상태: [Success / Partial / Fail]
- 수정된 주요 파일: [파일명 목록]
- Verify 결과: lint [N] errors / tsc [N] errors
- 테스트 결과: Vitest [N]개 통과 / Playwright [N]개 통과, [N]개 실패, [N]개 skip
- 추가/수정된 테스트 파일: [파일명 목록]

> ⚠️ "테스트 결과" 란에 `lint/tsc 0 errors`를 기재하지 않는다. lint/tsc는 Verify 항목이지 테스트가 아니다. 테스트 결과에는 반드시 Vitest와 Playwright 실행 결과만 기재한다.

**Auditor Digest** (Critical 트랙 필수 — `docs/audits/{ticket_id}.md`에 저장):

```
### Auditor Digest
- **Core Logic**: [구현 핵심 — 3줄 이내]
- **Identified Risks**: [발견된 실제 위험 요소. 없으면 "없음"]
- **Human Check 승인 포인트**: [문경 님이 확인한 사항]
```

## Human-in-the-loop Breakpoints (필수 중단점)

다음 상황이 발생하면 Claude는 **즉시 작업을 멈추고 문경 님의 명시적 승인**을 기다려야 한다. 승인 없이 다음 단계를 진행하는 것을 금지한다.

1. **DB Schema 변경**:
   - 기존 테이블 구조 변경, 컬럼 삭제, 혹은 대규모 Migration SQL을 실행하기 직전.
2. **Security & Auth 정책 결정**:
   - Supabase RLS 정책의 신규 생성/수정, 인증(Auth) 로직의 근간을 건드리는 작업을 수행할 때.
3. **외부 비용 및 리소스 연동**:
   - 유료 API 연동, Vercel 설정 변경 등 비용이나 외부 설정이 개입될 때.
4. **Conflict 발생**:
   - Architect와 Auditor 간의 의견 차이가 2회 이상 반복되어 의사결정이 교착 상태에 빠질 때.
5. **아키텍처 트레이드오프**:
   - 성능(Performance)과 보안(Isolation) 간 트레이드오프가 발생하여 방향 결정이 필요할 때.

### 마이그레이션 실행 운영 규칙 (2026-04-08 확정)

> **배경**: Supabase CLI는 내부 `supabase_migrations` 테이블에서 **파일명 단위**로 실행 여부를 추적한다.
> 이미 실행된 파일의 내용을 수정해도 CLI는 변경을 감지하지 않으므로, 기존 파일 수정은 SQL Editor로만 적용 가능.

| 작업 유형 | 실행 도구 | 하네스 공정 |
|---|---|---|
| 기존 마이그레이션 파일 수정 (Fix/Hotfix) | **SQL Editor 직접 실행** | 멱등성 코드 확인 → 사람 승인 → 실행 |
| 신규 기능 마이그레이션 (새 파일 생성) | **`supabase db push`** | 새 파일 생성 → db push → Jira 기록 |
| RLS/보안 핵심 로직 변경 | **SQL Editor (필수)** | Auditor Digest 생성 → 교차 검증 후 실행 |

- Claude는 `supabase db push`를 **신규 마이그레이션 파일** 적용 시에만 자율 실행할 수 있다.
- 기존 파일 수정 결과를 실서버에 반영하는 `supabase db push`는 **효과가 없으므로 사용하지 않는다**.
- DB/RLS 변경의 실서버 반영은 위 Breakpoint #1·#2에 따라 항상 문경 님이 직접 SQL Editor에서 실행한다.
- **Drift Precheck (신규 파일 작성 전)**: 신규 마이그레이션 파일을 작성하기 전 `npx supabase migration list`를 실행하여 로컬에 존재하나 클라우드에 미적용된 이전 마이그레이션이 있는지 확인한다. 미적용 이력이 있으면 그것을 먼저 적용(또는 회수)하기 전까지 신규 마이그레이션 작성을 **중단한다**. 미적용 파일 위에 새 마이그레이션을 쌓으면 Dead Code와 드리프트가 누적된다.
- **Shadow Migration Check (작성 직후)**: 마이그레이션 파일 작성 직후 `npx supabase migration up` (로컬 DB 대상) 실행 결과를 확인한다. 로컬 데이터와 맞지 않아 실행이 불가능한 경우 "일단 스킵"으로 파일만 저장하지 않는다 — 그 마이그레이션은 Dead Code가 되어 향후 환경 초기화 및 복구를 불가능하게 한다. 로컬 실행이 불가능하면 데이터 픽스처를 먼저 정리하거나, 클라우드 전용임을 헤더 주석으로 명시하고 Human Check에서 별도 승인받는다.

## [1. Core Commands]

- **Development**: `npm run dev` (로컬 개발 서버 실행)
- **Build**: `npm run build` (프로덕션 빌드 및 에러 체크)
- **Lint**: `npm run lint` (코드 컨벤션 및 문법 검사)
- **Type Check**: `npx tsc --noEmit` (TypeScript 타입 안정성 검사)
- **Supabase Type Gen**: `npx supabase gen types typescript --project-id gzkmsiskdbtuxpeaqwcp > src/types/supabase.ts` (DB 스키마 변경 시 필수 실행)
- **Add shadcn Component**: `npx shadcn@latest add [component-name]` (UI 컴포넌트 추가 시 사용)

## [2. Coding Style & Patterns]

- **Framework**: Next.js 16.2.2 App Router (기본적으로 React Server Components 사용 권장). 코드 작성 전 `node_modules/next/dist/docs/`의 관련 가이드를 참조하라.
- **Naming Conventions**:
  - Components: `PascalCase.tsx` (예: `HeroSection.tsx`, `PartnerLogo.tsx`)
  - Hooks/Utils/Lib: `kebab-case.ts` (예: `use-partner-theme.ts`, `supabase-client.ts`)
- **Imports**: 절대 경로 별칭(`@/`)을 사용하라.
  - 예: `import { Button } from "@/components/ui/button"`
- **Data Fetching**: 데이터 조회는 가급적 Server Components에서 수행하고, 데이터 변경(Mutation)은 Server Actions를 사용하라.

## [3. Multi-tenant Architecture Rules]

- **Partner Context**: 모든 데이터 요청 전에는 반드시 `partner_id` 컨텍스트가 확보되었는지 확인하라.
- **Proxy**: `proxy.ts`는 Edge Runtime에서 동작하므로 Node.js 전용 라이브러리(fs, crypto 등)를 사용하지 마라.
- **Theme Injection**: 파트너별 테마 컬러는 `layout.tsx`에서 CSS Variables로 주입하여 전역 컴포넌트가 참조하게 하라.

### 3.1 Admin Mutation Rules (데이터 변경 시 필수)

- **Partner-Scoped Mutation Guard**: 모든 UPDATE/DELETE 쿼리에 반드시 `WHERE partner_id = (현재 사용자의 partner_id)` 조건을 포함한다. `master_admin`만 다른 파트너 데이터에 접근 가능. 이 조건 없는 mutation 코드를 절대 작성하지 않는다.
- **Server Action 7단계 보안 체크체인**: Admin의 모든 Server Action은 아래 순서를 따른다. 단계를 건너뛰지 않는다.
  1. 인증 확인 (세션 유효성)
  2. 역할 확인 (해당 작업 권한이 있는 역할인가)
  3. 소유권 검증 (`partner_admin`이면 자기 파트너 데이터만 접근 가능)
  4. 입력 검증 (Zod `safeParse`)
  5. 변경 실행 (DB mutation)
  6. 감사 로그 (`system_logs`에 who/what/when/detail 기록)
  7. 캐시 무효화 (`revalidatePath` / `revalidateTag` 호출)
- **역할 체크 위치**: 데이터 접근 권한 검증은 반드시 **Server Component 또는 Server Action**에서 수행한다. Client Component의 역할 기반 UI 분기(버튼 숨기기 등)는 UX 편의일 뿐 보안 수단이 아니다.
- **캐시 무효화 필수**: Server Action에서 DB 변경 후 `revalidatePath`/`revalidateTag`를 호출하지 않으면 사용자에게 변경사항이 보이지 않는다. 모든 mutation Server Action에 캐시 무효화를 포함한다.
- **감사 로그 필수**: Admin의 모든 데이터 변경 Server Action에 감사 로그를 포함한다. 감사 로그 없는 mutation Server Action은 Verify 미통과다.

### 3.2 Admin 선행 인프라 규칙

Admin 첫 기능 티켓 착수 전 다음 인프라의 존재를 확인한다:
1. **인증 미들웨어** — Admin 라우트에 미인증 접근 차단
2. **역할 컨텍스트** — Server Component에서 현재 사용자의 role/partner_id 접근 가능
3. **Server Action 표준 헬퍼** — 7단계 보안 체크체인을 캡슐화한 재사용 함수
4. **폼 검증 패턴** — Zod 스키마 + `useActionState` + 인라인 에러 표시
5. **Playwright Auth Fixture** — `storageState` 기반 인증 세션 재사용

하나라도 미준비 시 해당 인프라 구축을 먼저 수행한다.

### 3.3 Content Draft/Publish 규칙 (2026-04-17 확정)

- **Draft 콘텐츠 비노출**: `is_published = false`인 콘텐츠는 마케팅 사이트에 노출하지 않는다. RLS 정책에 `is_published = true` 조건을 반드시 포함한다. 미리보기는 Site Builder의 iframe으로 대체한다.
- **섹션별 개별 Publish**: 일괄 게시(Batch Publish) 기능은 MVP 스코프 밖이다. 각 섹션은 독립적으로 즉시 반영된다.
- **즉시 반영**: Publish 클릭 즉시 `is_published = true`로 업데이트하고 `revalidatePath`를 호출한다. 예약 게시는 MVP 이후 검토한다.

### 3.4 스케일 설계 원칙 (2026-04-19 확정 — PRD §5 NFR 연동)

> **권위 문서**: `PRD §5 비기능 요구사항(NFR)` (Confluence 289636366).  
> 이 섹션은 NFR을 개발 실행 규칙으로 변환한 집행 지침이다.  
> **목표**: 단일 인스턴스에서 100+ 파트너를 수용하면서 격리·성능·감사를 유지한다.

**[규칙 1] Tenant Scoping — 모든 쿼리에 파트너 경계 명시**

- 파트너 스코프 테이블(`partners`, `contents`, `leads`, `partner_sections`, `system_logs` 등)의 모든 SELECT/UPDATE/DELETE에 `partner_id` 조건을 포함한다.
- `master_admin` 전용 쿼리만 예외 허용. 예외 시 코드 주석으로 이유를 명시한다.
- **위반 감지**: `partner_id` 없는 파트너 스코프 쿼리는 Audit Gate에서 차단된다.

**[규칙 2] Feature Toggle — DB 플래그 우선 확장**

- 파트너별 기능 차이는 코드 분기(`if partnerId === '...'`)가 아닌 `partners.features JSONB` 또는 전용 feature_flags 테이블로 제어한다.
- 새 기능 추가 시 먼저 DB 플래그 설계를 선행하고, 코드는 플래그를 읽는 패턴으로 작성한다 (`hasFeature(partner, 'feature_name')`).
- 코드 배포 없이 파트너별 기능 ON/OFF가 가능해야 한다.

**[규칙 3] Metadata-driven — 설정은 DB, 로직은 코드**

- 파트너별 설정(테마·도메인·언어·알림 이메일 등)은 모두 DB 컬럼으로 관리한다.
- 특정 파트너의 설정값을 코드에 하드코딩하는 것을 금지한다.
- 새 설정 항목이 필요하면 `partners` 테이블 컬럼 추가 → Admin UI → DB 저장 패턴을 따른다.

**[규칙 4] Audit Scalability — 파트너별 직접 필터링 가능**

- `system_logs` 신규 이벤트 기록 시 `partner_id`를 함께 저장한다 (WL-Ticket-A 이후 적용).
- 현재(`partner_id` 컬럼 미존재 시점)는 `on_behalf_of`를 활용한다.
- 감사 로그 조회가 `JOIN partners` 없이 `WHERE partner_id = ?` 단일 조건으로 가능해야 한다.

**[규칙 5] DB 커넥션 격리 — Transaction Pooler 전용**

- 모든 서버사이드 Supabase 클라이언트는 **Transaction Pooler 엔드포인트**를 사용한다. Session Mode 사용 금지.
- 파트너 수 증가 시 DB 커넥션 수가 선형적으로 증가하지 않아야 한다 (Noisy Neighbor 방지).

**[규칙 6] 파트너 자산 외부 URL 전용**

- 로고·파비콘·이미지 등 파트너 자산은 반드시 **Supabase Storage URL 또는 CDN URL**로 참조한다.
- 로컬 파일시스템 경로(`/public/`, `./assets/` 등) 참조 금지 — 빌드 번들 비대화 및 파트너 간 혼용 방지.

## [4. Security & Privacy Enforcement]

> **⚠️ 보안 상세 규칙은 `SECURITY.md`를 참조하라.** 이 섹션은 핵심 원칙만 요약한다.

- **Masking**: `leads` 관련 API는 `master_admin`에게 반드시 `leads_masked_view`를 통해서만 데이터를 반환하라. 직접 테이블 접근 금지.
- **RLS Policy**: 테이블 생성 혹은 수정 시 반드시 관련 RLS 정책을 함께 작성하고, `SECURITY.md`의 접근 행렬을 업데이트하라.
- **service_role 격리**: `supabaseAdmin`(service_role key)은 서버사이드에서만 사용. 클라이언트 컴포넌트에 절대 노출 금지.
  - **허가된 Route Handler**: `/api/visits/upsert`, `/api/admin/logs`, `/api/auth/provision`, `/api/admin/domain-approval` (4개 한정).
  - **허가된 서버 전용 라이브러리**: `src/lib/audit/`, `src/lib/auth/` 하위 헬퍼. 이 모듈들은 Server Component·Server Action·Route Handler 전용으로 클라이언트 번들에 포함되지 않는다. 직접 `supabaseAdmin`을 import하여 `writeAuditLog`처럼 공유 함수를 호출할 수 있다. 클라이언트 노출 여부는 `'use client'` 디렉티브 부재 + 호출자가 server-only 경로임을 보장.
  - **허가된 marketing Server Action (WL-154)**: `src/app/[partnerId]/actions/leads.ts` `submitLead` 1건 한정. 사유: DEBT-007 Issue 2 해소 — `leads_public_insert` anon RLS 정책 제거에 따라 marketing 리드 수집 경로가 Server Action + service_role 전용으로 전환. 신뢰 경계는 `host` 헤더 기반 `resolvePartnerIdFromHost()` 서버 도출값이 유일하며, FormData의 어떠한 user-supplied 값(특히 `partner_id`)도 INSERT payload로 전달되지 않는다(`leadSchema.strict()` + payload 순서로 이중 방어). **여기 외 marketing 계층에서 `supabaseAdmin` 신규 사용은 Auditor 사전 승인 + Critical 트랙 + 본 목록 개정을 동반한다.**
- **Server Action 인증 필수**: Admin 영역의 모든 Server Action은 실행 시작 시 반드시 세션 유효성과 역할 권한을 확인한다. 인증 체크 없는 Server Action을 작성하지 않는다.
- **입력 검증 경계**: 사용자 입력(폼 데이터, URL 파라미터)은 반드시 Server Action 진입 시점에서 Zod 스키마로 검증한다. 클라이언트 검증은 UX 편의이며, 서버 검증을 대체하지 않는다.

## [5. Design Documentation Sync]

- **DB Schema Diagram Sync**: DB 스키마(테이블 생성/수정/삭제, 컬럼 변경) 시 반드시 `docs/design/db-schema.md`의 Mermaid ERD를 함께 업데이트하라.
- **Type Sync**: DB 변경 후 `npm run gen:types`를 실행하여 TypeScript 타입을 동기화하라.
- **Auditor Digest 영속화**: High·Critical 트랙 완료 시 아래 기준으로 Digest를 기록한다.

  | 구분 | 판단 기준 | Digest 저장 |
  |------|----------|------------|
  | **Critical** | RLS·Auth 설계, 트리거·ENUM 신설, 멀티테넌시 핵심 로직 — 설계 의도가 코드만으로 파악 불가 | `docs/audits/{ticket_id}.md` **필수** |
  | **High** | 단순 컬럼 추가·인덱스·환경변수 추가 등 물리적 변경이 명확한 작업 | Jira 댓글로 대체 |

  - 템플릿: `docs/audits/_template.md` 참조
  - 파일명 예시: `docs/audits/WL-9.md`, `docs/audits/WL-31.md`
  - 채팅에만 존재하는 Digest는 세션 종료 시 소실되므로 반드시 파일로 커밋할 것.
  - 판단이 불확실하면 Critical로 간주한다 (Fail-safe 원칙).

## [6. Verification Workflow]

1. **환경 변수 관리**: 새로운 환경 변수가 필요한 경우 직접 `.env`를 수정하지 말고, **문경 님**에게 변수명과 용도를 보고한 뒤 추가를 요청하라.
2. Confluence Page ID `289308723` (6. 테스트 케이스)를 기준으로 작업 성공 여부를 검증하라.

## [7. Token Management & Optimization]

1. **Ignore Rules**: 프로젝트 루트의 `.claudeignore`에 명시된 파일과 폴더는 분석 대상에서 제외한다.
2. **Selective Reading**: 모든 파일을 한꺼번에 읽지 말고, 작업 중인 Jira 티켓과 직접 연관된 파일 위주로 `read_file`을 실행하라.
3. **Session Refresh**: 대화가 길어져 컨텍스트 토큰이 임계치에 도달하면 문경 님에게 보고하고 세션을 새로 시작할 것을 제안하라.
4. **Session Wrap — 일지 작성 안전망**: 사용자가 "세션 종료", "오늘 마무리", "내일 보자", "정리" 등 세션 종료 신호를 보내면 오늘 날짜의 `docs/journal/YYYY-MM-DD.md` 파일 존재 여부를 확인한다.
## [8. Harness Enforcement Rules (강제 이행 규칙)]

**Med·High·Critical 트랙의 Design·Audit·Impl 단계 답변** 최상단에는 반드시 아래 [Status Header]를 포함해야 한다.  
Low 트랙·단순 질의응답·현황 조회는 생략 가능하다.  
헤더가 누락된 Med·High·Critical 트랙 작업은 무효로 간주한다.

**[Status Header Format]**

- **Track**: [Low / Med / High / Critical]
- **Jira Tech Risk**: [🟩Low / 🟫Med / 🟨High / 🟥Critical]
- **Current Phase**: [현재 단계명 — Design / Audit / Impl / Verify / Report]
- **Audit Status**: [완료 (위험 N건 발견) / 없음 (Low 트랙) / 대기중]
- **Human Check**: [불필요 (Low·Med·High 비동기 승인 완료) / 대기중 / 승인완료 (날짜)]

**이행 원칙**:

0. **Work Item Declaration Gate**: Med·High·Critical 트랙에서 티켓 번호 또는 URL이 제공되면, Claude는 사람의 추가 지시 없이 즉시 "Context 단계 필수 출력 형식"에 따라 스코프 항목과 완료 기준을 선언한다. 이 선언 없이 Design 단계로 진입하는 것을 금지한다.
1. **Audit Gate**: Med·High·Critical 트랙에서 Audit 없이 Impl로 진행할 수 없다. 위험이 없더라도 "위험 요소 없음"을 명시해야 통과된다.
2. **Test Contract Gate**: Med·High·Critical 트랙에서 Test Contract 없이 Impl로 진행할 수 없다. Test Contract에는 (a) 테스트 종류 판단 근거, (b) 기존 영향 테스트 목록, (c) stub 파일 생성이 모두 포함되어야 한다. "테스트 계획 없음"은 Impl 진입 거부 사유다. **Claude는 사람의 지시를 기다리지 않고 Design→Audit 후 자동으로 Test Contract를 생성한다.**
3. **Self-Stop**: Audit 또는 Test Contract를 건너뛰고 구현을 시도하려 하면 스스로 오류를 선언하고 해당 단계로 돌아간다.
4. **Test Sync Gate**: Impl 완료 시, 기존 테스트 중 이번 변경으로 영향받는 것이 수정되지 않았으면 Verify로 진행할 수 없다. 새 테스트만 추가하고 기존 테스트를 방치하면 녹색 인플레이션(통과 수만 늘고 실패 방치)이 발생한다.
5. **Regression Gate**: `npx playwright test`에서 기존 테스트가 1건이라도 실패하면 Verify 미통과다. 실패 원인을 아래 버킷으로 분류하여 보고한다.
   - **A(앱 버그)**: 앱 자체가 잘못 동작 → 앱 코드 수정.
   - **B(테스트 부정합)**: 앱은 정상이지만 기대값/locator가 현재 앱과 불일치 → 테스트 수정.
   - **C(데이터 불일치)**: 앱·테스트 모두 정상이지만 DB 데이터가 테스트 전제와 다름 → 시딩 수정.
6. **Error Escalation**: `lint`·`build` 에러 발생 시 원인을 분석하여 수정안을 문경 님에게 보고하고 승인받은 뒤 수정한다.
7. **High/Critical Human Gate**: High·Critical 트랙의 Human Check는 절대 생략 불가. 승인 전 Impl 시작 금지.
8. **Report Accuracy**: Jira 댓글의 "테스트 결과"에 lint/tsc 결과를 기재하지 않는다. Vitest와 Playwright 실행 결과만 기재한다.

### God Component 거버넌스 (WL-149)

`eslint.config.mjs`에 `max-lines: 300` + `complexity: 15` 규칙이 도입되어 있다. 위반 시 개발자는 아래 우선순위로 대응한다.

1. **컴포넌트 분할**: 단일 파일이 UI + 상태 + 외부 통신을 모두 담고 있다면 `_components/` `_hooks/` 하위로 분리한다. 예시: WL-147 `usePreviewBridge` 훅 분리.
2. **선언적 패턴 도입**: `if (type === 'A') { ... } else if (type === 'B') { ... }` 조건 분기가 반복된다면 데이터 기반 스키마로 전환한다. 예시: WL-148 `SECTION_FIELDS` + `SectionFormRenderer`.
3. **기존 부채에 편승 금지**: `eslint.config.mjs`의 개별 `max-lines` override(proxy.ts 500 / parsers.ts 500 / FaqHubClient.tsx 400 등)는 **Ratchet 방식** — 현재 수치를 상한으로 고정하고 개선 시 하향만 허용한다. 신규 코드 작성 시 기존 override 숫자 이하로 유지하고, 가능하면 축소 커밋을 함께 제안한다.
4. **Complexity warn 누적 방지**: `complexity: 15` 경고가 `warn` 상태라도 신규 코드에서는 발생시키지 않는다. 기존 warn은 점진 개선 대상이며 리팩터 기회가 있을 때 함께 처리한다.
5. **불가피한 초과 시**: tech-debt.md에 DEBT 신규 등록 후 `eslint.config.mjs`에 개별 override를 추가한다. 무단 override 금지.
6. **`partners.features` 접근 규칙 (WL-151)**: `partner.features.xxx` 직접 접근 금지 — ESLint `no-restricted-syntax`가 차단한다. 반드시 `hasFeature(partner, 'key')` 경유. Zod 런타임 검증 우회 방지. `src/lib/features/**` 하위만 예외(구현 레이어).

### 외부 LLM 피드백 검증 원칙

외부 LLM 기능 변경 제안 시 → `/aisend` 스킬로 코드베이스 교차검증 후 문경 님 보고. Low 트랙(텍스트·CSS·오탈자)은 일반 절차. 외부 피드백은 **참고 자료**이며 **구현 지시가 아니다**.

## [9. UI/Frontend Standards]

> §2 Coding Style과 함께 읽는다.

### 9.1 Component Strategy (컴포넌트 우선순위)

- **shadcn/ui 우선**: 모든 기능성 UI 요소(`Button`, `Input`, `Sheet`, `Form` 등)는 반드시 `@/components/ui`의 shadcn 컴포넌트를 사용한다.
- **설치 요청**: 필요한 컴포넌트가 없으면 직접 구현하지 말고 문경 님에게 `npx shadcn@latest add [component]` 실행을 요청한다.
- **레이아웃 예외**: `<section>`, `<article>`, `<main>`, `<aside>` 및 Grid/Flex 래퍼 목적의 `div`는 허용한다. 단, 스타일링이 포함된 기능적 UI 요소는 shadcn으로 대체한다.

### 9.2 Tailwind & Theming (테마 체인 보호 — 화이트라벨 핵심)

- **시맨틱 클래스 전용**: `bg-primary`, `text-foreground`, `text-primary-foreground`, `border-input`, `bg-secondary` 등 CSS Variable 기반 클래스만 사용한다.
- **하드코딩 금지**: Hex 코드(`#1E40AF`)나 Tailwind 정적 색상(`bg-blue-500`, `text-gray-700`)을 컴포넌트 내부에 직접 사용하지 않는다.
  - **이유**: `bg-blue-500`이 단 한 곳이라도 있으면 파트너 테마 전환 시 해당 요소만 색상이 고정되어 테마 체인이 깨진다.
- **Arbitrary Values 최소화**: `h-[543px]` 같은 임의값 대신 Tailwind 표준 스케일(`h-64`, `gap-6`)을 우선 사용한다. 디자인상 불가피한 경우에만 허용하며 주석으로 이유를 명시한다.
- **예외 허용**: 로고, OpsNow 브랜드 고정 색상, `text-white`/`text-black` 처럼 가독성 보장을 위해 고정이 필요한 경우에만 하드코딩을 허용하고 `{/* FIXED: 이유 */}` 주석을 반드시 추가한다.

### 9.3 File Structure (컴포넌트 위치 격리)

컴포넌트의 도메인에 따라 위치를 엄격히 분리하여 마케팅/어드민 간 오염을 방지한다.

```
src/components/
  ui/          # shadcn에서 설치한 원자(Atomic) 컴포넌트 — 직접 수정 금지
  marketing/   # 화이트라벨 마케팅 사이트 전용 (GNB, HeroSection 등)
  admin/       # 관리자 대시보드 전용 (SiteBuilder, PartnerTable 등)
  shared/      # marketing + admin 양쪽에서 실제로 사용하는 컴포넌트만 위치
               # ⚠️ 2개 이상의 도메인에서 사용하지 않으면 shared/에 넣지 않는다
```

### 9.4 Implementation Details (구현 세부 규칙)

- **cn() 필수**: 클래스 병합 시 반드시 `@/lib/utils`의 `cn()` 함수를 사용하여 클래스 충돌을 방지한다.
- **RSC 기본**: 모든 컴포넌트는 Server Component로 작성한다. 클라이언트 인터랙션(useState, useEffect, 이벤트 핸들러)이 필요한 경우에만 `'use client'`를 선언하고, 반드시 **말단 노드(Leaf Component)**로 분리한다.
- **Props 타입 필수**: 모든 컴포넌트는 `interface Props` 또는 `type Props`를 명시적으로 정의한다. `any` 타입 사용 금지.
- **인라인 스타일 제한**: CSS Variables 주입(`layout.tsx`의 테마 주입)을 제외하고, 인라인 `style={{}}` 사용을 금지한다. Tailwind 클래스로 대체한다.

## [10. Local Development Environment]

> 설치 가이드(Acrylic DNS 설정 등) 전체는 `docs/local-dev-setup.md` 참조.

- **로컬 파트너 접근 URL**: `http://{partner-subdomain}.localhost:3000` — `partner-subdomain`은 Supabase `partners.subdomain` 값과 일치해야 한다.
- **CI/CD Fallback**: 서브도메인 미지원 환경에서는 `.env.local`에 `DEV_PARTNER_SLUG=partner-a` 설정 시 `http://localhost:3000`으로 접근 가능.

## [11. Anti-Fragmentation Rules]

> Claude는 코드를 생성하는 기계가 아니라, 전체 코드베이스의 질서를 유지하는 **정원사(Gardener)**로 행동한다.
> 새로운 파일(나무)을 심기보다 기존 코드를 전정(Refactor)하는 것에 우선순위를 둔다.

### 11.1 New File Quarantine (신규 파일 생성 전 전수 조사)

신규 파일을 생성하기 **전**, 반드시 아래를 수행하고 결과를 보고한다.

- 동일하거나 유사한 기능을 수행하는 파일·함수·컴포넌트가 없는지 확인한다.
- 조사 결과 "없음"을 확인한 후에만 신규 파일 생성을 진행한다.
- **예외**: `supabase/migrations/`, `supabase/seeds/`, `tests/`, `docs/` 하위 파일은 적용 제외.

### 11.2 SSOT & Reporting (중복 발견 시 보고 후 결정)

동일한 비즈니스 로직(identical logic)이 2곳 이상 발견될 경우:

1. **현재 Task를 중단하지 않는다.** 진행 중인 작업을 먼저 완료한다.
2. 발견 즉시 사용자에게 보고한다: `"[SSOT 경고] [파일A]와 [파일B]에서 동일 로직 발견. 통합 리팩터링을 다음 티켓으로 제안합니다."`
3. 통합 리팩터링은 **문경 님 승인 후 별도 작업(별도 티켓)**으로 진행한다.
4. 보고 없이 현재 Task에 리팩터링을 끼워 넣는 것을 금지한다 — PR 단위의 원자성(atomicity)을 유지한다.

### 11.3 Conservative Abstraction (보수적 추상화)

| 상황 | 처리 |
|------|------|
| 로직이 **완전히 일치(identical)** — 2곳 이상 | 즉시 `shared/` 또는 `lib/`로 추상화 |
| 로직이 **유사(similar)** — 2곳 | 관찰 유지, 추상화 보류 |
| 로직이 **유사(similar)** — 3곳 이상 | 추상화 제안 후 사용자 승인 시 실행 |

- 추상화 인터페이스가 틀리면 세 번째 사례가 나왔을 때 오히려 코드가 더 복잡해진다. 확실할 때만 추상화한다.

### 11.4 Atomic Modification (최소 단위 수정)

기존 파일을 수정할 때:

- 함수 전체를 새로 쓰지 않고, 변경이 필요한 **최소 단위(line/block)**만 수정한다.
- `git diff`가 작을수록 리뷰·롤백이 쉽다. 불필요한 공백·포맷·리네임 변경을 끼워 넣지 않는다.
- 기능 변경과 포맷 정리를 **같은 커밋에 섞지 않는다.**
- **Cleanup 선행 커밋**: 신규 기능 티켓 착수 전, 정리(refactor/cleanup) 작업이 있으면 반드시 별도 커밋으로 먼저 분리한다. 기능 롤백 시 정리 작업까지 함께 날리는 것을 방지한다.
- **커밋 단위**: 하나의 커밋은 하나의 티켓 또는 하나의 관심사에 대응한다. 관련 없는 파일이 같은 커밋에 포함되지 않도록 `git add` 시 파일 단위로 명시한다.

### 11.5 Red-Green-Refactor Gate (실패 확인 후 구현 진입)

Test Contract의 stub을 실제 assertion으로 교체한 뒤, **구현 코드 작성 전**에 반드시 테스트가 RED(실패) 상태임을 확인한다.

```bash
# RED 확인
npx vitest run path/to/test-file   # 또는
npx playwright test path/to/spec
```

- 테스트가 RED인 것을 확인한 후에만 구현에 진입한다.
- 처음부터 GREEN인 테스트는 구현을 검증하지 못하는 테스트다 — 로직을 재점검한다.
- `test.todo()` stub은 "pending" 상태로 RED와 동일하게 간주한다.
