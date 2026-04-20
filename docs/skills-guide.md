# Skills Guide

설치된 전체 스킬 목록과 사용 시점. `/` 드롭다운으로 발견하고, 여기서 "언제·왜" 쓰는지 확인한다.

> 스킬 파일 위치: `.claude/skills/{name}/SKILL.md`

---

## 세션 운영

| 명령어 | 사용 시점 |
|--------|----------|
| `/dev-start` | 매일 첫 대화 — 어제 일지·git·Jira 교차하여 오늘 진입 지점 제시 |
| `/dev-end` | 세션 종료 전 — 오늘 결정·기각 경로·부채를 `docs/journal/YYYY-MM-DD.md`에 박제. 일/월요일엔 Confluence 주간 롤업 Live Doc 발행 제안 |

---

## 프로젝트 전용 (OpsNow)

| 명령어 | 사용 시점 |
|--------|----------|
| `/partner-onboard [slug]` | 신규 파트너 온보딩 전 과정 (DB 시딩 → RLS → 서브도메인 → E2E) |
| `/admin-security-check [파일경로]` | Admin Server Action Impl 완료 후 Verify 전 — 7단계 보안 체크체인 감사 |
| `/migration-safe [목적]` | 마이그레이션 파일 작성 전 — 멱등성·RLS·실행 도구(SQL Editor vs db push) 결정 |

---

## DB / 인프라

| 명령어 | 사용 시점 |
|--------|----------|
| `/database-migration` | Supabase 마이그레이션 작성 패턴 참조 — idempotent SQL, RLS 동반 설계 |
| `/supabase-audit-rls` | RLS 정책 bypass 취약점 검증 — 마이그레이션 후 또는 RLS 변경 시 |

---

## 보안

| 명령어 | 사용 시점 |
|--------|----------|
| `/security` | 보안 감사 전체 워크플로우 (취약점 스캔 → 검증) |
| `/security-audit` | PR 리뷰·배포 준비·의존성 점검 시 코드·패키지 취약점 감사 |

---

## 테스트 / QA

| 명령어 | 사용 시점 |
|--------|----------|
| `/e2e-testing` | Playwright E2E 패턴 참조 — Page Object Model, CI 연동, flaky 테스트 대응 |
| `/nextjs-testing` | Next.js 전용 테스트 패턴 — Server Components, App Router, middleware, SSR/SSG |
| `/qa-testing-strategy` | 테스트 전략 수립 — 커버리지 기준, CI 게이트, 릴리스 기준 정의 시 |

---

## 프론트엔드 / Next.js

| 명령어 | 사용 시점 |
|--------|----------|
| `/nextjs-best-practices` | App Router 원칙 참조 — Server Components, 데이터 패칭, 라우팅 패턴 |
| `/nextjs-a11y-and-seo-audit` | 접근성(a11y) + SEO 감사 — 컴포넌트·라우트·메타데이터·시맨틱 점검 |
| `/dev-frontend-performance` | 성능 게이트 — Core Web Vitals, Lighthouse 90+, 번들 사이즈 예산 준수 확인 |

---

## AI 협업

| 명령어 | 사용 시점 |
|--------|----------|
| `/aisend [분석 텍스트]` | 외부 AI(ChatGPT 등) 분석을 실제 코드베이스와 대조하여 ✅/❌/⚠️ 판정 — `--ticket WL-XXX` 옵션으로 Jira 기록 |

---

## 평가

| 명령어 | 사용 시점 |
|--------|----------|
| `/arch-eval [날짜]` | 특정 시점 아키텍처 건강도 평가 — 커밋 시점 실증 기반 10개 항목 냉엄 판정, Confluence Live Doc 자식 페이지 생성 |
| `/perf-eval [기간]` | 특정 기간 프로젝트 Perf 평가 — 티켓·커밋·테스트 수치 기반 배달 성과 판정, Confluence Live Doc 자식 페이지 생성 |

---

## 기타 도구

| 명령어 | 사용 시점 |
|--------|----------|
| `/mermaid [설명]` | Mermaid 다이어그램 생성 시 — `<br/>` 줄바꿈·육각형 판정 노드·`padding: 0` 렌더링 표준 적용 |
| `/jira-syntax` | Jira 설명·댓글 작성 시 — Markdown → Jira 위키 마크업 변환, 템플릿 제공 |
| `/changelog-generator` | 릴리스 체인지로그 생성 |

---

> `user-invocable: false`로 표시된 `supabase`, `qa-engineer`는 내부 에이전트용으로 직접 호출하지 않는다.
