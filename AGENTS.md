<!-- BEGIN:nextjs-agent-rules -->

# AGENTS.md — OpsNow White-label Site 에이전트 진입점

> **역할**: 이 파일은 ToC(목차)이자 안내판입니다. 상세 지침은 아래 링크된 docs/에 있습니다.
> 에이전트는 처음부터 모든 문서를 읽지 않습니다. 현재 작업에 필요한 문서만 선택적으로 열어 읽으세요.

---

## 프로젝트 이해관계자

- **Owner/PO**: 문경 님
- **Lead Developer**: Claude Code (AI)

---

## 에이전트 역할 목록

| 역할 | 한 줄 설명 | 상세 지침 |
|------|-----------|-----------|
| **Lead SaaS Architect** | 설계·구현 담당. Security First, Scalability 지향 | `docs/agents/architect.md` |
| **Security Auditor** | 실제 발견 위험만 보고. Non-Invasive 원칙 | `docs/agents/auditor.md` |
| **Project Context Manager** | Jira 동기화, DoD 검증, Confluence 인덱싱 | `docs/agents/manager.md` |

---

## 지식 맵 (필요할 때만 열어 읽기)

### 로컬 파일 (Git)

| 문서 | 읽어야 할 때 |
|------|-------------|
| `CLAUDE.md` | 세션 시작 시 — 운영 가이드 및 하네스 프로세스 |
| `ARCHITECTURE.md` | 시스템 구조 설계 또는 라우팅·인증 로직 작업 시 |
| `SECURITY.md` | RLS 정책 작업, leads 접근, 보안 감사 시 |
| `docs/design/db-schema.md` | DB 관련 작업, 컬럼 확인, ERD 참조 시 |
| `docs/exec-plans/rls-verification.sql` | RLS 검증 시나리오(T-01~T-10) 실행 시 |
| `docs/agents/architect.md` | Architect 역할 세부 수행 시 |
| `docs/agents/auditor.md` | Auditor 역할 세부 수행 시 |
| `docs/agents/manager.md` | Manager 역할 세부 수행 시 |
| `docs/jira-conventions.md` | Jira 티켓 생성 시 — DevType·Item 커스텀 필드 ID 확인 |
| `docs/model-matrix.md` | 작업 시작 시 — Opus/Sonnet 권장 모델 판단 |
| `docs/tech-debt.md` | 관련 영역 작업 Context 단계 — 이번 작업이 기존 부채 상환 기회인지 확인 |
| `docs/journal/` | `/start-dev` 스킬이 자동으로 읽는다. 직접 열어야 할 경우: 특정 날짜의 기각 경로·미결 메모·AI 합의점 재확인 시 |

### Confluence (WS Space, 2026-04-18 재구조화 — ADR-003)

> 전체 Page ID 테이블은 `CLAUDE.md` §0 참조.

| 진입점 | 상황 |
|------|-----|
| **[2. 프로젝트 PRD (289636366)](https://opsnowinc.atlassian.net/wiki/spaces/WS/pages/289636366)** | 전사 요구사항·역할 매트릭스 확인 시 |
| **[1. 공통 기반 (308609032)](https://opsnowinc.atlassian.net/wiki/spaces/WS/pages/308609032)** | Platform Foundation — Architecture / DB / Security / Proxy / i18n |
| **[3. Marketing Site (308740188)](https://opsnowinc.atlassian.net/wiki/spaces/WS/pages/308740188)** | 마케팅 티켓 착수 시 (섹션·리드·SEO·i18n) |
| **[4. Admin Site (305659905)](https://opsnowinc.atlassian.net/wiki/spaces/WS/pages/305659905)** | Admin 티켓 착수 시 (IA·정책·인프라·기능) |
| **[5. 운영 (308674657)](https://opsnowinc.atlassian.net/wiki/spaces/WS/pages/308674657)** | 온보딩·운영·QA 프로세스 |
| **[6.1 ADR (308740232)](https://opsnowinc.atlassian.net/wiki/spaces/WS/pages/308740232)** | 설계 결정 이력 확인 시 |

> ⚠️ 구 `5. 화면 설계서(Admin)`, `4. 화면 설계서(Marketing)`, `[PRD] Admin Core Specs` 페이지는 **Deprecated/Superseded** 처리되어 `6.3 Deprecated Archive` 하위로 이동. 신규 작업에서 참조하지 말 것.

---

## 프로젝트 전용 스킬 (슬래시 명령어)

자주 쓰는 반복 작업은 아래 스킬로 즉시 실행한다. 매번 동일한 지시를 반복하지 않아도 된다.
전체 스킬 목록 및 사용법 → [`docs/skills-guide.md`](docs/skills-guide.md)

| 스킬 | 명령어 | 사용 시점 |
|------|--------|----------|
| **start-dev** | `/start-dev` | 세션 시작 — 어제 일지·git·Jira 교차하여 맥락 복원 및 오늘 진입 지점 제시 |
| **partner-onboard** | `/partner-onboard [slug]` | 신규 파트너 온보딩 전 과정 (DB → RLS → 서브도메인 → E2E) |
| **admin-security-check** | `/admin-security-check [파일경로]` | Admin Server Action Impl 완료 후 Verify 전 |
| **migration-safe** | `/migration-safe [목적]` | 마이그레이션 파일 작성 전 안전 체크 |
| **database-migration** | `/database-migration` | Supabase 마이그레이션 작성 패턴 참조 |
| **supabase-audit-rls** | `/supabase-audit-rls` | RLS 정책 bypass 취약점 검증 |
| **journal** | `/journal` | 세션 종료 전 — 오늘 서사 박제 (`docs/journal/YYYY-MM-DD.md`) + 일/월요일엔 Confluence 주간 롤업 제안 |

---

## 아키텍처 결정 우선순위

1. **Isolation over Convenience** — 파트너 간 데이터 격리 최우선
2. **Type Safety over Looseness** — `any`, `as` 사용 금지에 가까운 수준
3. **Documentation Sync** — 코드 변경 시 관련 문서 동시 업데이트

<!-- END:nextjs-agent-rules -->
