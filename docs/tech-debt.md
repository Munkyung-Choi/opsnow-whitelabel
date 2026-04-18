# 기술 부채 대장 (Technical Debt Ledger)

> **목적**: Jira 티켓으로 환원하기에 모호한 **구조적·패턴 수준**의 부채를 기록한다.
> Ghost commit(방치되는 "나중에 고침") 방지가 존재 이유다.

---

## 역할 분담: Jira vs tech-debt.md

| 유형 | 기록 위치 | 예시 |
|------|----------|------|
| 명확한 구현 작업 | **Jira Follow-up 티켓** | "Admin 로케일 편집 UI에 Zod 검증 추가" |
| 구조적·패턴 부채 | **이 파일** | "동일 컬럼에 두 가지 데이터 형식 혼재" |

원칙: 한 줄 요약으로 "이것을 구현해주세요"가 성립하면 Jira. 아니면 여기.

---

## 운영 규칙

1. **기록 시점**: Audit 단계에서 "지금 처리하지 않고 뒤로 미룸" 결정이 내려진 순간 즉시 기록. 세션 종료까지 미루지 않는다.
2. **조회 시점**: 관련 영역 작업의 Context 단계에서 이 파일을 스캔하여 이번 작업이 기존 부채 상환 기회인지 판단한다.
3. **상환 처리**: 상환 후 해당 항목을 "활성 부채" → "상환된 부채" 섹션으로 이동하고, 커밋 메시지에 `DEBT-ID` 를 참조한다 (예: `fix(WL-xxx): backfill plain-text contents — closes DEBT-001`).
4. **영향도 기준**:
   - **Critical**: 데이터 무결성 위협 또는 보안 경계 손상 가능성
   - **Major**: 디버깅·유지보수 난이도 유의미하게 증가
   - **Minor**: 코드 청결도·가독성 저하

---

## 활성 부채 (Active)

### DEBT-002 — ContactForm handleSubmit + 폼 필드 로직 중복

- **발생일**: 2026-04-19
- **영역**: Marketing UI / ContactForm
- **영향도**: Major (WL-42 Server Action 연동 시 동일 로직을 두 파일에 중복 구현해야 함)
- **연관 파일**: `src/components/marketing/ContactFormMain.tsx`, `src/components/marketing/ContactFormSimple.tsx`
- **연관 티켓**: WL-42 (Server Action 연동)
- **증상**:
  - `handleSubmit` (허니팟 체크 + `setTimeout` 임시 UX)이 두 파일에 동일하게 복사됨
  - 5개 폼 필드(name/company/email/phone/cloud_usage_amount) 렌더링 코드 중복
  - 레이아웃 목적은 다름(2-column vs 1-column)이므로 컴포넌트 자체 통합은 불필요
- **상환 조건**: WL-42 Server Action 연동 시, `ContactFormFields` 서브컴포넌트를 추출하여 두 폼이 공유하도록 리팩터링. 추출 대상: handleSubmit 로직 + 5개 필드 + 성공/에러 상태 관리.
- **상환 우선 조건**: WL-42 착수 전 반드시 처리. 연동 후 처리 시 Server Action이 두 곳에 복붙되어 SSOT 위반이 영속화됨.

---

### DEBT-001 — contents.title/subtitle/body 평문 스칼라와 i18n 객체 혼재

- **발생일**: 2026-04-18
- **영역**: DB schema / i18n
- **영향도**: Major
- **연관 티켓**: WL-83 (i18n 전환), WL-105 (jsonb 마이그레이션 수정), WL-115 Follow-up #4
- **증상**:
  - WL-83 이후 일부 행은 `{"ko":"…","en":"…"}` JSON 객체로 저장됨
  - seed 기반 행(terms/privacy 등)은 `20260416000001_alter_contents_jsonb.sql`의 `to_jsonb(text)` 경로를 타고 JSON 문자열 스칼라 `"이용약관"` 형태로 보존됨
  - 즉, 동일 컬럼에 **객체**와 **스칼라** 두 형식이 공존
- **현재 대응**: 렌더 레이어에서 `typeof value === 'object'` 분기로 방어. 실질적 장애는 없으나 i18n 확장 시 스칼라 행의 번역 키 부재 문제.
- **상환 조건**:
  - 평문 스칼라 행을 `{<default_locale>: <value>}` 객체로 승격하는 백필 마이그레이션
  - 백필 시 각 파트너의 `partners.default_locale`을 참조해 locale 키 결정
  - 백필 후 렌더 레이어의 타입 분기 제거
- **상환 우선 조건**: 두 번째 locale(en 외) 콘텐츠 운영이 실질화되기 전 처리 권장.

---

## 감사 누락 사례 (Audit Misses)

> 사전 Audit에서 놓쳤으나 사후에 드러난 결함을 기록한다. 부정적 지식 기반(Negative Knowledge Base)으로 기능하여 동일 blind spot의 재발을 막는다.
> **기록 시점**: 사후 발견 직후 즉시. Auditor sub-agent가 Step 1(맥락 수집)에서 이 섹션을 읽는다.

### MISS-001 — `to_jsonb(plain_text)` JSON string scalar 생성 누락

- **발생일**: 2026-04-18
- **발견 경로**: WL-105 수정 작업 중 AP Architect가 단순 `to_jsonb()` 치환을 제안. 구현 전 재검토에서 구조적 결함 발견.
- **영역**: DB migration / i18n
- **영향도**: Major (누설 시 i18n 렌더링 깨짐)
- **Miss 내용**: `to_jsonb(plain_text)` 변환은 JSON **string scalar** (`"이용약관"`)를 생성함. i18n 레이어는 **객체** (`{"ko":"…"}`) 형태를 기대. 평문이 단순히 JSONB 타입으로 래핑되어도 의미론적 구조는 보존되지 않음.
- **왜 사전 Audit에서 놓쳤는가**:
  - 데이터 변환 마이그레이션 Audit 체크리스트에 "평문 vs JSON-shaped 텍스트" 구분 규칙이 부재
  - `to_jsonb()`의 타입 수준 정확성만 검증하고 의미론적 구조 보존 여부를 별도 관점으로 다루지 않음
- **학습**:
  - 데이터 변환 마이그레이션은 타겟 컬럼의 실제 샘플 5행 이상 전/후 형태를 **의미론 단위**로 명시 필요
  - 특히 `to_jsonb()`, `::jsonb`, `jsonb_build_object()` 등 JSON 변환 함수는 입력이 **스칼라인지 객체 JSON 문자열인지**를 분류 후 선택
- **재발 방지 적용**:
  - CLAUDE.md §MED 트랙 Step 4 "데이터 변환 검증" 항목에 NULL/빈 문자열/특수문자/비정형 JSON 샘플 강제 포함 (2026-04-18)
  - HIGH 트랙 Auditor 스폰 프롬프트 Step 2 "Data Integrity" 관점에 타입 불일치 증명 의무 포함 (2026-04-18)
- **연관**: DEBT-001, WL-83, WL-105

---

## 상환된 부채 (Resolved)

_(없음)_
