---
name: journal
description: 오늘 세션의 작업 서사를 docs/journal/YYYY-MM-DD.md에 박제한다. 대화·git diff·Jira 업데이트를 교차하여 4섹션 초안을 작성하고, 사용자 확인을 받은 뒤 저장한다. 일요일/월요일에는 이번 주 Confluence 주간 페이지 발행을 추가 제안한다.
---

# Decision Journal — Daily Wrap

이 스킬은 비개발자 오너의 **"이해도 부채"**를 줄이는 운영 도구다. 하루의 작업 서사(행위가 아닌 결정의 이유·기각 경로·부채·메모)를 표준 템플릿으로 박제한다.

## 사용법

```
/journal
```

인수 없음. 오늘 날짜를 자동으로 사용한다. 특정 날짜를 기록하려면 명시적 요청 필요 (예: "어제 치의 저널을 지금 작성").

---

## 실행 절차 (순서 준수)

### STEP 1 — Preflight

1. 오늘 날짜 확인: `date +%Y-%m-%d` (예: 2026-04-19)
2. `docs/journal/YYYY-MM-DD.md` 존재 여부:
   - **없음** → 신규 생성 경로 (STEP 2로)
   - **있음** → 갱신 모드 공지 + 기존 내용 읽어서 사용자에게 보여주고 "추가 갱신" vs "처음부터 재작성" 선택 질문
3. `docs/journal/_template.md` 템플릿 구조를 메모리에 로드

### STEP 2 — 작업 맥락 수집 (3개 소스 병렬)

사용자에게 초안을 보여주기 전 Claude가 3개 소스에서 오늘 맥락을 추출한다.

**소스 1 — 현재 대화 세션**: 이번 세션에서 내린 결정·기각한 제안·발견한 부채·AP/외부 피드백과의 합의 또는 갈등 지점을 회상한다. 이게 가장 중요한 원천 데이터다.

**소스 2 — Git 활동**:
```bash
git log --since="1 day ago" --pretty=format:"%h %an %ad %s" --date=short
git diff --stat HEAD~5..HEAD
git status --short
```
어떤 파일을 건드렸고, 어떤 커밋 메시지를 남겼는지 확인.

**소스 3 — Jira 업데이트** (MCP 도구 사용):
```
JQL: project = WL AND updated >= -1d ORDER BY updated DESC
```
오늘 상태가 바뀐 티켓, 새로 생성된 티켓, 댓글이 달린 티켓을 수집.

### STEP 3 — 4섹션 초안 작성

`docs/journal/_template.md` 형식을 엄수하여 초안을 만든다. **이모지 금지** (CLAUDE.md §9 Coding Style). 5분 컷 원칙 — 너무 상세하지 않게.

4섹션 구조:
- **Decisions** — 오늘 내린 핵심 결정 1~3개. 결정 자체보다 **왜 그 방향을 골랐는지**가 핵심.
- **Rejected Paths** — 검토 후 기각한 선택지 + 기각 이유. 없으면 "없음" 명시.
- **Debts & Risks** — 오늘 발견한 부채/리스크, 또는 기존 부채가 오늘 맥락에서 어떻게 드러났는지. DEBT/MISS ID 참조.
- **Message to Tomorrow** — 내일의 나에게 남기는 메모. 꼭 확인할 파일·ID·가정.

### STEP 4 — 사용자 확인 루프

초안을 사용자에게 먼저 **보여주고** 수정·보완 요청을 받는다. 절대 곧바로 저장하지 않는다.

특히 사용자만 정확히 쓸 수 있는 것:
- **Rejected Paths의 "감정적 맥락"** (왠지 불안했다, 이번엔 타이밍상 미뤘다 등 주관적 직관)
- **Message to Tomorrow의 우선순위** (어느 항목부터 봐야 하는지)

Claude는 초안 제시 + 보완 질문으로 사용자의 생각을 끌어낸다. 예:
> 오늘 Rejected Paths 후보로 A·B·C를 감지했습니다. 이 외에 머릿속으로 고민만 하고 말았던 선택지가 있다면 추가해주세요. 특히 "왠지 이건 나중에 터질 것 같다"는 직감이 있었다면 그 항목이 가장 값어치 있습니다.

### STEP 5 — 저장

최종 확정본을 `docs/journal/YYYY-MM-DD.md`에 Write. 갱신 모드였다면 기존 파일을 Read한 뒤 Edit으로 섹션별 머지.

### STEP 6 — 주간 롤업 조건부 제안

요일 확인: `date +%u` (1=월, 7=일).

- **오늘이 일요일(7) 또는 월요일(1)**인 경우: "이번 주 Confluence 주간 페이지 발행을 제안합니다. 진행할까요?"
- 그 외 요일: STEP 6 생략하고 종료.

### STEP 7 — 주간 Confluence 발행 (조건부)

사용자가 주간 페이지 발행에 동의하면:

1. 이번 주 시작일·종료일 계산 (월~일, ISO)
2. 해당 범위의 `docs/journal/YYYY-MM-DD.md` 파일 전부 Glob으로 수집
3. 각 파일의 4섹션을 롤업하여 주간 페이지 초안 작성. 구조:
   - **주간 요약 (Executive Summary)** — 2~3 문단
   - **이번 주 핵심 결정 (Top Decisions)** — 주간 통합 관점
   - **기각한 경로 (Road Not Taken)** — 주간 롤업
   - **기술부채 신규·상환 (Debt Ledger Diff)** — 신규 DEBT/MISS, 상환된 항목
   - **이번 주 Jira 이력** — 표 형식
   - **프로세스 진화 요약** — CLAUDE.md/docs/ 체계 변화
   - **다음 주 전망 (Next Week Outlook)**
4. 사용자 확인 후 Confluence에 발행:
   - cloudId: `opsnowinc.atlassian.net`
   - spaceId: `290848804` (WS)
   - parentId: `309264406` (개발일지 landing)
   - title: `YYYY-WNN (MM-DD ~ MM-DD) 주간 개발일지` (예: `2026-W16 (04-13 ~ 04-19) 주간 개발일지`)
   - contentFormat: `markdown`

---

## 포맷 규칙

- **이모지 금지** — CLAUDE.md §9 Coding Style 준수
- **서사 우선, 작업 목록 금지** — Jira가 이미 What을 기록한다. 여기는 Why.
- **기각 경로는 반드시 이유 포함** — "미래의 자신이 같은 길을 재탐색하는 비용"을 막는 것이 이 섹션의 목적
- **Jira·티켓·파일은 항상 인라인 코드 블록으로** — 예: `WL-118`, `docs/tech-debt.md`
- **일간 파일은 5분 컷, 주간 Confluence는 10~15분**

---

## 공통 실수 방지

| 실수 | 방지책 |
|------|--------|
| Jira 작업 목록을 복사해 옴 | Jira는 링크로만 참조. 서사만 기록 |
| 결정만 쓰고 이유 누락 | "왜 이 방향을 골랐는가"를 한 줄로 반드시 부기 |
| 기각 경로를 "없음"으로 대충 넘김 | 적극적으로 물어보기 — 머릿속에서 스쳐 지나간 옵션도 기각 경로다 |
| 주간 페이지를 일간 파일의 단순 concat으로 작성 | 주간은 "롤업"이다. 개별 결정이 아니라 **주간 흐름과 전환점**을 서술 |
| 이모지를 넣음 | `_template.md`와 기존 `2026-04-18.md` 참조. 파일에는 이모지 없음 |

---

## 참조

- `docs/journal/_template.md` — 표준 템플릿
- `docs/journal/2026-04-18.md` — 첫 엔트리 (품질 기준점)
- AGENTS.md 지식 맵 — `docs/journal/` 항목
- Confluence 개발일지 landing: 309264406
