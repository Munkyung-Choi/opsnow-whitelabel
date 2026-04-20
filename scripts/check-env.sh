#!/bin/bash
# scripts/check-env.sh
#
# [CONTRACT]
# .env.example에서 주석(#)으로 시작하지 않는 라인 중 "# @required" 주석이 붙은
# 변수를 필수 변수로 간주한다.
# 예: API_KEY= # @required
#
# 필수 변수 추가 방법: .env.example의 해당 변수 라인 끝에 # @required 추가.
# check-env.sh를 수동으로 수정할 필요 없음.
set -euo pipefail

EXAMPLE_FILE=".env.example"
LOCAL_FILE=".env.local"

SUPABASE_DASHBOARD="https://supabase.com/dashboard/project/gzkmsiskdbtuxpeaqwcp/settings/api"

# .env.local 존재 여부 확인
if [ ! -f "$LOCAL_FILE" ]; then
  echo "❌ $LOCAL_FILE 파일이 없습니다."
  echo ""
  if [ -f "$EXAMPLE_FILE" ]; then
    echo "   다음 명령으로 템플릿을 복사하세요:"
    echo "   cp $EXAMPLE_FILE $LOCAL_FILE"
  fi
  echo "   🔗 Supabase API 키: $SUPABASE_DASHBOARD"
  exit 1
fi

# @required 변수 추출 (2-step: 주석 라인 제거 → @required 필터 → 변수명만 추출)
REQUIRED_VARS=$(grep -v "^#" "$EXAMPLE_FILE" | grep "@required" | cut -d'=' -f 1 | xargs)

if [ -z "$REQUIRED_VARS" ]; then
  echo "⚠️  $EXAMPLE_FILE 에 @required 변수가 정의되어 있지 않습니다."
  exit 0
fi

MISSING=()
EMPTY=()

for VAR in $REQUIRED_VARS; do
  if ! grep -qE "^${VAR}=" "$LOCAL_FILE"; then
    MISSING+=("$VAR")
  elif [ -z "$(grep "^${VAR}=" "$LOCAL_FILE" | cut -d'=' -f 2- | xargs)" ]; then
    EMPTY+=("$VAR")
  fi
done

# 통과
if [ ${#MISSING[@]} -eq 0 ] && [ ${#EMPTY[@]} -eq 0 ]; then
  echo "✅ 모든 필수 환경변수(@required)가 설정되어 있습니다."
  exit 0
fi

# 실패
echo "----------------------------------------------------"
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
echo "   📄 참조: $EXAMPLE_FILE 에 @required 항목 목록이 있습니다."
echo "   🔗 Supabase API 키: $SUPABASE_DASHBOARD"
echo "----------------------------------------------------"
exit 1
