# AI 모델 배치 매트릭스 v2.0 — WL 프로젝트 (2026.04)

> 작업 시작 선언 시 이 매트릭스를 기준으로 권장 모델을 고지한다.
> Sonnet이 기본값. Opus 권장 항목만 명시적으로 고지한다.
> 트랙 분류 기준: CLAUDE.md 참조.
> Jira Tech Risk 필드 매핑: `docs/jira-conventions.md` 참조 (`🟥Critical`·`🟨High`·`🟫Med`·`🟩Low` 4단계).

---

## 1. 트랙별 모델 매핑 (v2.0)

### 기획 및 UX 아키텍처

| 구분 | 작업 항목 | 권장 모델 | 선정 사유 |
|------|-----------|-----------|-----------|
| 기획 | Epic 구조 설계, PRD 요구사항 충돌 해결 | **Opus** | 복잡한 비즈니스 제약 간 논리적 우선순위 판단 |
| 기획 | Jira 티켓 생성·업데이트, 문서 초안 | Sonnet | 정형화된 패턴 반복 |
| UX | Admin IA 설계 (Role-based Flow) | **Opus** | Master/Partner 권한 분기에 따른 접근성 설계 |
| UX | i18n UX 전략 (Global Edge Cases) | **Opus** | 다국어·타임존·환율 예외 상황 추론 |
| UX | 컴포넌트 구조 결정 및 기존 패턴 적용 | Sonnet | 확립된 디자인 시스템 가이드 준수 |

### 기술 설계 및 구현

| 구분 | 작업 항목 | 권장 모델 | 선정 사유 |
|------|-----------|-----------|-----------|
| 핵심 보안 | RLS 정책 설계 | **Opus** | 미세한 Bypass 취약점 탐지 |
| 보안 로직 | withAdminAction 등 7단계 체크체인 설계 | **Opus** | 보안 헬퍼 엣지케이스 추론 |
| 아키텍처 | proxy.ts·middleware 멀티테넌시 핵심 로직 | **Opus** | 테넌트 격리 실패 리스크 방지 |
| 데이터 | DB 스키마·마이그레이션 (Critical: Type 변경·Data Backfill) | **Opus** | 취소 불가 작업의 무결성 보장 |
| 데이터 | DB 스키마·마이그레이션 (High: nullable Column·Index 추가) | **Opus** | High 트랙이므로 Opus 유지, 승인은 비동기 |
| 구현 | 일반 Med 트랙 구현 (CRUD, UI) | Sonnet | 명확한 명세 기반 코드 생성 |
| 검증 | Security Auditor sub-agent | **Opus** | 구현 모델과 다른 비판적 시각 필수 |
| 검증 | Verify 단계 (lint/tsc/test 실행) | Sonnet | 기계적 반복 및 정적 분석 |

---

## 2. Med → Opus 자동 승격 조건

Med 트랙이라도 아래 조건 중 **하나라도** 해당하면 Opus로 승격한다.

- **보안 개입**: `auth.uid()` 외 복잡한 권한 검증 로직이 포함될 때
- **멀티테넌시 간섭 가능성**: 단일 파트너 기능이지만 다른 파트너 데이터 노출 경로가 존재할 때
- **비가역적 데이터 변환**: DB 클리닝 없이 롤백이 어려운 데이터 마이그레이션 로직
- **파일 자동 승격**: `proxy.ts` / `middleware.ts` / `src/lib/auth/` 수정 (트랙 무관)

---

## 3. 빠른 판단 기준

| 질문 | Yes → | No → |
|------|-------|-------|
| High·Critical 트랙인가? | Opus | 다음 질문 |
| Security Auditor sub-agent인가? | Opus | 다음 질문 |
| §2 승격 조건 중 하나라도 해당? | Opus | Sonnet |
| 모델이 명시되지 않았는가? | Opus (기본값) | 명시된 모델 사용 |
