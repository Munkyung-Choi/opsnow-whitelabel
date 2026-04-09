'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ContactFormProps {
  partnerId: string;
  ctaText?: string;
}

const CLOUD_USAGE_OPTIONS = [
  { value: 'under_1m', label: '100만원 미만' },
  { value: '1m_5m', label: '100만원 ~ 500만원' },
  { value: '5m_20m', label: '500만원 ~ 2,000만원' },
  { value: '20m_plus', label: '2,000만원 이상' },
];

export default function ContactForm({ partnerId, ctaText = '문의 신청하기' }: ContactFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // WL-42: 서버 액션 연동 예정 — 현재는 UI 전용
  // TODO: replace with server action from WL-42
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 허니팟 체크 (client-side early exit — server-side 검증은 WL-42에서 필수 추가)
    const honeypot = (e.currentTarget.elements.namedItem('company_website') as HTMLInputElement)?.value;
    if (honeypot) return; // 봇 감지: 조용히 무시

    // WL-42 구현 전 임시 피드백
    alert('문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.');
    formRef.current?.reset();
  };

  return (
    <section id="contact" className="bg-secondary px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-secondary-foreground sm:text-4xl">
            지금 바로 문의하세요
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            전문 컨설턴트가 귀사에 맞는 클라우드 최적화 방안을 안내해 드립니다.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
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

          {/* 숨겨진 파트너 ID */}
          <input type="hidden" name="partner_id" value={partnerId} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="customer_name">
                담당자 이름 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer_name"
                name="customer_name"
                placeholder="홍길동"
                required
                autoComplete="name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">
                이메일 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@company.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="company_name">회사명</Label>
              <Input
                id="company_name"
                name="company_name"
                placeholder="(주)OpsNow"
                autoComplete="organization"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="010-1234-5678"
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cloud_usage_amount">월 클라우드 사용량</Label>
            <Select name="cloud_usage_amount">
              <SelectTrigger id="cloud_usage_amount">
                <SelectValue placeholder="선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                {CLOUD_USAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="message">문의 내용</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="궁금하신 점이나 요청 사항을 자유롭게 작성해주세요."
              rows={4}
            />
          </div>

          <Button type="submit" size="lg" className="mt-2 w-full font-semibold">
            {ctaText}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            제출 시{' '}
            <a href="terms" className="underline underline-offset-2 hover:text-foreground">
              이용약관
            </a>{' '}
            및{' '}
            <a href="privacy" className="underline underline-offset-2 hover:text-foreground">
              개인정보 처리방침
            </a>
            에 동의하는 것으로 간주합니다.
          </p>
        </form>
      </div>
    </section>
  );
}
