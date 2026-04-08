# SKILL.md — OpsNow White-label Site 공용 명령어 자산

> 이 파일은 프로젝트 운영에 필요한 명령어를 **repo 공용 자산**으로 관리합니다.
> Claude Code와 Codex 모두 이 파일을 참조합니다.

---

## 🔧 개발 서버

```bash
npm run dev          # 로컬 개발 서버 실행 (localhost:3000)
```

---

## ✅ 코드 품질 검사

```bash
npm run lint         # ESLint — 문법 및 컨벤션 검사
npm run type-check   # TypeScript tsc --noEmit — 타입 안전성 검사
npm run build        # Next.js 프로덕션 빌드 (에러 최종 확인)
```

> 세 가지 모두 통과해야 PR 머지 가능. GitHub CI가 자동 실행함.

---

## 🗄️ Supabase

### 타입 재생성 (DB 스키마 변경 후 필수)

```bash
npm run gen:types
# 내부적으로 실행:
# npx supabase gen types typescript --project-id gzkmsiskdbtuxpeaqwcp > src/types/supabase.ts
```

### 신규 마이그레이션 파일 적용

```bash
npx supabase db push
# ⚠️ 신규 파일 생성 시에만 사용
# 기존 파일 수정 결과는 SQL Editor에서 직접 실행 (CLAUDE.md 마이그레이션 운영 규칙 참조)
```

### 마이그레이션 파일 생성 (이름 규칙)

```
supabase/migrations/{YYYYMMDDHHMMSS}_{description}.sql
예: supabase/migrations/20260408000004_add_partner_slug.sql
```

---

## 🎨 UI 컴포넌트

```bash
npx shadcn@latest add [component-name]
# 예: npx shadcn@latest add button dialog table
```

---

## 📦 배포 (Vercel)

```bash
# Vercel CLI 설치 (최초 1회)
npm install -g vercel

# 프리뷰 배포
vercel

# 프로덕션 배포
vercel --prod
# ⚠️ 비용 및 외부 설정 개입 — CLAUDE.md Breakpoint #3에 따라 문경 님 승인 필요
```

---

## 📋 운영 규칙 참조

| 작업 | 참조 문서 |
|------|-----------|
| DB 스키마 변경 | `CLAUDE.md` — 마이그레이션 실행 운영 규칙 |
| RLS 정책 수정 | `SECURITY.md` |
| 아키텍처 변경 | `ARCHITECTURE.md` |
| 에이전트 역할 | `docs/agents/` |
