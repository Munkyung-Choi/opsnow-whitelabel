# 화이트라벨 사이트 빌더 — Claude Code 스킬 가이드북

> **대상 독자**: 이 프로젝트에 합류하는 모든 개발자 및 AI 협업자  
> **목적**: `.claude/skills/`에 설치된 9종 스킬의 역할·사용법·워크플로우 통합 방법을 정의한다  
> **최종 수정**: 2026-04-14  

---

## 1. 설치 스킬 개요

| # | 스킬명 | 슬래시 명령 | 핵심 기능 | 하네스 단계 |
|---|--------|------------|-----------|------------|
| 1 | `nextjs-best-practices` | `/nextjs-best-practices` | RSC·데이터 페칭·라우팅 패턴 결정 트리 | Step 2 |
| 2 | `multi-tenancy-saas` | `/multi-tenancy-saas` | 파트너 격리·RLS·온보딩·오프보딩 설계 | Step 2 |
| 3 | `supabase` | `/supabase` | Supabase CLI·마이그레이션·Edge Functions·타입 생성 | Step 2, 6 |
| 4 | `security` | `/security` | OWASP Top 10 2단계 감사 (aegis → arbiter) | Step 3 |
| 5 | `security-audit` | `/security-audit` | 체크리스트 기반 8개 범주 코드 보안 감사 | Step 3, 4 |
| 6 | `supabase-audit-rls` | `/supabase-audit-rls` | Supabase RLS bypass 5개 벡터 전문 감사 | Step 3 |
| 7 | `database-migration` | `/database-migration` | 멱등성 SQL + workspace isolation RLS 패턴 | Step 6 |
| 8 | `jira-syntax` | `/jira-syntax` | Jira wiki 마크업 변환·검증·템플릿 | Step 7 |
| 9 | `changelog-generator` | `/changelog-generator` | Conventional Commits 기반 릴리스 노트 생성 | Step 7 |

---

## 2. 화이트라벨 프로젝트에서의 역할

### 2.1 멀티테넌시 및 파트너 격리 설계

이 프로젝트의 핵심은 **파트너별 완전한 데이터 격리**다. 스킬 3종이 이를 직접 지원한다.

```
[설계 단계]          [구현 단계]           [검증 단계]
multi-tenancy-saas → database-migration → supabase-audit-rls
     ↓                      ↓                     ↓
 격리 구조 설계       workspace_id RLS 작성    bypass 취약점 테스트
```

**`multi-tenancy-saas`의 DoD(완료 기준) 10개 항목**은 파트너 격리 작업의 체크리스트로 직접 활용한다:

- DB 레이어 RLS 강제 적용
- 모든 리포지터리에 파트너 컨텍스트 필수화
- 캐시를 `partner_id`로 네임스페이스 격리
- 로그에 `partner_id` 포함

**`database-migration`의 workspace isolation 패턴**은 이 프로젝트에서 `partner_id`로 매핑된다:

```sql
-- 모든 파트너 데이터 테이블에 필수 적용
CREATE TABLE partner_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  -- ...
);

CREATE INDEX IF NOT EXISTS idx_partner_pages_partner ON partner_pages(partner_id);
ALTER TABLE partner_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_isolation" ON partner_pages;
CREATE POLICY "partner_isolation" ON partner_pages
  FOR ALL USING (
    partner_id IN (
      SELECT p.id FROM partners p
      WHERE p.id = current_setting('app.partner_id')::uuid
    )
  );
```

### 2.2 Supabase + Next.js App Router 환경에서의 보안 및 성능

**보안 체인**: 3개 스킬이 서로 다른 레이어를 커버한다.

| 스킬 | 커버 레이어 | 주요 검사 항목 |
|------|-----------|--------------|
| `security` | 전체 코드베이스 | OWASP Top 10, 시크릿 노출, 의존성 취약점 |
| `security-audit` | PR·배포 전 | Hardcoded keys, npm audit, 인증 로직, CORS |
| `supabase-audit-rls` | DB 레이어 | 익명 접근, 크로스 파트너 접근, filter bypass, RPC bypass |

**성능 관련**: `nextjs-best-practices`의 결정 트리를 따르면 불필요한 클라이언트 번들을 방지한다.

```
컴포넌트 작성 시 판단 흐름:
  useState/useEffect/이벤트 핸들러 필요? → 'use client' (Leaf Component)
  데이터 페칭만 필요?                   → Server Component (기본값)
  둘 다 필요?                          → Server 부모 + Client 자식으로 분리
```

**타입 안전성**: `supabase` 스킬의 타입 생성 명령을 DB 변경 시마다 실행한다:

```bash
supabase gen types typescript --local > src/types/supabase.ts
# 또는 CLAUDE.md의 명령어:
npx supabase gen types typescript --project-id gzkmsiskdbtuxpeaqwcp > src/types/supabase.ts
```

### 2.3 협업 생산성 향상

**`jira-syntax`**: Claude가 Jira 댓글을 작성할 때 Markdown이 아닌 Jira wiki 마크업을 자동 사용하게 된다.

```
Markdown (❌ Jira에서 깨짐)    →    Jira Wiki Markup (✅)
## 제목                              h2. 제목
**굵게**                             *굵게*
`코드`                               {{코드}}
[링크](url)                          [링크|url]
- 목록                               * 목록
```

**`changelog-generator`**: 매 배포 전 git 히스토리에서 릴리스 노트를 자동 생성한다. `feat:`, `fix:`, `security:` 등 Conventional Commits 형식을 이 프로젝트가 이미 사용하고 있으므로 즉시 활용 가능하다.

---

## 3. 단계별 사용법 및 실전 예시

### 3.1 `/security` — OWASP 전체 감사

**언제 사용**: 새 인증 로직, RLS 정책, supabaseAdmin 사용 코드 작성 후

**기본 사용법**:
```
/security
/security src/middleware/proxy.ts
/security --deps
/security --verify
```

**실전 예시 1 — 신규 파트너 온보딩 API 감사**:
```
/security src/app/api/partners/route.ts

→ Phase 1: aegis가 스캔
   - supabaseAdmin 노출 여부 확인
   - partner_id 없이 쿼리하는 패턴 탐지
   - 입력값 검증 누락 확인

→ 취약점 발견 후 수정 → /security --verify
```

**실전 예시 2 — 배포 전 전체 감사**:
```
/security --deps

→ npm audit 실행
→ 알려진 취약점 패키지 리포트
→ CRITICAL: 배포 차단 / HIGH: 7일 내 수정
```

---

### 3.2 `/supabase-audit-rls` — RLS Bypass 전문 감사

**언제 사용**: 🚨 HIGH 위험 등급 — RLS 정책 신규 생성·수정 시 반드시 실행

**테스트 벡터 5종**:
1. 익명(anon key) 접근 시도
2. 크로스 파트너 데이터 접근
3. OR 조건 filter bypass
4. JOIN을 통한 데이터 노출
5. RPC 함수의 RLS 우회 여부

**실전 예시 3 — leads 테이블 RLS 검증**:
```
Test RLS on the leads table

→ 자동으로 5개 벡터 테스트 실행
→ .sb-pentest-context.json에 결과 실시간 기록
→ 취약점 발견 시 즉시 수정 SQL 제안:
   ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "partner_isolation" ON leads
     FOR ALL USING (partner_id = current_setting('app.partner_id')::uuid);
```

---

### 3.3 `/database-migration` — 멱등성 마이그레이션 생성

**언제 사용**: 새 테이블 생성, 컬럼 추가, RLS 정책 변경 시

**핵심 패턴** — 반드시 따를 것:
```sql
-- ✅ 멱등성: IF NOT EXISTS 사용
CREATE TABLE IF NOT EXISTS partner_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  primary_color TEXT NOT NULL DEFAULT '#000000',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ✅ 인덱스
CREATE INDEX IF NOT EXISTS idx_partner_themes_partner ON partner_themes(partner_id);

-- ✅ RLS 활성화
ALTER TABLE partner_themes ENABLE ROW LEVEL SECURITY;

-- ✅ DROP 후 재생성 (멱등성 보장)
DROP POLICY IF EXISTS "partner_isolation" ON partner_themes;
CREATE POLICY "partner_isolation" ON partner_themes
  FOR ALL USING (partner_id = current_setting('app.partner_id')::uuid);
```

**실전 예시 4 — 파트너별 커스텀 도메인 테이블 추가**:
```
/database-migration

"파트너별 커스텀 도메인을 관리하는 partner_domains 테이블을 추가해줘.
partner_id로 격리하고, verified 컬럼(boolean)을 포함해야 해."

→ 위 패턴에 맞는 멱등성 SQL 생성
→ 체크리스트 자동 검증:
   ✅ IF NOT EXISTS 사용
   ✅ workspace_id(여기선 partner_id) 컬럼
   ✅ RLS 활성화
   ✅ 정책 작성
```

---

### 3.4 `/nextjs-best-practices` — App Router 컴포넌트 설계

**실전 예시 5 — HeroSection 컴포넌트 설계 검토**:
```
/nextjs-best-practices

"HeroSection에서 파트너 테마 데이터를 가져오는데 useState를 쓰고 있어.
이게 맞는 패턴인지 검토해줘."

→ 결정 트리 적용:
   - 파트너 테마 = DB 데이터 = Server Component에서 fetch
   - 애니메이션 = 인터랙션 = Leaf Client Component 분리
   → 권장 구조 제안
```

---

### 3.5 `/jira-syntax` — Jira 댓글 포맷 생성

**실전 예시 6 — Step 7 보고 댓글 작성**:
```
/jira-syntax

"WL-74 작업 완료 보고 댓글을 Jira 마크업으로 작성해줘.
작업 상태: Success
수정 파일: PainPoints.tsx, globals.css
테스트: TC-21, TC-22 Pass"

→ 다음 형식으로 변환:
   *작업 상태:* Success
   *수정된 주요 파일:*
   * PainPoints.tsx
   * globals.css
   *테스트 결과:* TC-21, TC-22 Pass
```

---

## 4. 워크플로우 통합 가이드 (하네스 Step 2~7)

```
Step 1: Context Manager
  └─ Atlassian MCP로 Jira 티켓 및 Confluence 문서 인덱싱 (스킬 불필요)

Step 2: Lead Architect
  ├─ /multi-tenancy-saas   → 파트너 격리 구조 설계 검토
  ├─ /nextjs-best-practices → RSC/Server Action 구조 결정
  └─ /supabase             → Supabase 스택 설계 (RLS·Migration·Edge Functions)

Step 3: Security Auditor  ← 🚨 HIGH 위험 작업 시 필수
  ├─ /security             → OWASP Top 10 전체 감사 (aegis 스캔 → arbiter 검증)
  ├─ /security-audit       → 체크리스트 기반 정밀 감사 (8개 범주)
  └─ /supabase-audit-rls   → RLS bypass 5개 벡터 테스트 (DB 변경 시 필수)

Step 4: Iteration
  └─ /security-audit       → Auditor 지적사항 수정 후 재검증

Step 5: Human Approval
  └─ 문경 님의 명시적 승인 대기 (스킬 불필요)

Step 6: Execution
  ├─ /database-migration   → 멱등성 SQL 생성 및 체크리스트 검증
  └─ /supabase             → 마이그레이션 적용 및 타입 재생성

Step 7: Reporting
  ├─ /jira-syntax          → Jira wiki 마크업으로 댓글 포맷 변환
  └─ /changelog-generator  → Conventional Commits 기반 릴리스 노트 생성
```

### 4.1 위험도별 스킬 조합

**🚨 HIGH — RLS/Auth/DB Schema 변경**:
```
Step 2: /multi-tenancy-saas + /supabase
Step 3: /security + /supabase-audit-rls (2중 검증 필수)
Step 6: /database-migration
Step 7: /jira-syntax + /changelog-generator
```

**⚠️ MEDIUM — 복잡한 비즈니스 로직, 외부 API 연동**:
```
Step 2: /nextjs-best-practices
Step 3: /security-audit
Step 6: /supabase (타입 동기화)
Step 7: /jira-syntax
```

**✅ LOW — UI 컴포넌트, 단순 리팩토링**:
```
Step 2: /nextjs-best-practices (선택)
Step 6: 직접 구현
Step 7: /changelog-generator (릴리스 시)
```

---

## 5. 유지보수 가이드

### 5.1 Windows 환경 파일 형식 주의사항

스킬 파일은 GitHub에서 LF 형식으로 내려받지만, Windows에서 git이 CRLF로 변환한다. 이는 정상 동작이며 스킬 기능에 영향 없음.

```bash
# 커밋 시 아래 경고가 나와도 무시해도 됨:
# warning: LF will be replaced by CRLF in .claude/skills/*/SKILL.md
```

`.gitattributes`로 강제 통일하려면:
```
.claude/skills/**/*.md text eol=lf
```

### 5.2 MCP 서버 상태 확인

```bash
# 전체 MCP 연결 상태 확인
claude mcp list

# skillsmp, vibeindex가 Connected인지 확인
# ✓ Connected → 정상
# ! Needs authentication → 재인증 필요
# ✗ Failed → 서버 재시작 필요
```

### 5.3 새 스킬 추가 절차

1. **탐색**: skillsmp MCP에서 자연어 검색
2. **검증**: smithery REST API로 품질 확인
   ```bash
   curl.exe "https://registry.smithery.ai/skills?q=<키워드>&pageSize=10"
   # verified, useCount, qualityScore 확인
   ```
3. **경로 확인**: GitHub API로 SKILL.md 경로 확인
   ```bash
   curl.exe "https://api.github.com/repos/<owner>/<repo>/contents/<path>"
   ```
4. **설치**: 수동 다운로드 (skills CLI는 .agents/ 경로로 잘못 설치됨)
   ```bash
   mkdir -p .claude/skills/<skill-name>
   curl.exe -o .claude/skills/<skill-name>/SKILL.md "<download_url>"
   ```
5. **커밋**: `git add .claude/skills/` 후 커밋

> **⚠️ 주의**: `npx skills add` CLI는 `.agents/skills/`에 설치하므로 Claude Code에서 인식되지 않는다. 반드시 수동으로 `.claude/skills/`에 설치할 것.

### 5.4 스킬 업데이트 확인

스킬 파일은 외부 GitHub 저장소에서 특정 시점에 복사한 것이다. 최신 버전 확인:

```bash
# 현재 설치된 스킬의 원본 저장소 확인 (SKILL.md 상단 frontmatter의 gitUrl 참조)
# 예: parcadei/security
curl.exe "https://api.github.com/repos/parcadei/Continuous-Claude-v3/commits?path=.claude/skills/security/SKILL.md&per_page=1"
# 최신 커밋 날짜와 로컬 설치일 비교
```

### 5.5 스킬 설치 현황 빠른 확인

```bash
ls .claude/skills/
# 예상 출력:
# changelog-generator  database-migration  jira-syntax
# multi-tenancy-saas   nextjs-best-practices  security
# security-audit       supabase  supabase-audit-rls
```

---

## 6. 자주 쓰는 명령어 한눈에 보기

### 신규 기능 개발 시작
```
1. /multi-tenancy-saas    → "파트너별 [기능]을 격리하는 구조 검토해줘"
2. /nextjs-best-practices → "이 컴포넌트를 RSC로 어떻게 구조화할지 검토해줘"
3. /supabase              → "이 스키마에 맞는 마이그레이션 작성해줘"
```

### DB/RLS 변경 전 필수 루틴
```
1. /database-migration       → 멱등성 SQL 생성
2. /supabase-audit-rls       → "Test RLS on the [테이블명] table"
3. /security                 → "/security src/app/api/..."
```

### 배포 전 체크
```
1. /security --deps          → 의존성 취약점 스캔
2. /security-audit           → 코드 보안 체크리스트
3. /changelog-generator      → 릴리스 노트 생성
4. /jira-syntax              → Jira 댓글 포맷 변환
```

---

> **참고**: 이 문서는 `.claude/skills/` 하위 SKILL.md 파일을 기반으로 작성되었다.  
> 스킬 추가·삭제 시 이 문서도 함께 업데이트할 것.  
> Confluence 원본: https://opsnowinc.atlassian.net/wiki/spaces/WS/pages/298189091/Claude+Skills
