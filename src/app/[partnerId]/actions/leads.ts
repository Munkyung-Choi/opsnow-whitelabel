'use server';

import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';
import { leadSchema, type LeadFormState } from '@/lib/schemas/lead';
import { resolvePartnerIdFromHost } from '@/lib/marketing/resolve-partner-from-host';
import { sendEmailAlert } from '@/lib/observability/send-email-alert';

// WL-154 — DEBT-007 Issue 2 상환
// service_role 경유 (RLS 우회). 신뢰 경계는 host 기반 resolvePartnerIdFromHost().
// FormData의 partner_id·status 등은 leadSchema.strict()가 unknown key로 거부한다.

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

  // 3. Zod strict validation — unknown key 거부 (WL-154)
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

  // 4. INSERT via service_role. Payload 순서 방어: 스프레드 후 서버 도출값이
  //    최종 override. parsed.data는 이미 strict로 unknown key 제거된 상태지만
  //    이중 방어로 순서를 고정한다.
  const { error } = await supabaseAdmin.from('leads').insert({
    ...parsed.data,
    partner_id: partnerId,
    status: 'new',
  });

  if (error) {
    console.error('[submitLead] insert error:', error.message);
    void sendEmailAlert({
      subject: `[Lead Failure] partner_id=${partnerId}`,
      payload: { partnerId, error: error.message, timestamp: new Date().toISOString() },
    }).catch((err) => console.error('[submitLead] alert failed:', err));
    return { status: 'error', message: '제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }

  return { status: 'success' };
}
