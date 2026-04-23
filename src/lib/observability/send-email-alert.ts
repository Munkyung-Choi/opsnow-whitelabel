import { Resend } from 'resend';
import { getObservabilityEnv } from '@/lib/env';

// WL-156 — Resend SDK Edge Runtime lazy singleton.
// WL-158 — process.env 직접 접근을 getObservabilityEnv()로 중앙화.
// Edge 호환성: resend v6+ · svix · postal-mime · standardwebhooks 모두 fetch 기반,
// Node builtin 미사용 (Pre-flight 실증 2026-04-23).

let _resend: Resend | null = null;
let _resendInitAttempted = false;

function getResend(): Resend | null {
  if (_resendInitAttempted) return _resend;
  _resendInitAttempted = true;
  try {
    const { RESEND_API_KEY: apiKey } = getObservabilityEnv();
    if (!apiKey) {
      console.error('[SendEmailAlert] init skipped — RESEND_API_KEY missing');
      return null;
    }
    _resend = new Resend(apiKey);
    return _resend;
  } catch (e) {
    console.error('[SendEmailAlert] init failed:', e);
    return null;
  }
}

interface EmailAlertParams {
  subject: string;
  payload: Record<string, unknown>;
}

export async function sendEmailAlert({ subject, payload }: EmailAlertParams): Promise<void> {
  const resend = getResend();
  const { RESEND_ALERT_FROM: from, RESEND_ALERT_TO: to } = getObservabilityEnv();

  if (!resend || !from || !to) {
    console.error('[SendEmailAlert] config missing — skipped', {
      hasResend: !!resend,
      hasFrom: !!from,
      hasTo: !!to,
    });
    return;
  }

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    text: JSON.stringify(payload, null, 2),
  });
  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }
}
