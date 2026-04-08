#!/bin/bash
set -euo pipefail

REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "RESEND_API_KEY"
)

ENV_FILE=".env.local"
EXAMPLE_FILE=".env.example"
SUPABASE_DASHBOARD="https://supabase.com/dashboard/project/gzkmsiskdbtuxpeaqwcp/settings/api"
MISSING=()
EMPTY=()

# .env.local 파일 존재 확인
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE 파일이 없습니다."
  echo ""
  if [ -f "$EXAMPLE_FILE" ]; then
    echo "   다음 명령으로 템플릿을 복사하세요:"
    echo "   cp $EXAMPLE_FILE $ENV_FILE"
  else
    echo "   다음 변수들을 포함하여 $ENV_FILE 을 생성해 주세요:"
    for VAR in "${REQUIRED_VARS[@]}"; do
      echo "   $VAR="
    done
  fi
  exit 1
fi

# 각 변수의 키 존재 여부 및 빈값 여부 검사
for VAR in "${REQUIRED_VARS[@]}"; do
  if ! grep -qE "^${VAR}=" "$ENV_FILE"; then
    MISSING+=("$VAR")
  elif ! grep -qE "^${VAR}=.+" "$ENV_FILE"; then
    EMPTY+=("$VAR")
  fi
done

# 통과
if [ ${#MISSING[@]} -eq 0 ] && [ ${#EMPTY[@]} -eq 0 ]; then
  echo "✅ 모든 필수 환경변수가 설정되어 있습니다."
  exit 0
fi

# 실패 — 안내 출력
if [ ${#MISSING[@]} -gt 0 ]; then
  echo "❌ 누락된 환경변수 (키 없음):"
  for VAR in "${MISSING[@]}"; do
    echo "   - $VAR"
  done
fi

if [ ${#EMPTY[@]} -gt 0 ]; then
  echo "⚠️  값이 비어있는 환경변수:"
  for VAR in "${EMPTY[@]}"; do
    echo "   - $VAR"
  done
fi

echo ""
echo "   📄 참조: $EXAMPLE_FILE 에 변수 목록이 있습니다."
echo "   🔗 Supabase API 키: $SUPABASE_DASHBOARD"
exit 1
