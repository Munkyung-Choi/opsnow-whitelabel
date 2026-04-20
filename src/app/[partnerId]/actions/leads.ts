'use server';

import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { leadSchema, type LeadFormState } from '@/lib/schemas/lead';
import { resolvePartnerIdFromHost } from '@/lib/marketing/resolve-partner-from-host';
import type { Database } from '@/types/supabase';

// anon key + RLS policy leads_public_insert handles authorization
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function submitLead(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  // 1. Honeypot — silent success prevents bot feedback loop
  if (formData.get('company_website')) {
    return { status: 'success' };
  }

  // 2. Resolve partner_id server-side (host header is authoritative; FormData value is untrusted)
  const headerList = await headers();
  const host = headerList.get('host') ?? '';
  const partnerId = await resolvePartnerIdFromHost(host);
  if (!partnerId) {
    return { status: 'error', message: '파트너를 확인할 수 없습니다.' };
  }

  // 3. Zod validation
  const parsed = leadSchema.safeParse({
    customer_name: formData.get('customer_name'),
    company_name: formData.get('company_name') || undefined,
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    cloud_usage_amount: formData.get('cloud_usage_amount') || undefined,
  });

  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // 4. INSERT — RLS policy `leads_public_insert` enforces partner_id is active
  const { error } = await supabase.from('leads').insert({
    partner_id: partnerId,
    ...parsed.data,
    status: 'new',
  });

  if (error) {
    console.error('[submitLead] insert error:', error.message);
    return { status: 'error', message: '제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }

  return { status: 'success' };
}
