---
name: migration-safe
description: Supabase 마이그레이션 파일 작성 전 안전 체크리스트. 멱등성 확인, RLS 정책 포함 여부, Breakpoint 적용 여부, 실행 도구(SQL Editor vs db push) 결정까지 안내한다.
---

# Migration Safety Checklist

마이그레이션 파일을 작성하거나 기존 파일을 수정하기 전에 이 체크리스트를 실행합니다.

## 사용법

```
/migration-safe [마이그레이션 목적 한 줄 설명]
```

예: `/migration-safe hero_image_url 컬럼을 partners 테이블에 추가`

---

## 작업 유형 판단 (첫 번째 질문)

먼저 아래 표를 기준으로 **작업 유형**을 확인합니다.

| 작업 | 유형 | 실행 도구 | Breakpoint |
|------|------|----------|------------|
| 새 기능을 위한 **신규 파일 생성** | NEW | `supabase db push` | 불필요 |
| 기존 마이그레이션 파일 **수정** (Fix/Hotfix) | FIX | SQL Editor 직접 실행 | **필요 (#1)** |
| RLS 정책 **신규 생성 또는 수정** | RLS | SQL Editor 직접 실행 | **필요 (#2)** |
| 컬럼 삭제, 테이블 DROP 등 **파괴적 변경** | DROP | SQL Editor 직접 실행 | **필요 (#1)** |

> ⚠️ FIX/RLS/DROP 유형은 반드시 **문경 님 승인 후** 실행합니다. 지금 바로 멈추고 보고하세요.

---

## 신규 마이그레이션 파일 작성 체크리스트 (NEW 유형)

### 1. 파일명 규칙 확인
- [ ] 형식: `YYYYMMDDHHMMSS_설명.sql` (타임스탬프 선행)
- [ ] 타임스탬프가 기존 파일보다 최신인지 확인:
  ```bash
  ls supabase/migrations/ | sort | tail -5
  ```
- [ ] 설명이 변경 내용을 명확히 표현하는가? (예: `add_hero_image_url`, `normalize_partner_content`)

### 2. 멱등성(Idempotency) 확인
모든 마이그레이션 SQL은 여러 번 실행해도 같은 결과가 나와야 합니다.

```sql
-- ✅ 올바른 패턴
ALTER TABLE partners ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
CREATE INDEX IF NOT EXISTS idx_partners_subdomain ON partners(subdomain);
CREATE TABLE IF NOT EXISTS new_table (...);
DROP TABLE IF EXISTS old_table;

-- ❌ 잘못된 패턴 (재실행 시 에러)
ALTER TABLE partners ADD COLUMN hero_image_url TEXT;  -- IF NOT EXISTS 누락
CREATE TABLE new_table (...);                          -- IF NOT EXISTS 누락
```

- [ ] 모든 `ADD COLUMN`에 `IF NOT EXISTS` 포함
- [ ] 모든 `CREATE TABLE`에 `IF NOT EXISTS` 포함
- [ ] 모든 `CREATE INDEX`에 `IF NOT EXISTS` 포함
- [ ] `DROP` 구문에 `IF EXISTS` 포함

### 3. RLS 정책 확인
- [ ] 새 테이블 생성 시: RLS가 활성화되어 있는가?
  ```sql
  ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
  ```
- [ ] SELECT / INSERT / UPDATE / DELETE 각각에 대한 정책이 존재하는가?
- [ ] `partner_id` 기반 격리가 올바르게 구현되는가?
- [ ] 정책 작성 후 `SECURITY.md`의 접근 행렬을 업데이트했는가?

### 4. 파트너 격리 영향 분석
- [ ] 이 변경이 여러 파트너 데이터에 영향을 주는가?
- [ ] 기존 데이터 마이그레이션이 필요한가? (예: NULL 컬럼에 기본값 채우기)
  ```sql
  -- 기존 데이터 채우기 예시 (멱등성 유지)
  UPDATE partners SET hero_image_url = '' WHERE hero_image_url IS NULL;
  ```
- [ ] 변경 후 TypeScript 타입 동기화가 필요한가? → 완료 후 `npx supabase gen types typescript ...` 실행

### 5. 실행 전 최종 점검
- [ ] `supabase db push --dry-run`으로 실제 실행될 SQL 미리 확인 (지원하는 경우)
- [ ] 로컬 DB에서 먼저 테스트했는가?
- [ ] `docs/design/db-schema.md`의 ERD 업데이트 예정인가?

---

## 실행 후 필수 작업

```bash
# 1. TypeScript 타입 동기화
npx supabase gen types typescript --project-id gzkmsiskdbtuxpeaqwcp > src/types/supabase.ts

# 2. 타입 체크
npx tsc --noEmit

# 3. ERD 업데이트
# docs/design/db-schema.md의 Mermaid 다이어그램 수동 업데이트
```

---

## 에스컬레이션 체크포인트

다음 중 하나라도 해당하면 **즉시 작업을 멈추고 문경 님에게 보고**합니다:

- 기존 테이블의 컬럼을 **삭제**하려는 경우
- **RLS 정책을 신규 생성하거나 수정**하려는 경우  
- **기존 마이그레이션 파일을 수정**하는 경우 (이미 실행된 파일)
- NOT NULL 컬럼을 기존 데이터가 있는 테이블에 추가하는 경우
