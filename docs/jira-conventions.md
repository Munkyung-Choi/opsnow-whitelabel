# Jira 컨벤션 — WL 프로젝트

## 커스텀 필드 (신규 티켓 생성 시 필수)

WL 프로젝트의 모든 신규 티켓에 아래 커스텀 필드를 반드시 입력한다.

| 필드 이름  | 커스텀 필드 ID | API Key              | 타입           |
|------------|--------------|----------------------|----------------|
| DevType    | 10412        | `customfield_10412`  | multicheckboxes |
| Item       | 10346        | `customfield_10346`  | multicheckboxes |
| Tech Risk  | 10445        | `customfield_10445`  | select (단일)  |

### Tech Risk 허용값

| 값 | Option ID | 해당 Harness 트랙 | 승인 방식 |
|----|-----------|------------------|----------|
| `🟥Critical` | 11244 | Critical 트랙 — RLS 신규·변경, Column Type 변경, Data Update/Backfill, Auth·Proxy·Session, Column/Table Drop | **동기식 승인** (세션 내 대면 검토) |
| `🟨High`     | 11245 | High 트랙 — nullable Column 추가, 신규 Index, CHECK 제약 확장, 복구 용이한 스키마 추가 | **비동기 승인** (Jira 댓글 승인 가능) |
| `🟫Med`      | 11262 | Med 트랙 — 신규 페이지, CRUD, API 연동 | 불필요 |
| `🟩Low`      | 11246 | Low 트랙 — UI/CSS, i18n 번역, 문서화 | 불필요 |

Tech Risk는 `CLAUDE.md` 트랙 분류 기준으로 설정한다. 판단 불확실 시 상위 등급으로 올린다 (Fail-safe).

## 허용값 조회 절차 (티켓 생성 전 필수)

허용값은 Jira 설정에 따라 변동될 수 있으므로, **티켓 생성 직전에 반드시 현재 허용값을 Jira에서 조회**한다.

### 1단계: 해당 이슈 타입의 필드 메타 조회

`getJiraIssueTypeMetaWithFields`로 이슈 타입별 커스텀 필드 허용값을 가져온다.

```
cloudId: opsnowinc.atlassian.net
projectIdOrKey: WL
issueTypeId: <생성할 이슈 타입 ID>
  - Task   → 10790
  - Story  → 10791
  - Bug    → 10792
  - Epic   → 10787
```

응답에서 `customfield_10412.allowedValues`와 `customfield_10346.allowedValues`를 확인한다.

### 2단계: 티켓 내용에 맞는 값 선택

조회된 허용값 중 티켓 성격에 맞는 값을 선택한다.

### 3단계: `createJiraIssue` 호출 시 포함

```json
{
  "additional_fields": {
    "customfield_10412": { "value": "<조회된 DevType 값>" },
    "customfield_10346": { "value": "<조회된 Item 값>" },
    "customfield_10445": { "value": "🟥Critical" }
  }
}
```

> Tech Risk는 `CLAUDE.md` 트랙 분류 기준으로 결정한다. 허용값: `🟥Critical` / `🟨High` / `🟫Med` / `🟩Low`

> **주의**: 허용값 목록을 문서에 하드코딩하지 않는다. Jira에서 언제든 변경될 수 있다.

---

## Epic 배치 (신규 티켓 생성 시 필수)

모든 신규 티켓은 반드시 적절한 Epic 하위에 배치한다.

### Epic 조회 절차

Epic 목록을 문서에 하드코딩하지 않는다. 티켓 생성 전 아래 JQL로 현재 Epic 목록을 조회한다.

```
project = WL AND issuetype = Epic ORDER BY created ASC
```

`searchJiraIssuesUsingJql`로 조회하여 티켓 내용에 맞는 Epic을 선택한다.

### 배치 기준

- 티켓의 도메인(i18n, Admin, Marketing, 인프라 등)이 명확하면 해당 Epic 하위에 배치한다.
- 복수 Epic에 걸치는 경우 **주된 작업 도메인** 기준으로 하나만 선택한다.
- 어느 Epic에도 속하지 않는 경우, 신규 Epic 생성이 필요한지 문경 님에게 확인 후 결정한다.
