#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="gzkmsiskdbtuxpeaqwcp"
OUTPUT="src/types/supabase.ts"

echo "🔄 Supabase TypeScript 타입 재생성 중..."
npx supabase gen types typescript --project-id "$PROJECT_ID" > "$OUTPUT"
echo "✅ $OUTPUT 업데이트 완료"
