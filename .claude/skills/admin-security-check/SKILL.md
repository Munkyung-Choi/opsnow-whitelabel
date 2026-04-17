---
name: admin-security-check
description: Admin Server Action의 7단계 보안 체크체인(인증→역할→소유권→입력검증→실행→감사로그→캐시무효화) 준수 여부를 감사한다. Impl 완료 후 Verify 전에 실행.
---

# Admin Server Action Security Audit

Admin 영역의 Server Action이 CLAUDE.md §3.1의 7단계 보안 체크체인을 모두 준수하는지 감사합니다.

## 사용법

```
/admin-security-check [파일경로 또는 함수명]
```

인수 없이 실행하면 최근 수정된 Server Action 파일을 자동으로 탐색합니다.

---

## 7단계 체크체인 감사 항목

각 Server Action 함수에 대해 아래 7단계를 순서대로 확인합니다. **단 하나라도 누락되면 Fail입니다.**

### Step 1: 인증 확인 (세션 유효성)
```typescript
// 기대 패턴
const { data: { session } } = await supabase.auth.getSession()
if (!session) return { error: 'Unauthorized' }
```
- [ ] 세션 체크가 함수 최상단에 위치하는가?
- [ ] 세션 없을 때 즉시 return하는가? (throw 대신 return 권장)

### Step 2: 역할 확인 (권한 검증)
```typescript
// 기대 패턴
const role = session.user.user_metadata.role
if (!['partner_admin', 'master_admin'].includes(role)) return { error: 'Forbidden' }
```
- [ ] 허용 역할 목록이 명시적으로 선언되어 있는가?
- [ ] 역할 체크가 소유권 검증보다 앞에 있는가?

### Step 3: 소유권 검증 (파트너 격리)
```typescript
// 기대 패턴 (partner_admin인 경우)
if (role === 'partner_admin' && targetPartnerId !== userPartnerId) {
  return { error: 'Forbidden' }
}
```
- [ ] `partner_admin`이 자기 파트너 데이터만 접근하도록 제한하는가?
- [ ] `master_admin` 예외가 명시적으로 처리되는가?
- [ ] UPDATE/DELETE 쿼리에 `WHERE partner_id = userPartnerId` 조건이 포함되는가?

### Step 4: 입력 검증 (Zod safeParse)
```typescript
// 기대 패턴
const parsed = schema.safeParse(formData)
if (!parsed.success) return { error: parsed.error.flatten() }
```
- [ ] Zod 스키마가 정의되어 있는가?
- [ ] `safeParse`를 사용하는가? (`parse` 사용 시 throw 발생 — 보안 문제)
- [ ] 검증 실패 시 즉시 return하는가?

### Step 5: DB 변경 실행
```typescript
// 체크 포인트
const { error } = await supabase.from('table').update(data).eq('id', id).eq('partner_id', partnerId)
```
- [ ] UPDATE/DELETE에 `partner_id` 조건이 반드시 포함되는가?
- [ ] DB 에러를 캐치하여 적절히 처리하는가?

### Step 6: 감사 로그 (`system_logs`)
```typescript
// 기대 패턴
await supabase.from('system_logs').insert({
  actor_id: session.user.id,
  action: 'UPDATE_PARTNER_CONTENT',
  target_id: id,
  partner_id: partnerId,
  detail: { before: oldData, after: newData }
})
```
- [ ] `actor_id` (누가) 기록되는가?
- [ ] `action` (무엇을) 기록되는가?
- [ ] `target_id` + `partner_id` (어떤 데이터를) 기록되는가?
- [ ] `detail` (변경 전/후) 기록되는가? (선택이지만 권장)

### Step 7: 캐시 무효화
```typescript
// 기대 패턴
revalidatePath('/[locale]', 'layout')
// 또는
revalidateTag('partner-content')
```
- [ ] `revalidatePath` 또는 `revalidateTag` 호출이 있는가?
- [ ] 캐시 무효화 범위가 적절한가? (너무 넓으면 성능 저하)

---

## 감사 결과 보고 형식

```
### Security Audit: [파일명 또는 함수명]

| 단계 | 항목 | 결과 |
|------|------|------|
| 1. 인증 | 세션 체크 | ✅ / ❌ |
| 2. 역할 | 권한 검증 | ✅ / ❌ |
| 3. 소유권 | 파트너 격리 | ✅ / ❌ |
| 4. 입력 | Zod safeParse | ✅ / ❌ |
| 5. 실행 | partner_id 조건 | ✅ / ❌ |
| 6. 로그 | system_logs INSERT | ✅ / ❌ |
| 7. 캐시 | revalidate 호출 | ✅ / ❌ |

**판정**: [PASS / FAIL]
**수정 필요 항목**: [누락된 단계 목록 또는 "없음"]
```

---

## 주의사항

- Client Component의 역할 기반 UI 분기(버튼 숨기기)는 **보안 수단이 아님** — Server Action에서 반드시 재검증
- `supabaseAdmin` (service_role key) 사용 여부 확인 — Server Action에서 사용 시 즉시 에스컬레이션
- 감사 로그 없는 mutation Server Action은 Verify 미통과
