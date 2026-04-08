@AGENTS.md

# CLAUDE.md - OpsNow White-label Site Builder - Operational Guide

## [0. Source of Truth & Context]

- 모든 개발의 최상위 권위는 Confluence Space `WS` (White-label Site)에 있다.
- **Space**: `WS` / **cloudId**: `opsnowinc.atlassian.net`
- **Space Homepage ID**: `290849306`
- **구현 전 반드시** `getConfluencePage`로 관련 문서를 읽고 요약하여 승인받을 것.
- 세션이 길어지면 컨텍스트를 스스로 리프레시하라.

### 문서 Page ID 목록

| 문서 | Page ID |
|------|---------|
| 0. 개요 (Overview) | 290488344 |
| 1. PRD (요구사항 정의서) | 289636366 |
| 2. 기술 설계서 (Technical Specification) | 289275929 |
| 3. DB 스키마 | 289046572 |
| 4. 화면 설계서 (Marketing Site) | 289177685 |
| 5. 화면 설계서 (Admin Site) | 289898546 |
| 6. 테스트 케이스 (Test Cases) | 289308723 |
| 7. 파트너 온보딩 가이드 | 289243271 |
| 8. 운영 및 유지보수 매뉴얼 | 289177762 |
| 9. SEO 및 분석 전략 문서 | 289276134 |

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

- **Masking**: `leads` 관련 API 호출 시 마스터 권한일 경우 개인정보 마스킹 로직이 포함되었는지 항상 검증하라.
- **RLS Policy**: 테이블 생성 혹은 수정 시 반드시 관련 RLS(Row Level Security) 정책을 함께 작성하거나 업데이트하라.

## [5. Verification Workflow]

작업을 마친 후 클로드 코드는 스스로 다음을 체크해야 합니다.

1. `npm run lint`와 `npx tsc`를 실행하여 문법 및 타입 에러를 상시 확인하라.
2. **에러 발생 시 대응**: `lint`나 `build` 에러 발생 시 독단적으로 고치지 말고, Auditor에게 에러 로그를 전달하여 원인을 분석하게 한 뒤 수정안을 승인받아라.
3. **환경 변수 관리**: 새로운 환경 변수가 필요한 경우 직접 `.env`를 수정하지 말고, **문경 님**에게 변수명과 용도를 보고한 뒤 추가를 요청하라.
4. Confluence Page ID `289308723` (6. 테스트 케이스)를 기준으로 작업 성공 여부를 검증하라.
