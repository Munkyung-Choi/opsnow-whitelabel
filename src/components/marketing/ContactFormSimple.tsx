'use client';

import { useActionState, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ContactFormFields from '@/components/marketing/ContactFormFields';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/locales';
import { submitLead } from '@/app/[partnerId]/actions/leads';
import type { LeadFormState } from '@/lib/schemas/lead';

interface Props {
  locale: Locale;
  /** 섹션 타이틀 override (기본: t.formTitle) */
  title?: string;
  /** 섹션 서브타이틀 override (기본: t.formSubtitle) */
  subtitle?: string;
  /** CTA 버튼 텍스트 override (기본: t.submitCta) */
  ctaText?: string;
}

const INITIAL_STATE: LeadFormState = { status: 'idle' };

interface ContentProps {
  locale: Locale;
  title: string;
  subtitle: string;
  ctaText: string;
  onReset: () => void;
}

function FormContent({ locale, title, subtitle, ctaText, onReset }: ContentProps) {
  const t = getDictionary(locale).contactForm;
  const [state, submitAction, isPending] = useActionState(submitLead, INITIAL_STATE);
  const submitted = state.status === 'success';

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 size={28} strokeWidth={1.6} className="text-primary" />
        </span>
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          {t.successTitle}
        </h3>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          {t.successDescription}
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onReset}>
          {t.resetCta}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-[0.9375rem] text-muted-foreground">{subtitle}</p>
      </div>

      <form action={submitAction} noValidate className="flex flex-col gap-5">
        <ContactFormFields locale={locale} fieldErrors={state.fieldErrors} />

        {state.status === 'error' && !state.fieldErrors && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        <Button type="submit" size="lg" disabled={isPending} className="mt-2 w-full gap-2">
          {isPending ? (
            <>
              <Loader2 size={16} strokeWidth={2} className="animate-spin" />
              {t.submitting}
            </>
          ) : (
            ctaText
          )}
        </Button>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
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
    </>
  );
}

/**
 * WL-80: FAQ Hub 등 상세 페이지 하단 1-column 경량 문의 폼.
 * id="contact" 고정 → href="#contact" smooth scroll 타겟.
 * WL-42: Server Action 연동 완료.
 */
export default function ContactFormSimple({
  locale,
  title,
  subtitle,
  ctaText,
}: Props) {
  const t = getDictionary(locale).contactForm;
  const [formKey, setFormKey] = useState(0);

  const resolvedTitle = title ?? t.formTitle;
  const resolvedSubtitle = subtitle ?? t.formSubtitle;
  const resolvedCta = ctaText ?? t.submitCta;

  return (
    <section id="contact" className="bg-muted/40 px-4 section-py sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* key 변경 시 FormContent remount → useActionState 초기화 */}
        <FormContent
          key={formKey}
          locale={locale}
          title={resolvedTitle}
          subtitle={resolvedSubtitle}
          ctaText={resolvedCta}
          onReset={() => setFormKey((k) => k + 1)}
        />
      </div>
    </section>
  );
}
