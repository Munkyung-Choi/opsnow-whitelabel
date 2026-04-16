'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/locales';

interface Props {
  partnerId: string;
  locale: Locale;
  /** 섹션 타이틀 override (기본: t.formTitle) */
  title?: string;
  /** 섹션 서브타이틀 override (기본: t.formSubtitle) */
  subtitle?: string;
  /** CTA 버튼 텍스트 override (기본: t.submitCta) */
  ctaText?: string;
}

/**
 * WL-80: FAQ Hub 등 상세 페이지 하단 1-column 경량 문의 폼.
 * ContactFormMain에서 폼 박스만 추출 — 마케팅 카피·소셜 프루프 없음.
 * id="contact" 고정 → href="#contact" smooth scroll 타겟.
 * 서버 액션 연동은 WL-42에서 처리 — 현재 UI 전용
 */
export default function ContactFormSimple({
  partnerId,
  locale,
  title,
  subtitle,
  ctaText,
}: Props) {
  const t = getDictionary(locale).contactForm;
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cloudSpend, setCloudSpend] = useState('');

  const resolvedTitle = title ?? t.formTitle;
  const resolvedSubtitle = subtitle ?? t.formSubtitle;
  const resolvedCta = ctaText ?? t.submitCta;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // 허니팟 체크 — 봇 감지 시 조용히 무시
    const honeypot = (e.currentTarget.elements.namedItem('company_website') as HTMLInputElement)?.value;
    if (honeypot) return;
    setLoading(true);
    // WL-42 Server Action 연동 전 임시 UX
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <section id="contact" className="bg-muted/40 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {submitted ? (
          /* ── 성공 상태 ── */
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
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setSubmitted(false)}>
              {t.resetCta}
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {resolvedTitle}
              </h2>
              <p className="mt-3 text-[0.9375rem] text-muted-foreground">{resolvedSubtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* 허니팟 — 스팸봇 탐지용 (사용자에게 절대 노출 금지) */}
              <div
                style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
                aria-hidden="true"
                tabIndex={-1}
              >
                <label htmlFor="cfs-website">Website (Leave this empty)</label>
                <input
                  type="text"
                  id="cfs-website"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <input type="hidden" name="partner_id" value={partnerId} />

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfs-name">
                  {t.fields.name} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cfs-name"
                  name="customer_name"
                  placeholder={t.placeholders.name}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfs-company">{t.fields.company}</Label>
                <Input
                  id="cfs-company"
                  name="company_name"
                  placeholder={t.placeholders.company}
                  autoComplete="organization"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfs-email">
                  {t.fields.email} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cfs-email"
                  name="email"
                  type="email"
                  placeholder={t.placeholders.email}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfs-phone">{t.fields.phone}</Label>
                <Input
                  id="cfs-phone"
                  name="phone"
                  type="tel"
                  placeholder={t.placeholders.phone}
                  autoComplete="tel"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfs-usage">{t.fields.usage}</Label>
                <Select name="cloud_usage_amount" value={cloudSpend} onValueChange={setCloudSpend}>
                  <SelectTrigger id="cfs-usage">
                    <SelectValue placeholder={t.placeholders.usage} />
                  </SelectTrigger>
                  <SelectContent>
                    {t.usageOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full gap-2">
                {loading ? (
                  <>
                    <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                    {t.submitting}
                  </>
                ) : (
                  resolvedCta
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
        )}
      </div>
    </section>
  );
}
