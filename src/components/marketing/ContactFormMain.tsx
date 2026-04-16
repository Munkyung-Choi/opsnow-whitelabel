'use client';

import { useState } from 'react';
import {
  ShieldCheck, Lock, Zap, TrendingDown,
  CheckCircle2, Loader2, ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/locales';

// 신뢰 포인트 아이콘 — i18n trustPoints 배열 순서와 1:1 매핑
const TRUST_ICONS = [ShieldCheck, Lock, Zap, TrendingDown] as const;

interface Props {
  partnerId: string;
  locale: Locale;
}

/**
 * WL-80: 메인 페이지 하단 2-column 문의 폼.
 * 좌측: 마케팅 카피 + 신뢰 포인트 + 소셜 프루프
 * 우측: 리드 캡처 폼 (5개 필드)
 * 서버 액션 연동은 WL-42에서 처리 — 현재 UI 전용
 */
export default function ContactFormMain({ partnerId, locale }: Props) {
  const t = getDictionary(locale).contactForm;
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cloudSpend, setCloudSpend] = useState('');

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
    <section id="contact" className="border-t bg-muted/40 px-4 py-20 sm:px-6">
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

          {/* ── Right: 폼 카드 ───────────────────────────────── */}
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
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setSubmitted(false)}>
                  {t.resetCta}
                </Button>
              </div>
            ) : (
              /* ── 폼 ── */
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* 허니팟 — 스팸봇 탐지용 (사용자에게 절대 노출 금지) */}
                <div
                  style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  <label htmlFor="company_website">Website (Leave this empty)</label>
                  <input
                    type="text"
                    id="company_website"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <input type="hidden" name="partner_id" value={partnerId} />

                <div>
                  <p className="text-base font-bold tracking-[-0.01em] text-foreground">
                    {t.formTitle}
                  </p>
                  <p className="text-[0.8125rem] text-muted-foreground">{t.formSubtitle}</p>
                </div>

                <Separator />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer_name">
                    {t.fields.name} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customer_name"
                    name="customer_name"
                    placeholder={t.placeholders.name}
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="company_name">{t.fields.company}</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    placeholder={t.placeholders.company}
                    autoComplete="organization"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">
                    {t.fields.email} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t.placeholders.email}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">{t.fields.phone}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder={t.placeholders.phone}
                    autoComplete="tel"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cloud_usage_amount">{t.fields.usage}</Label>
                  <Select name="cloud_usage_amount" value={cloudSpend} onValueChange={setCloudSpend}>
                    <SelectTrigger id="cloud_usage_amount">
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

                <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full gap-2">
                  {loading ? (
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

        </div>
      </div>
    </section>
  );
}
