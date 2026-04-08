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
| **Security Auditor** | 취약점 3개 이상 검출 의무. Non-Invasive 원칙 | `docs/agents/auditor.md` |
| **Project Context Manager** | Jira 동기화, DoD 검증, Confluence 인덱싱 | `docs/agents/manager.md` |

---

## 지식 맵 (필요할 때만 열어 읽기)

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

---

## 아키텍처 결정 우선순위

1. **Isolation over Convenience** — 파트너 간 데이터 격리 최우선
2. **Type Safety over Looseness** — `any`, `as` 사용 금지에 가까운 수준
3. **Documentation Sync** — 코드 변경 시 관련 문서 동시 업데이트

<!-- END:nextjs-agent-rules -->
