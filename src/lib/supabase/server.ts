import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 서버 사이드 전용 (Route Handlers, Server Actions, Server Components)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
