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
