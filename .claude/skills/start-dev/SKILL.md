---
name: start-dev
description: 세션 시작 시 어제 일지·git 활동·열린 Jira 티켓을 교차하여 어제 맥락을 복원한다. 매일 첫 대화에서 실행한다.
---

# Start Dev — 세션 맥락 복원

이 스킬은 "어제 어디까지 했는가"를 5분 안에 복원한다. 일지·git·Jira 세 소스를 교차하여 오늘 작업의 진입 지점을 제시한다.

## 사용법

```
/start-dev
```

인수 없음. 오늘 날짜를 기준으로 자동 실행된다.

---

## 실행 절차

### STEP 1 — 날짜 계산

오늘 날짜와 어제 날짜를 계산한다.

```bash
date +%Y-%m-%d
```

### STEP 2 — 소스 수집 (3개 병렬)

**소스 1 — 어제 일지**:
- `docs/journal/YYYY-MM-DD.md` (어제 날짜)를 읽는다.
- 없으면 그 이전 날짜 파일을 가장 최근 것부터 탐색한다 (`docs/journal/` Glob).
- "Message to Tomorrow" 섹션을 최우선 확인한다.

**소스 2 — git 활동**:
```bash
git log --since="2 days ago" --pretty=format:"%h %ad %s" --date=short
git status --short
```

**소스 3 — 열린 Jira 티켓** (MCP 도구):
```
JQL: project = WL AND status != Done AND assignee = currentUser() ORDER BY updated DESC
```
In Progress 또는 최근 업데이트된 티켓 위주로 수집한다.

### STEP 3 — 맥락 복원 리포트 출력

아래 형식으로 출력한다. **이모지 금지. 서사 중심.**

```
## 어제 맥락 복원 — YYYY-MM-DD

### 어제 마지막 지점
[일지 "Message to Tomorrow"의 핵심 1~3줄 요약]

### 진행 중인 티켓
| 티켓 | 제목 | 상태 | 다음 단계 |
|------|------|------|----------|
| WL-XXX | ... | In Progress | ... |

### git 미커밋 파일
[git status --short 결과. 없으면 "없음"]

### 오늘 권장 진입 지점
[일지·Jira·git을 교차하여 "오늘 첫 번째로 할 일"을 1~2문장으로 제안]
```

### STEP 4 — 추가 컨텍스트 제공 (조건부)

아래 조건 중 하나라도 해당하면 추가로 읽어 보고한다.

| 조건 | 추가 읽기 |
|------|----------|
| 일지에 DEBT/MISS ID 언급 | `docs/tech-debt.md` 해당 항목 |
| 일지에 특정 파일 경로 언급 | 해당 파일의 관련 섹션 |
| In Progress 티켓이 HIGH 트랙 | `docs/audits/{ticket_id}.md` (있으면) |

### STEP 5 — 주간 리포트 자동 생성 (월요일 조건부)

요일 확인: `date +%u` (1=월, 7=일).

**오늘이 월요일(1)인 경우에만 실행**:

1. 이전 주 범위 계산: 직전 월요일~일요일 (ISO 주 기준)
2. Confluence 주간 페이지 존재 여부 확인:
   - `getConfluencePageDescendants` (parentId: `309264482`, Weekly 개발일지) 조회
   - 이전 주 범위를 포함하는 페이지 제목이 **없으면**: "이전 주 주간 리포트가 없습니다. 지금 생성할까요?" 제안
   - 이전 주 범위를 포함하는 페이지 제목이 **있으면**: "이전 주 주간 리포트가 이미 있습니다. 이번 주 마지막 날(일요일)까지의 내용으로 업데이트할까요?" 제안
   - 두 경우 모두 동의 시 아래 진행
3. 해당 범위의 `docs/journal/YYYY-MM-DD.md` 파일 전부 Glob으로 수집
4. 각 파일의 4섹션 + `git log --since --until` (범위 내)를 롤업하여 주간 페이지 초안 작성. 구조:
   - **주간 요약 (Executive Summary)** — 2~3 문단
   - **이번 주 핵심 결정 (Top Decisions)** — 주간 통합 관점
   - **기각한 경로 (Road Not Taken)** — 주간 롤업
   - **기술부채 신규·상환 (Debt Ledger Diff)** — 신규 DEBT/MISS, 상환된 항목
   - **이번 주 Jira 이력** — 표 형식
   - **프로세스 진화 요약** — CLAUDE.md/docs/ 체계 변화
   - **다음 주 전망 (Next Week Outlook)**
5. 사용자 확인 후 Confluence에 발행:
   - cloudId: `opsnowinc.atlassian.net`
   - spaceId: `290848804` (WS)
   - parentId: `309264482` (Weekly 개발일지)
   - title: `YYYY-WNN (MM-DD ~ MM-DD) 주간 개발일지` (예: `2026-W16 (04-13 ~ 04-19) 주간 개발일지`)
   - contentFormat: `markdown`
   - **페이지 형식: Atlassian Live Doc** — `subtype: "live"` 로 생성. 일반 페이지가 아닌 Live Doc으로 발행해야 한다.

월요일이 아닌 경우: STEP 5 생략하고 맥락 복원 리포트로 마무리.

---

## 공통 실수 방지

| 실수 | 방지책 |
|------|--------|
| 일지 없이 git log만 보고 맥락 복원 | 반드시 일지 "Message to Tomorrow" 먼저 확인 |
| Jira 조회 생략 | 일지에 없는 긴급 티켓이 있을 수 있다 |
| 복원 리포트를 너무 길게 작성 | 5분 컷 — 진입 지점 제시가 목적, 전체 요약이 아님 |
| 어제 일지가 없을 때 에러 처리 | 가장 최근 일지 파일로 대체, 날짜 명시 후 진행 |

---

## 참조

- `docs/journal/` — 일간 일지 저장소
- `docs/tech-debt.md` — DEBT/MISS ID 원본
- `docs/agents/manager.md` — Jira 동기화 세부 규칙
