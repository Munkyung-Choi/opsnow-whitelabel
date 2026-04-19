---
name: end-dev
description: 세션 종료 전 오늘의 작업 서사를 docs/journal/YYYY-MM-DD.md에 박제한다. 대화·git diff·Jira 업데이트를 교차하여 4섹션 초안을 작성하고, 사용자 확인을 받은 뒤 저장한다. 주간 Confluence 롤업은 다음 월요일 /start-dev 실행 시 자동 제안된다.
---

# Decision Journal — Daily Wrap

이 스킬은 비개발자 오너의 **"이해도 부채"**를 줄이는 운영 도구다. 하루의 작업 서사(행위가 아닌 결정의 이유·기각 경로·부채·메모)를 표준 템플릿으로 박제한다.

## 사용법

```
/end-dev
```

인수 없음. 오늘 날짜를 자동으로 사용한다. 특정 날짜를 기록하려면 명시적 요청 필요 (예: "어제 치의 저널을 지금 작성").

---

## 실행 절차 (순서 준수)

### STEP 1 — Preflight

1. 오늘 날짜 확인: `date +%Y-%m-%d` (예: 2026-04-19)
2. **Test Integrity Gate** (soft check — 아래 두 가지를 사용자에게 확인한다):
   - "오늘 세션의 변경사항이 `npx playwright test` 결과에 반영되었으며 0 regression 상태임을 확인했는가?"
   - "Flaky 결과가 있다면 그 사유를 인지하고 있는가?"
   - 미확인 시: `npx playwright test` 실행을 권고한다. 단, 사용자가 "확인 생략"을 명시하면 진행한다.
3. **Context Preservation Gate** (soft check):
   - "오늘 기각한 선택지의 이유가 일지에 기록될 준비가 되어 있는가?"
   - 이 단계는 차단 조건이 아니라 STEP 4 Rejected Paths 보완의 사전 준비다.
4. `docs/journal/YYYY-MM-DD.md` 존재 여부:
   - **없음** → 신규 생성 경로 (STEP 2로)
   - **있음** → 갱신 모드 공지 + 기존 내용 읽어서 사용자에게 보여주고 "추가 갱신" vs "처음부터 재작성" 선택 질문
5. `docs/journal/_template.md` 템플릿 구조를 메모리에 로드

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

종료. 주간 Confluence 리포트 생성은 다음 월요일 `/start-dev` 실행 시 자동 제안된다.

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
