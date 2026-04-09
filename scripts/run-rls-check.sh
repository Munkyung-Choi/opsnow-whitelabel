#!/bin/bash
# =============================================================================
# scripts/run-rls-check.sh — RLS 검증 자동화 (T-01 ~ T-10)
# =============================================================================
# 사용법:
#   bash scripts/run-rls-check.sh
#   또는: npm run check:rls
#
# 전제 조건:
#   1. SUPABASE_DB_URL 설정 (.env.local 또는 docs/exec-plans/rls-fixtures.env)
#      Dashboard → Settings → Database → Connection string (URI)
#   2. (선택) docs/exec-plans/rls-fixtures.env 에 테스트 픽스처 UUID 설정
#      → 없으면 픽스처 필요 테스트(T-01~T-04, T-06~T-08)는 SKIP 처리
#      → rls-fixtures.env.example 참조
# =============================================================================

set -euo pipefail

# ── 색상 출력 ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── 환경변수 로드 ──────────────────────────────────────────────────────────
ENV_FILE=".env.local"
FIXTURES_FILE="docs/exec-plans/rls-fixtures.env"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

if [ -f "$FIXTURES_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; source "$FIXTURES_FILE"; set +a
fi

# ── 필수 전제 확인 ──────────────────────────────────────────────────────────
if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo -e "${RED}❌ SUPABASE_DB_URL이 설정되지 않았습니다.${NC}"
  echo ""
  echo "   Supabase Dashboard → Settings → Database → Connection string (URI)"
  echo "   docs/exec-plans/rls-fixtures.env 파일에 추가하세요:"
  echo ""
  echo "   SUPABASE_DB_URL=postgresql://postgres:[password]@db.gzkmsiskdbtuxpeaqwcp.supabase.co:5432/postgres"
  echo ""
  echo "   참조: docs/exec-plans/rls-fixtures.env.example"
  exit 1
fi

if ! command -v psql &> /dev/null; then
  echo -e "${RED}❌ psql이 설치되지 않았습니다.${NC}"
  echo "   macOS: brew install postgresql"
  echo "   Linux: apt install postgresql-client"
  exit 1
fi

# ── 픽스처 변수 (없으면 빈 문자열 — 해당 테스트 SKIP) ─────────────────────
PARTNER_A_ID="${RLS_TEST_PARTNER_A_ID:-}"
PARTNER_B_ID="${RLS_TEST_PARTNER_B_ID:-}"
PARTNER_A_ADMIN_UID="${RLS_TEST_PARTNER_A_ADMIN_UID:-}"
PARTNER_B_ADMIN_UID="${RLS_TEST_PARTNER_B_ADMIN_UID:-}"
MASTER_ADMIN_UID="${RLS_TEST_MASTER_ADMIN_UID:-}"

# ── 결과 카운터 ────────────────────────────────────────────────────────────
PASS=0
FAIL=0
SKIP=0
REPORT=""
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ── 헬퍼: psql 실행 ────────────────────────────────────────────────────────
# run_sql <db_role> <jwt_claims_json> <sql>
run_sql() {
  local db_role="$1"
  local jwt_claims="$2"
  local sql="$3"

  psql "$SUPABASE_DB_URL" --no-psqlrc -t -A -q 2>&1 <<PSQL_EOF || true
BEGIN;
SET LOCAL role = '$db_role';
SET LOCAL "request.jwt.claims" = '$jwt_claims';
$sql
ROLLBACK;
PSQL_EOF
}

# ── 헬퍼: 반환 행 수 검증 ──────────────────────────────────────────────────
test_expect_count() {
  local test_id="$1"
  local desc="$2"
  local db_role="$3"
  local jwt_claims="$4"
  local sql="$5"
  local expected_count="$6"

  local output
  output=$(run_sql "$db_role" "$jwt_claims" "$sql")

  if echo "$output" | grep -qiE "^ERROR:|error:"; then
    REPORT+="\n  ${RED}[${test_id}]${NC} $desc ... ${RED}FAIL${NC} (SQL Error 발생)"
    FAIL=$((FAIL + 1))
    return
  fi

  local count
  count=$(echo "$output" | grep -vcE '^(BEGIN|ROLLBACK|SET|$)' || true)

  if [ "$count" -eq "$expected_count" ]; then
    REPORT+="\n  ${GREEN}[${test_id}]${NC} $desc ... ${GREEN}PASS${NC}"
    PASS=$((PASS + 1))
  else
    REPORT+="\n  ${RED}[${test_id}]${NC} $desc ... ${RED}FAIL${NC} (expected ${expected_count}행, got ${count}행)"
    FAIL=$((FAIL + 1))
  fi
}

# ── 헬퍼: 에러 발생 여부 검증 ─────────────────────────────────────────────
test_expect_error() {
  local test_id="$1"
  local desc="$2"
  local db_role="$3"
  local jwt_claims="$4"
  local sql="$5"
  local error_pattern="$6"

  local output
  output=$(run_sql "$db_role" "$jwt_claims" "$sql")

  if echo "$output" | grep -qiE "$error_pattern"; then
    REPORT+="\n  ${GREEN}[${test_id}]${NC} $desc ... ${GREEN}PASS${NC}"
    PASS=$((PASS + 1))
  else
    REPORT+="\n  ${RED}[${test_id}]${NC} $desc ... ${RED}FAIL${NC} (에러 미발생)"
    FAIL=$((FAIL + 1))
  fi
}

# ── 헬퍼: NULL 반환 검증 ────────────────────────────────────────────────────
test_expect_null() {
  local test_id="$1"
  local desc="$2"
  local db_role="$3"
  local jwt_claims="$4"
  local sql="$5"

  local output
  output=$(run_sql "$db_role" "$jwt_claims" "$sql")

  local value
  value=$(echo "$output" | grep -vE '^(BEGIN|ROLLBACK|SET|$)' | head -1 | tr -d ' ')

  if [ -z "$value" ]; then
    REPORT+="\n  ${GREEN}[${test_id}]${NC} $desc ... ${GREEN}PASS${NC}"
    PASS=$((PASS + 1))
  else
    REPORT+="\n  ${RED}[${test_id}]${NC} $desc ... ${RED}FAIL${NC} (expected NULL, got '${value}')"
    FAIL=$((FAIL + 1))
  fi
}

# ── 헬퍼: SKIP ─────────────────────────────────────────────────────────────
skip_test() {
  local test_id="$1"
  local desc="$2"
  local reason="$3"
  REPORT+="\n  ${YELLOW}[${test_id}]${NC} $desc ... ${YELLOW}SKIP${NC} ($reason)"
  SKIP=$((SKIP + 1))
}

# ── JWT 클레임 빌더 ────────────────────────────────────────────────────────
# Supabase app_metadata: { role, partner_id } 구조 기반
make_jwt() {
  local sub="$1"
  local db_role="$2"       # authenticated | anon
  local app_role="$3"      # master_admin | partner_admin | partner_viewer
  local partner_id="${4:-}"

  if [ -n "$partner_id" ]; then
    echo "{\"sub\":\"${sub}\",\"role\":\"${db_role}\",\"app_metadata\":{\"role\":\"${app_role}\",\"partner_id\":\"${partner_id}\"}}"
  else
    echo "{\"sub\":\"${sub}\",\"role\":\"${db_role}\",\"app_metadata\":{\"role\":\"${app_role}\"}}"
  fi
}

ANON_JWT='{"sub":null,"role":"anon"}'

# ── 테스트 실행 ────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}=== RLS 검증 리포트 (T-01 ~ T-10) ===${NC}"
echo -e "${BLUE}실행 시각: $TIMESTAMP${NC}"
echo ""

# T-01: 파트너 간 leads 크로스테넌트 차단
if [ -n "$PARTNER_B_ADMIN_UID" ] && [ -n "$PARTNER_B_ID" ] && [ -n "$PARTNER_A_ID" ]; then
  JWT=$(make_jwt "$PARTNER_B_ADMIN_UID" "authenticated" "partner_admin" "$PARTNER_B_ID")
  test_expect_count "T-01" "파트너 간 leads 크로스테넌트 차단" \
    "authenticated" "$JWT" \
    "SELECT * FROM leads WHERE partner_id = '${PARTNER_A_ID}';" 0
else
  skip_test "T-01" "파트너 간 leads 크로스테넌트 차단" \
    "RLS_TEST_PARTNER_B_ADMIN_UID / PARTNER_A_ID / PARTNER_B_ID 미설정"
fi

# T-02: 파트너 간 미발행 contents 차단
if [ -n "$PARTNER_B_ADMIN_UID" ] && [ -n "$PARTNER_B_ID" ] && [ -n "$PARTNER_A_ID" ]; then
  JWT=$(make_jwt "$PARTNER_B_ADMIN_UID" "authenticated" "partner_admin" "$PARTNER_B_ID")
  test_expect_count "T-02" "파트너 간 미발행 contents 차단" \
    "authenticated" "$JWT" \
    "SELECT * FROM contents WHERE partner_id = '${PARTNER_A_ID}' AND is_published = false;" 0
else
  skip_test "T-02" "파트너 간 미발행 contents 차단" \
    "RLS_TEST_PARTNER_B_ADMIN_UID / PARTNER_A_ID 미설정"
fi

# T-03: master_admin leads 직접 접근 차단
if [ -n "$MASTER_ADMIN_UID" ]; then
  JWT=$(make_jwt "$MASTER_ADMIN_UID" "authenticated" "master_admin")
  test_expect_count "T-03" "master_admin leads 직접 접근 차단" \
    "authenticated" "$JWT" \
    "SELECT * FROM leads;" 0
else
  skip_test "T-03" "master_admin leads 직접 접근 차단" \
    "RLS_TEST_MASTER_ADMIN_UID 미설정"
fi

# T-04: leads_masked_view partner_admin 접근 차단
if [ -n "$PARTNER_A_ADMIN_UID" ] && [ -n "$PARTNER_A_ID" ]; then
  JWT=$(make_jwt "$PARTNER_A_ADMIN_UID" "authenticated" "partner_admin" "$PARTNER_A_ID")
  test_expect_count "T-04" "leads_masked_view partner_admin 접근 차단" \
    "authenticated" "$JWT" \
    "SELECT * FROM leads_masked_view;" 0
else
  skip_test "T-04" "leads_masked_view partner_admin 접근 차단" \
    "RLS_TEST_PARTNER_A_ADMIN_UID 미설정"
fi

# T-05: anon FK 위반 INSERT 차단 (픽스처 불필요)
test_expect_error "T-05" "anon FK 위반 INSERT 차단" \
  "anon" "$ANON_JWT" \
  "INSERT INTO leads (partner_id, customer_name, email) VALUES ('00000000-0000-0000-0000-000000000000', '테스트', 'rls-test@example.com');" \
  "foreign key|violates|row-level security|error"

# T-06: partner_admin 타 파트너 조회 차단
if [ -n "$PARTNER_A_ADMIN_UID" ] && [ -n "$PARTNER_A_ID" ]; then
  JWT=$(make_jwt "$PARTNER_A_ADMIN_UID" "authenticated" "partner_admin" "$PARTNER_A_ID")
  test_expect_count "T-06" "partner_admin 타 파트너 조회 차단" \
    "authenticated" "$JWT" \
    "SELECT id FROM partners WHERE is_active = true AND id != '${PARTNER_A_ID}';" 0
else
  skip_test "T-06" "partner_admin 타 파트너 조회 차단" \
    "RLS_TEST_PARTNER_A_ADMIN_UID / PARTNER_A_ID 미설정"
fi

# T-07: partner_admin site_visits 직접 INSERT 차단
if [ -n "$PARTNER_A_ADMIN_UID" ] && [ -n "$PARTNER_A_ID" ]; then
  JWT=$(make_jwt "$PARTNER_A_ADMIN_UID" "authenticated" "partner_admin" "$PARTNER_A_ID")
  test_expect_error "T-07" "partner_admin site_visits INSERT 차단" \
    "authenticated" "$JWT" \
    "INSERT INTO site_visits (partner_id, visit_date, count) VALUES ('${PARTNER_A_ID}', CURRENT_DATE, 9999);" \
    "row-level security|violates|error|policy"
else
  skip_test "T-07" "partner_admin site_visits INSERT 차단" \
    "RLS_TEST_PARTNER_A_ADMIN_UID / PARTNER_A_ID 미설정"
fi

# T-08: partner_admin system_logs 접근 차단
if [ -n "$PARTNER_A_ADMIN_UID" ] && [ -n "$PARTNER_A_ID" ]; then
  JWT=$(make_jwt "$PARTNER_A_ADMIN_UID" "authenticated" "partner_admin" "$PARTNER_A_ID")
  test_expect_count "T-08" "partner_admin system_logs 접근 차단" \
    "authenticated" "$JWT" \
    "SELECT * FROM system_logs;" 0
else
  skip_test "T-08" "partner_admin system_logs 접근 차단" \
    "RLS_TEST_PARTNER_A_ADMIN_UID 미설정"
fi

# T-09: anon 미발행 contents 조회 차단 (픽스처 불필요)
test_expect_count "T-09" "anon 미발행 contents 조회 차단" \
  "anon" "$ANON_JWT" \
  "SELECT * FROM contents WHERE is_published = false;" 0

# T-10: anon get_my_role() NULL 반환 (픽스처 불필요)
test_expect_null "T-10" "anon get_my_role() NULL 반환" \
  "anon" "$ANON_JWT" \
  "SELECT public.get_my_role();"

# ── 결과 출력 ──────────────────────────────────────────────────────────────
echo -e "$REPORT"
echo ""
echo "────────────────────────────────────────"

TOTAL=$((PASS + FAIL + SKIP))
echo -e "결과: ${GREEN}${PASS} PASS${NC} / ${RED}${FAIL} FAIL${NC} / ${YELLOW}${SKIP} SKIP${NC}  (총 ${TOTAL}개)"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}⚠️  FAIL 감지. RLS 정책을 확인하세요.${NC}"
  exit 1
elif [ $SKIP -gt 0 ]; then
  echo -e "${YELLOW}ℹ️  일부 테스트 SKIP. docs/exec-plans/rls-fixtures.env.example 참조하여 픽스처를 설정하면 전체 검증 가능.${NC}"
  exit 0
else
  echo -e "${GREEN}✅ 모든 테스트 PASS${NC}"
  exit 0
fi
