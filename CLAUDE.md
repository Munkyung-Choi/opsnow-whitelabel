@AGENTS.md

<!-- ⚠️ 위 @AGENTS.md 참조는 반드시 이 파일 최상단에 유지되어야 합니다.
     Claude Code가 세션 시작 시 AGENTS.md에 정의된 에이전트 페르소나
     (Lead Architect, Security Auditor, Context Manager)를 자동으로 로드하기 위한
     필수 지시문입니다. 이 줄을 삭제하면 Maker-Checker 워크플로우가 동작하지 않습니다. -->

# CLAUDE.md - OpsNow White-label Site Builder - Operational Guide

## [0. Source of Truth & Context]

- 모든 개발의 최상위 권위는 Confluence Space `WS` (White-label Site)에 있다.
- **Space**: `WS` / **cloudId**: `opsnowinc.atlassian.net`
- **Space Homepage ID**: `290849306`
- **구현 전 반드시** `getConfluencePage`로 관련 문서를 읽고 요약하여 승인받을 것.
- 세션이 길어지면 컨텍스트를 스스로 리프레시하라.

### 문서 Page ID 목록

| 문서                                     | Page ID   |
| ---------------------------------------- | --------- |
| 0. 개요 (Overview)                       | 290488344 |
| 1. PRD (요구사항 정의서)                 | 289636366 |
| 2. 기술 설계서 (Technical Specification) | 289275929 |
| 3. DB 스키마                             | 289046572 |
| 4. 화면 설계서 (Marketing Site)          | 289177685 |
| 5. 화면 설계서 (Admin Site)              | 289898546 |
| 6. 테스트 케이스 (Test Cases)            | 289308723 |
| 7. 파트너 온보딩 가이드                  | 289243271 |
| 8. 운영 및 유지보수 매뉴얼               | 289177762 |
| 9. SEO 및 분석 전략 문서                 | 289276134 |

## 🛠️ Sequential Work Process (Harness Engineering)

모든 작업은 다음의 순서를 엄격히 준수한다:

1. **Step 1: Context Manager** - Jira 티켓 번호 선언 및 Confluence 관련 문서 인덱싱.
2. **Step 2: Lead Architect** - 아키텍처 설계안(또는 코드 초안) 작성 및 데이터 흐름 설명.
3. **Step 3: Security Auditor** - 설계안에 대한 비판적 검토 및 보안 취약점 리포트 제출.
4. **Step 4: Iteration** - Auditor의 지적 사항을 Architect가 반영하여 최종안 도출.
5. **Step 5: Human Approval** - **문경 님**의 최종 승인 대기 (중요 의사결정 시).
6. **Step 6: Execution** - 코드 작성 및 깃허브 푸시.
7. **Step 7: Reporting** - 작업 요약본 작성 및 Jira 업데이트 (아래 양식 준수).
   - **Jira 댓글 양식**:
     - 작업 상태: [Success / Partial / Fail]
     - 수정된 주요 파일: [파일명 목록]
     - 테스트 결과: [Pass한 시나리오 번호 및 결과 요약]
   - **Auditor Digest** (🚨 HIGH 위험 작업 시 필수 출력 — 외부 모델 교차검증용):
     ```
     ### 📝 Auditor Digest (For External Review)
     - **Core Logic**: [구현된 로직의 핵심 요약 — 3줄 이내]
     - **Potential Risks**: [Claude Auditor가 발견했거나 우려되는 엣지 케이스 2~3개]
     - **Questions for Reviewer**:
       1. [보안/아키텍처 관점에서 확인받고 싶은 질문]
       2. [성능/확장성 관점에서 확인받고 싶은 질문]
       3. [설계 대안 또는 놓쳤을 수 있는 시나리오 관련 질문]
     ```

## 🔄 Handoff Protocol (에이전트 간 협업 규약)

모든 작업은 단독으로 결정하지 않으며, 다음의 핸드오프 절차를 준수한다:

1. **Architect → Auditor**:
   - 설계 또는 코드 작성이 완료되면 반드시 Auditor에게 검토를 요청한다.
   - 발화 형식: `"설계를 완료했습니다. Auditor, 이 설계에서 [보안/성능/격리] 관점의 취약점 3가지를 찾아주세요."`
2. **Auditor → Architect**:
   - Auditor는 비판적 검토 후 승인(Approve) 또는 수정 요청(Request Changes)을 보낸다.
   - 발화 형식: `"리뷰 결과입니다. [위험 요소]를 발견했습니다. 이 부분을 수정하기 전까지는 다음 단계(구현)로 진행하지 마십시오."`
3. **Manager → Owner(문경 님)**:
   - 두 에이전트 간의 합의가 완료되면 최종적으로 문경 님에게 요약 보고를 하고 승인을 구한다.

## 🛑 Human-in-the-loop Breakpoints (필수 중단점)

다음 상황이 발생하면 Claude는 **즉시 작업을 멈추고 문경 님의 명시적 승인**을 기다려야 한다. 승인 없이 다음 단계를 진행하는 것을 금지한다.

1. **DB Schema 변경**:
   - 기존 테이블 구조 변경, 컬럼 삭제, 혹은 대규모 Migration SQL을 실행하기 직전.
2. **Security & Auth 정책 결정**:
   - Supabase RLS 정책의 신규 생성/수정, 인증(Auth) 로직의 근간을 건드리는 작업을 수행할 때.
3. **외부 비용 및 리소스 연동**:
   - 유료 API 연동, Vercel 설정 변경 등 비용이나 외부 설정이 개입될 때.
4. **Conflict 발생**:
   - Architect와 Auditor 간의 의견 차이가 2회 이상 반복되어 의사결정이 교착 상태에 빠질 때.

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

## [1. Core Commands]

클로드 코드가 프로젝트 운영을 위해 즉시 실행할 수 있는 명령어 리스트입니다.

- **Development**: `npm run dev` (로컬 개발 서버 실행)
- **Build**: `npm run build` (프로덕션 빌드 및 에러 체크)
- **Lint**: `npm run lint` (코드 컨벤션 및 문법 검사)
- **Type Check**: `npx tsc --noEmit` (TypeScript 타입 안정성 검사)
- **Supabase Type Gen**: `npx supabase gen types typescript --project-id gzkmsiskdbtuxpeaqwcp > src/types/supabase.ts` (DB 스키마 변경 시 필수 실행)
- **Add shadcn Component**: `npx shadcn@latest add [component-name]` (UI 컴포넌트 추가 시 사용)

## [2. Coding Style & Patterns]

코드 품질과 일관성을 유지하기 위한 기술적 규격입니다.

- **Framework**: Next.js 16.2.2 App Router (기본적으로 React Server Components 사용 권장). 코드 작성 전 `node_modules/next/dist/docs/`의 관련 가이드를 참조하라.
- **Naming Conventions**:
  - Components: `PascalCase.tsx` (예: `HeroSection.tsx`, `PartnerLogo.tsx`)
  - Hooks/Utils/Lib: `kebab-case.ts` (예: `use-partner-theme.ts`, `supabase-client.ts`)
- **Imports**: 절대 경로 별칭(`@/`)을 사용하라.
  - 예: `import { Button } from "@/components/ui/button"`
- **Data Fetching**: 데이터 조회는 가급적 Server Components에서 수행하고, 데이터 변경(Mutation)은 Server Actions를 사용하라.

## [3. Multi-tenant Architecture Rules]

화이트라벨의 핵심 로직 구현 시 반드시 지켜야 할 규칙입니다.

- **Partner Context**: 모든 데이터 요청 전에는 반드시 `partner_id` 컨텍스트가 확보되었는지 확인하라.
- **Middleware**: `middleware.ts`는 Edge Runtime에서 동작하므로 Node.js 전용 라이브러리(fs, crypto 등)를 사용하지 마라.
- **Theme Injection**: 파트너별 테마 컬러는 `layout.tsx`에서 CSS Variables로 주입하여 전역 컴포넌트가 참조하게 하라.

## [4. Security & Privacy Enforcement]

> **⚠️ 보안 상세 규칙은 `SECURITY.md`를 참조하라.** 이 섹션은 핵심 원칙만 요약한다.

- **Masking**: `leads` 관련 API는 `master_admin`에게 반드시 `leads_masked_view`를 통해서만 데이터를 반환하라. 직접 테이블 접근 금지.
- **RLS Policy**: 테이블 생성 혹은 수정 시 반드시 관련 RLS 정책을 함께 작성하고, `SECURITY.md`의 접근 행렬을 업데이트하라.
- **service_role 격리**: `supabaseAdmin`(service_role key)은 서버사이드 Route Handler에서만 사용. 클라이언트 컴포넌트에 절대 노출 금지.

## [5. Design Documentation Sync]

- **DB Schema Diagram Sync**: DB 스키마(테이블 생성/수정/삭제, 컬럼 변경) 시 반드시 `docs/design/db-schema.md`의 Mermaid ERD를 함께 업데이트하라.
- **Type Sync**: DB 변경 후 `npm run gen:types`를 실행하여 TypeScript 타입을 동기화하라.
- **Auditor Digest 영속화**: 🚨 HIGH 위험 작업 완료 시 Auditor Digest를 `docs/audits/{ticket_id}.md`에 저장하라.
  - 템플릿: `docs/audits/_template.md` 참조
  - 파일명 예시: `docs/audits/WL-9.md`, `docs/audits/WL-31.md`
  - 채팅에만 존재하는 Digest는 세션 종료 시 소실되므로 반드시 파일로 커밋할 것.

## [6. Verification Workflow]

작업을 마친 후 클로드 코드는 스스로 다음을 체크해야 합니다.

1. `npm run lint`와 `npx tsc`를 실행하여 문법 및 타입 에러를 상시 확인하라.
2. **에러 발생 시 대응**: `lint`나 `build` 에러 발생 시 독단적으로 고치지 말고, 원인 분석 후 수정안을 문경 님에게 보고하고 승인받아라. Auditor 검토 강제 규칙은 **[8. Harness Enforcement Rules]** 참조.
3. **환경 변수 관리**: 새로운 환경 변수가 필요한 경우 직접 `.env`를 수정하지 말고, **문경 님**에게 변수명과 용도를 보고한 뒤 추가를 요청하라.
4. Confluence Page ID `289308723` (6. 테스트 케이스)를 기준으로 작업 성공 여부를 검증하라.

## [7.💰 Token Management & Optimization]

클로드는 효율적인 리소스 사용과 과금 방지를 위해 다음 원칙을 준수한다:

1. **Ignore Rules**: 프로젝트 루트의 `.claudeignore`에 명시된 파일과 폴더는 분석 대상에서 제외한다.
2. **Selective Reading**: 모든 파일을 한꺼번에 읽지 말고, 작업 중인 Jira 티켓과 직접 연관된 파일 위주로 `read_file`을 실행하라.
3. **Session Refresh**: 대화가 길어져 컨텍스트 토큰이 임계치에 도달하면 문경 님에게 보고하고 세션을 새로 시작할 것을 제안하라.

## [8.⚖️ Harness Enforcement Rules (강제 이행 규칙)]

**설계·구현·보안 검토 작업(Step 2~6)에 해당하는 답변**의 최상단에는 반드시 아래의 [Status Header]를 포함해야 한다.  
단순 질의응답·현황 조회·문서 확인 등 Step 2~6에 해당하지 않는 답변에는 생략할 수 있다.  
헤더가 누락된 Step 2~6 작업은 무효로 간주한다.

**[Status Header Format]**

- **Current Step**: [Step 1~7 중 현재 단계]
- **Active Persona**: [현재 역할을 수행 중인 에이전트명]
- **Handoff Status**: [준수 / 건너뜀 (사유)]
- **Verification Proof**: [Step 3 Auditor의 검토 결과 요약 또는 링크]

**이행 원칙**:

1. **Auditor Pass**: Step 3의 비판적 검토(취약점 3개 도출)가 없는 설계는 Step 6(구현)으로 넘어갈 수 없다.
2. **Self-Stop**: Architect가 Auditor의 검토 없이 구현을 시도하려 하면, 스스로 오류를 선언하고 Step 3로 돌아가야 한다.
3. **Error Escalation**: `lint`·`build` 에러 발생 시 독단적으로 수정하지 말고, Auditor에게 에러 로그를 전달하여 원인을 분석하게 한 뒤 수정안을 승인받아라. ([6. Verification Workflow] 항목 2와 연동)

### 위험도 기반 검증 정책 (Risk-based Verification Tiering)

모든 작업에 동일한 수준의 검증을 적용하면 과도한 피로와 토큰 낭비가 발생한다.
아래 등급에 따라 검증 강도를 선택하라.

| 위험 등급 | 대상 작업 | 검증 방식 | 비고 |
|-----------|-----------|-----------|------|
| 🚨 **HIGH** | RLS 설계, Auth 로직, DB Schema 변경 | **2중 루프** (Claude Auditor + 외부 모델) | Auditor Digest 필수 출력 |
| ⚠️ **MEDIUM** | 복잡한 비즈니스 로직, 외부 API 연동 | **내부 루프** (Claude Auditor 전용) | 필요 시 수동 승인 루프 가동 |
| ✅ **LOW** | UI 컴포넌트, 단순 문서화, 리팩토링 | **자율 진행** (Self-contained 테스트) | Auditor 생략 가능 |

> ⚠️ 등급 판단이 불확실하면 한 단계 높은 등급을 적용하라 (Fail-safe 원칙).

## [9. UI/Frontend Standards]

> **목적**: 화이트라벨 테마 시스템의 일관성을 보장하고, 장기적 유지보수 비용을 최소화하기 위한 프론트엔드 표준이다.
> 모든 UI 작업(WL-40 이후)에 적용되며, §2 Coding Style과 함께 읽어야 한다.

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
