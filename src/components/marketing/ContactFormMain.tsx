'use client';

import { useActionState, useState } from 'react';
import {
  ShieldCheck, Lock, Zap, TrendingDown,
  CheckCircle2, Loader2, ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import ContactFormFields from '@/components/marketing/ContactFormFields';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/locales';
import { submitLead } from '@/app/[partnerId]/actions/leads';
import type { LeadFormState } from '@/lib/schemas/lead';

// 신뢰 포인트 아이콘 — i18n trustPoints 배열 순서와 1:1 매핑
const TRUST_ICONS = [ShieldCheck, Lock, Zap, TrendingDown] as const;

interface Props {
  locale: Locale;
}

const INITIAL_STATE: LeadFormState = { status: 'idle' };

interface CardProps {
  locale: Locale;
  onReset: () => void;
}

function FormCard({ locale, onReset }: CardProps) {
  const t = getDictionary(locale).contactForm;
  const [state, submitAction, isPending] = useActionState(submitLead, INITIAL_STATE);
  const submitted = state.status === 'success';

  return (
    <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
      {submitted ? (
        /* ── 성공 상태 ── */
        <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 size={28} strokeWidth={1.6} className="text-primary" />
          </span>
          <h3 className="text-lg font-bold tracking-[-0.01em] text-foreground">
            {t.successTitle}
          </h3>
          <p className="max-w-xs text-sm leading-[1.7] text-muted-foreground">
            {t.successDescription}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={onReset}>
            {t.resetCta}
          </Button>
        </div>
      ) : (
        /* ── 폼 ── */
        <form action={submitAction} noValidate className="flex flex-col gap-5">
          <div>
            <p className="text-base font-bold tracking-[-0.01em] text-foreground">
              {t.formTitle}
            </p>
            <p className="text-[0.8125rem] text-muted-foreground">{t.formSubtitle}</p>
          </div>

          <ContactFormFields locale={locale} fieldErrors={state.fieldErrors} />

          {state.status === 'error' && !state.fieldErrors && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <Button type="submit" size="lg" disabled={isPending} className="mt-1 w-full gap-2">
            {isPending ? (
              <>
                <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                {t.submitting}
              </>
            ) : (
              <>
                {t.submitCta}
                <ArrowRight size={16} strokeWidth={2} />
              </>
            )}
          </Button>

          <p className="text-center text-xs leading-[1.6] text-muted-foreground">
            {t.legalPrefix}
            <a href="terms" className="underline underline-offset-2 hover:text-foreground transition-colors">
              {t.terms}
            </a>
            {t.legalSeparator}
            <a href="privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
              {t.privacy}
            </a>
            {t.legalSuffix}
          </p>
        </form>
      )}
    </div>
  );
}

/** WL-80: 메인 페이지 하단 2-column 문의 폼. WL-42: Server Action 연동 완료. */
export default function ContactFormMain({ locale }: Props) {
  const t = getDictionary(locale).contactForm;
  const [formKey, setFormKey] = useState(0);

  return (
    <section id="contact" className="border-t bg-muted/40 px-4 section-py sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-12 lg:grid-cols-2">

          {/* ── Left: 마케팅 카피 ─────────────────────────────── */}
          <div>
            <Badge variant="outline" className="mb-5">{t.badge}</Badge>

            {/* FIXED: clamp() 폰트 크기 — 반응형 타이포그래피 디자인 요구사항 */}
            <h2 className="mb-5 text-[clamp(1.75rem,2.5vw,2.25rem)] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
              {t.mainTitle}
              <br />
              <span className="text-primary">{t.mainTitleHighlight}</span>
            </h2>

            <p className="mb-10 text-[0.9375rem] leading-[1.75] text-muted-foreground">
              {t.mainDescription}
            </p>

            {/* 신뢰 포인트 */}
            <ul className="mb-10 flex flex-col gap-3.5">
              {t.trustPoints.map((text, idx) => {
                const Icon = TRUST_ICONS[idx];
                return (
                  <li key={idx} className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/10">
                      <Icon size={15} strokeWidth={1.6} className="text-primary" />
                    </span>
                    <span className="text-sm font-medium text-foreground">{text}</span>
                  </li>
                );
              })}
            </ul>

            <Separator className="mb-8" />

            {/* 소셜 프루프 */}
            <div className="flex flex-wrap gap-6">
              {t.socialProof.map((s) => (
                <div key={s.label}>
                  <span className="block text-[1.375rem] font-extrabold leading-none tracking-[-0.02em] text-foreground">
                    {s.value}
                  </span>
                  <span className="mt-1 block text-[0.8125rem] text-muted-foreground">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: 폼 카드 — key 변경 시 remount → useActionState 초기화 ── */}
          <FormCard key={formKey} locale={locale} onReset={() => setFormKey((k) => k + 1)} />

        </div>
      </div>
    </section>
  );
}
