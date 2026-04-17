---
name: partner-onboard
description: 신규 파트너를 OpsNow 화이트라벨 플랫폼에 온보딩하기 위한 체크리스트. DB 시딩부터 RLS 검증, 서브도메인 확인, 테마 확인까지 전 과정을 안내한다.
---

# Partner Onboarding Checklist

이 스킬을 실행하면 신규 파트너 온보딩에 필요한 전 단계를 체계적으로 수행합니다.

## 사용법

```
/partner-onboard [partner_slug]
```

- `partner_slug`: Supabase `partners.subdomain` 컬럼에 사용할 슬러그 (예: `partner-c`)
- 인수 없이 실행하면 현재 파트너 목록을 조회하고 추가할 파트너 정보를 질문합니다.

---

## 온보딩 체크리스트 (순서 준수)

### STEP 1: 사전 확인
- [ ] Jira 티켓 번호 확인 (없으면 생성 요청)
- [ ] `partners` 테이블에 중복 subdomain 없는지 확인
  ```sql
  SELECT subdomain FROM partners WHERE subdomain = '[slug]';
  ```
- [ ] 파트너 정보 수집: `name`, `subdomain`, `primary_color`, `logo_url`, `hero_image_url`

### STEP 2: DB 레코드 생성 (🚨 HIGH 트랙 — 문경 님 승인 필요)
- [ ] `partners` 테이블 INSERT
- [ ] `partner_content` 테이블 초기 레코드 (트리거 자동 생성 여부 확인)
- [ ] 시딩 완료 후 RLS 격리 확인:
  ```sql
  -- partner_id가 올바르게 설정되었는지
  SELECT id, name, subdomain, is_active FROM partners WHERE subdomain = '[slug]';
  SELECT partner_id, section, locale FROM partner_content WHERE partner_id = '[id]';
  ```

### STEP 3: RLS 격리 검증
- [ ] `/supabase-audit-rls` 스킬 실행하여 신규 파트너 데이터가 다른 파트너에게 노출되지 않는지 확인
- [ ] `anon` role로 다른 파트너 subdomain에서 이 파트너 데이터 접근 불가 확인

### STEP 4: 로컬 서브도메인 접근 테스트
- [ ] 개발 서버 실행: `npm run dev`
- [ ] 브라우저에서 접근: `http://[slug].localhost:3000`
- [ ] 기대 결과: 파트너 테마(색상, 로고)가 올바르게 적용된 마케팅 페이지 렌더링
- [ ] 미존재 슬러그 테스트: `http://nonexistent.localhost:3000` → `/not-found` 리다이렉트 확인

### STEP 5: 테마 및 콘텐츠 확인
- [ ] `primary_color` CSS Variable이 올바르게 적용되는지 확인
- [ ] 로고 이미지 로드 확인
- [ ] hero_image_url 적용 확인
- [ ] i18n: `ko` / `en` 양쪽 locale 페이지 접근 가능 확인

### STEP 6: E2E 스모크 테스트
- [ ] 기존 Playwright 테스트가 신규 파트너로 인해 깨지지 않는지 확인:
  ```bash
  npx playwright test
  ```
- [ ] 실패 시 A(앱 버그) / B(테스트 부정합) / C(데이터 불일치) 버킷으로 분류 후 보고

### STEP 7: Jira 완료 처리
- [ ] 해당 스토리/태스크 티켓에 댓글 작성 (CLAUDE.md §Jira 댓글 양식)
- [ ] 티켓 상태 `Done`으로 전환

---

## 공통 실수 방지

| 실수 | 방지책 |
|------|--------|
| `partner_content` 레코드 없이 파트너 생성 | STEP 2에서 트리거 자동 생성 여부 먼저 확인 |
| 시딩 후 RLS 검증 생략 | STEP 3 반드시 실행 |
| 로컬 DNS 미설정 상태에서 서브도메인 테스트 | Acrylic DNS 설정 확인 (CLAUDE.md §10.1) |
| E2E 테스트 생략 | STEP 6 필수 — 기존 테스트 회귀 방지 |
