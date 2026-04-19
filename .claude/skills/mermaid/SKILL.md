---
name: mermaid
description: Mermaid 다이어그램 코드를 생성할 때 적용할 렌더링 표준. SVG 여백 최소화, 줄바꿈 처리, 노드 형태 등 이 프로젝트의 확정 규칙을 강제한다.
---

# Mermaid Rendering Standards

이 스킬을 호출하면 아래 렌더링 규칙을 적용하여 Mermaid 다이어그램 코드를 생성한다.  
사용자가 요청한 다이어그램의 내용·구조는 그대로 따르되, **코드 스타일만** 이 규칙을 따른다.

## 사용법

```
/mermaid [다이어그램 설명 또는 요구사항]
```

예: `/mermaid Admin 권한 체크 플로우를 flowchart TD로 그려줘`

---

## 적용 규칙 (3가지 — 변경 금지)

### 규칙 1 — 줄바꿈: `\n` 금지, `<br/>` 사용

노드 텍스트 내 줄바꿈은 반드시 `<br/>`를 사용한다.

- `htmlLabels: true` init 옵션을 항상 포함한다.
- `\n`을 사용하면 렌더링 시 리터럴 `\n` 문자가 그대로 출력된다.

```
%%{init: {"flowchart": {"htmlLabels": true, ...}}}%%

// 올바름
A["첫 번째 줄<br/>두 번째 줄"]

// 금지
A["첫 번째 줄\n두 번째 줄"]
```

### 규칙 2 — 판정/분류 노드: `{{...}}` 육각형 사용

분기·판정·게이트 역할의 노드는 마름모 `{...}` 대신 육각형 `{{...}}`를 사용한다.

- 마름모는 긴 텍스트가 양쪽으로 잘리는 문제가 있다.
- 육각형은 가로폭이 자동으로 확장되어 텍스트를 온전히 표시한다.
- 판정 노드와 일반 게이트 노드를 색상 클래스로 시각적으로 구분한다.
  - 트랙 판정처럼 진입점 역할이면 → `entry` 클래스 (회색)
  - Audit Gate처럼 체크포인트 역할이면 → `gate` 클래스 (파란색)

```
// 올바름
CLASSIFY{{"트랙 판정<br/>파급력 · 비가역성"}}
AUDIT_GATE{{"Audit Gate<br/>Self-Audit"}}

// 금지
CLASSIFY{"트랙 판정\n파급력 · 비가역성"}
```

### 규칙 3 — SVG 외곽 여백: `padding: 0`

init 설정의 `padding`을 `0`으로 설정하여 SVG 캔버스 외곽 여백을 최소화한다.

- 기본값(`padding: 6`)은 다이어그램 양쪽에 불필요한 공백을 만든다.
- `nodeSpacing`과 `rankSpacing`으로 노드 간격을 직접 제어한다.

```
%%{init: {"flowchart": {"padding": 0, "nodeSpacing": 65, "rankSpacing": 42, "htmlLabels": true}}}%%
```

---

## 출력 형식

모든 Mermaid 코드는 아래 구조를 기본 템플릿으로 한다.  
다이어그램 유형(`flowchart TD`, `sequenceDiagram` 등)은 요청에 따라 변경한다.

````mermaid
%%{init: {"flowchart": {"padding": 0, "nodeSpacing": 65, "rankSpacing": 42, "htmlLabels": true}}}%%
flowchart TD

  %% classDef 정의 (필요한 색상만 포함)
  classDef gate   fill:#dbeafe,stroke:#1e40af,stroke-width:2px,color:#1a1a1a
  classDef entry  fill:#e2e8f0,stroke:#475569,stroke-width:2px,color:#1a1a1a

  %% 노드 및 엣지 정의
  START(["시작"]) --> DECISION{{"판정 노드<br/>설명"}}
  DECISION -->|"경로 A"| A["단계 A"]
  DECISION -->|"경로 B"| B["단계 B"]

  class DECISION entry
````

코드 블록 출력 후 아래 안내를 추가한다.

```
렌더링: mermaid.live 에 위 코드를 붙여 넣으면 바로 확인 가능합니다.
```
