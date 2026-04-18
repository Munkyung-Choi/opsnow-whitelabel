# Decision Journal: YYYY-MM-DD

> **원칙**: 행위(What)가 아닌 서사(Why)를 기록한다. Jira가 이미 하는 작업 목록은 복기하지 않는다.
> **목표 소요**: 5분 이내. 10분을 넘기면 다른 artifact와 중복되고 있다는 신호다.
> **네이밍**: `YYYY-MM-DD.md` 고정 (ISO 형식). 주간 롤업은 별도로 Confluence에 발행.

## Decisions

오늘 내린 핵심 결정과 그 이유를 1~3개 기록한다. 결정 자체보다 **왜 그 방향을 골랐는지**가 핵심.

- (예) WL-118 삼각 검증 도입 — 차단과 데이터 부재 구분을 위해 service_role 기반 preflight 추가. 이유: Auditor R-LF-1 지적, 0건 반환만으로는 "진짜 차단" 증명 불가.

## Rejected Paths

오늘 검토한 뒤 기각한 선택지. 기각 이유를 반드시 적는다. **미래의 자신이 같은 길을 재탐색하는 비용**을 막는다.

- (예) Multi-model review — 컨텍스트 부재가 더 근본적 문제라 모델 다양성의 가치 낮음.

없으면 "없음" 명시.

## Debts & Risks

오늘 발견한 부채/리스크, 또는 기존 부채가 오늘 작업 맥락에서 어떻게 드러났는지. `docs/tech-debt.md`의 DEBT/MISS ID를 참조한다.

- (예) MISS-001이 WL-105 후속 작업 중 표면화 — CASE WHEN 분류 규칙 부재가 원인.

## Message to Tomorrow

내일의 나 또는 다음 세션에 남기는 짧은 메모. 꼭 확인할 파일·ID·가정·위험 포인트.

- (예) WL-118 Impl 착수 전 `seed-admin-users.ts`의 partner-b UUID 확인 필수.
