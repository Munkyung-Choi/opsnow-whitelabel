---
name: perf-eval
description: 특정 기간 기준으로 프로젝트 배달 성과(티켓 처리·커밋 활동·테스트 추이·기술 부채)를 커밋 시점 실증 기반으로 냉엄하게 평가하고 Confluence Live Doc 자식 페이지를 생성한다.
---

# perf-eval — 프로젝트 Perf 평가

## 용도

특정 기간 기준으로 프로젝트 배달 성과를 **숫자로 증명 가능한 사실**만으로 냉엄하게 평가한다.
"바빴다", "열심히 했다"는 근거가 아니다. 티켓·커밋·테스트 수치가 근거다.

## 사용법

```
/perf-eval [기간]
```

예: `/perf-eval 260420~22`

---

## 실행 절차

### STEP 1 — 직전 평가 양식 확정

1. Confluence 부모 페이지(`309232105`) 하위 자식 페이지 목록을 `getConfluencePageDescendants`로 조회한다.
2. 가장 최근 자식 페이지를 `getConfluencePage(contentFormat: "markdown")`으로 읽어 양식을 확정한다.
3. 자식 페이지가 없으면(첫 실행) STEP 2 수집 후 STEP 3의 기본 항목으로 양식을 정의한다.
4. **양식을 확정하기 전까지 평가를 시작하지 않는다.**

### STEP 2 — 기간 내 실측 데이터 수집

| 측정 항목 | 방법 |
|----------|------|
| 기간 내 커밋 목록·수 | `git log --oneline --after="[시작일]" --before="[종료일] 23:59"` |
| 수정→재수정 패턴 | `git log --oneline --grep="WL-XXX"` 로 같은 티켓 커밋 수 확인 |
| 완료 Jira 티켓 | `searchJiraIssuesUsingJql`: `project = WL AND status = Done AND updated >= "[시작일]" AND updated <= "[종료일]" ORDER BY updated ASC` |
| 테스트 수 변화 | 기간 내 커밋 메시지에서 vitest/playwright 수치 추출 |
| 기술 부채 증감 | `docs/tech-debt.md` Read + 기간 내 DEBT/MISS 항목 변화 |
| skipped 테스트 증감 | 기간 시작·종료 시점 playwright skipped 수치 비교 |

**커밋 시점 반드시 확인**: 기간 외 커밋은 해당 기간의 성과로 집계하지 않는다.

### STEP 3 — 냉엄 평가 작성

직전 평가 양식을 계승하여 각 항목을 평가한다.

**첫 실행 시 기본 평가 항목** (직전 평가 없을 때 이 구조로 정의):

| # | 항목 | 측정 기준 |
|---|------|---------|
| 1 | 티켓 처리 속도 | 기간 내 Done 티켓 수 / 스프린트 목표 달성률 |
| 2 | 커밋 품질 | 수정→재수정 패턴 빈도, 커밋 단위 원자성, 메시지 규칙 준수 |
| 3 | 테스트 성과 추이 | Vitest/Playwright 통과 수 변화, skipped 증감 |
| 4 | 기술 부채 증감 | 신규 DEBT/MISS 추가 수 vs 해결(상환) 수 |
| 5 | 하네스 공정 준수 | Human Check 누락, Test Contract 없는 Impl, Audit 없는 Impl 여부 |

**평가 원칙**:
- 긍정 측면도 커밋 해시·티켓 번호·수치로 근거를 제시한다.
- "바빴다", "어려운 문제였다"는 감점 면제 사유가 아니다.
- 직전 평가 대비 수치 변화(↑/→/↓)를 반드시 표기한다.

### STEP 4 — 종합 평가 + 결론 작성

**종합 항목별 요약표**: 직전 평가 → 현재 평가 비교.

**최종 판정**: 한 문장 제목 + 잘한 것 / 문제점 / 다음 기간 권고 형식.

### STEP 5 — 초안 사용자 확인

작성된 평가 전문(全文)을 사용자에게 보여주고 수정 요청을 받는다.
사용자 확인 없이 바로 Confluence에 발행하지 않는다.

### STEP 6 — Confluence Live Doc 자식 페이지 생성

사용자 확인 후 `createConfluencePage`로 신규 자식 페이지를 생성한다.

| 파라미터 | 값 |
|---------|---|
| cloudId | `opsnowinc.atlassian.net` |
| spaceId | `290848804` (WS Space) |
| parentId | `309232105` (Perf 평가 부모) |
| title | `Perf-[기간]` (예: `Perf-260420~22`) |
| contentFormat | `markdown` |
| subtype | `live` ← **Live Doc 필수. 일반 페이지로 발행 금지.** |

---

## 공통 실수 방지

| 실수 | 방지책 |
|------|--------|
| 기간 외 커밋을 성과로 집계 | `git log --after --before` 범위 엄수 |
| 수치 없이 "좋았다/나빴다" 서술 | 티켓 수·커밋 수·테스트 수를 반드시 명시 |
| 직전 평가 양식을 임의로 변경 | STEP 1 양식 확정 후 그대로 계승 |
| 사용자 확인 없이 바로 Confluence 발행 | STEP 5 확인 루프 필수 |
| "노력/과정"을 점수 근거로 사용 | 완료된 수치·커밋·티켓만 인정 |

---

## 참조

- Confluence 부모: `https://opsnowinc.atlassian.net/wiki/spaces/WS/pages/309232105`
- cloudId: `opsnowinc.atlassian.net`
- Jira 프로젝트: `WL`
