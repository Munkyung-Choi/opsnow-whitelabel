'use client';

import { useState } from 'react';
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

interface Props {
  locale: Locale;
  /** WL-42: Server Action 검증 실패 시 필드별 인라인 에러 */
  fieldErrors?: Record<string, string[]>;
}

/**
 * WL-42 / DEBT-002: ContactFormMain · ContactFormSimple 공통 5개 입력 필드.
 * honeypot 포함. 허니팟은 CSS로 숨겨 봇만 채우게 한다.
 */
export default function ContactFormFields({ locale, fieldErrors }: Props) {
  const t = getDictionary(locale).contactForm;
  const [cloudSpend, setCloudSpend] = useState('');

  return (
    <>
      {/* 허니팟 — 스팸봇 탐지용 (사용자에게 절대 노출 금지) */}
      <div
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
        aria-hidden="true"
        tabIndex={-1}
      >
        <label htmlFor="cff-website">Website (Leave this empty)</label>
        <input
          type="text"
          id="cff-website"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

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
          aria-describedby={fieldErrors?.customer_name ? 'err-name' : undefined}
        />
        {fieldErrors?.customer_name?.map((msg) => (
          <p key={msg} id="err-name" className="text-xs text-destructive">{msg}</p>
        ))}
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
          aria-describedby={fieldErrors?.email ? 'err-email' : undefined}
        />
        {fieldErrors?.email?.map((msg) => (
          <p key={msg} id="err-email" className="text-xs text-destructive">{msg}</p>
        ))}
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

      <Separator />
    </>
  );
}
