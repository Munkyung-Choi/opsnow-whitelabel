#!/bin/bash
set -euo pipefail

PROJECT_ID="gzkmsiskdbtuxpeaqwcp"
OUTPUT="src/types/supabase.ts"

echo "🔄 Supabase TypeScript 타입 재생성 중..."
npx supabase gen types typescript --project-id "$PROJECT_ID" > "$OUTPUT"
echo "✅ 완료: $OUTPUT ($(date '+%Y-%m-%d %H:%M:%S'))"
